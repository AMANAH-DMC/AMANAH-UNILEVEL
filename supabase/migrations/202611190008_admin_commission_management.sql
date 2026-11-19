-- Admin commission management: secure read RPCs and audited pending-to-approved review.
-- Existing commission rows and configured rules are not recalculated or rewritten.

CREATE TABLE IF NOT EXISTS public.commission_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_ledger_id uuid NOT NULL REFERENCES public.commission_ledger(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  old_status text NOT NULL,
  new_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commission_admin_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_commission_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.member_profiles mp
    WHERE mp.id = auth.uid()
      AND mp.role = 'admin'::public.amanah_role
      AND mp.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT jsonb_build_object(
    'total_amount', COALESCE(SUM(cl.commission_amount), 0),
    'pending_amount', COALESCE(SUM(cl.commission_amount) FILTER (WHERE cl.status = 'pending'), 0),
    'approved_amount', COALESCE(SUM(cl.commission_amount) FILTER (WHERE cl.status = 'approved'), 0),
    'paid_amount', COALESCE(SUM(cl.commission_amount) FILTER (WHERE cl.status = 'paid'), 0),
    'reversed_amount', COALESCE(SUM(cl.commission_amount) FILTER (WHERE cl.status = 'reversed'), 0),
    'pending_count', COUNT(*) FILTER (WHERE cl.status = 'pending'),
    'approved_count', COUNT(*) FILTER (WHERE cl.status = 'approved'),
    'paid_count', COUNT(*) FILTER (WHERE cl.status = 'paid'),
    'level_totals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'level_number', x.level_number,
        'total_amount', x.total_amount,
        'entry_count', x.entry_count
      ) ORDER BY x.level_number)
      FROM (
        SELECT level_number, SUM(commission_amount) AS total_amount, COUNT(*) AS entry_count
        FROM public.commission_ledger
        GROUP BY level_number
      ) x
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.commission_ledger cl;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_commission_ledger(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_level integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  earner_id uuid,
  earner_name text,
  earner_member_number text,
  purchaser_id uuid,
  purchaser_name text,
  purchase_reference text,
  purchase_item_id uuid,
  level_number integer,
  product_pv numeric,
  commission_rate numeric,
  pv_conversion_rate numeric,
  commission_amount numeric,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.member_profiles mp
    WHERE mp.id = auth.uid()
      AND mp.role = 'admin'::public.amanah_role
      AND mp.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'paid', 'reversed') THEN
    RAISE EXCEPTION 'Invalid commission status';
  END IF;
  IF p_level IS NOT NULL AND (p_level < 1 OR p_level > 10) THEN
    RAISE EXCEPTION 'Invalid Unilevel level';
  END IF;

  RETURN QUERY
  SELECT
    cl.id,
    cl.earner_id,
    earner.full_name,
    earner.member_number,
    cl.purchaser_id,
    purchaser.full_name,
    p.purchase_reference,
    cl.purchase_item_id,
    cl.level_number,
    cl.product_pv,
    cl.commission_rate,
    cl.pv_conversion_rate,
    cl.commission_amount,
    cl.status,
    cl.created_at
  FROM public.commission_ledger cl
  JOIN public.member_profiles earner ON earner.id = cl.earner_id
  JOIN public.member_profiles purchaser ON purchaser.id = cl.purchaser_id
  JOIN public.purchase_items pi ON pi.id = cl.purchase_item_id
  JOIN public.purchases p ON p.id = pi.purchase_id
  WHERE (p_status IS NULL OR cl.status = p_status)
    AND (p_level IS NULL OR cl.level_number = p_level)
    AND (
      NULLIF(trim(p_search), '') IS NULL
      OR earner.full_name ILIKE '%' || trim(p_search) || '%'
      OR earner.member_number ILIKE '%' || trim(p_search) || '%'
      OR purchaser.full_name ILIKE '%' || trim(p_search) || '%'
      OR p.purchase_reference ILIKE '%' || trim(p_search) || '%'
    )
  ORDER BY cl.created_at DESC, cl.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_commission(p_commission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.member_profiles mp
    WHERE mp.id = auth.uid()
      AND mp.role = 'admin'::public.amanah_role
      AND mp.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT cl.status INTO v_old_status
  FROM public.commission_ledger cl
  WHERE cl.id = p_commission_id
  FOR UPDATE;

  IF NOT FOUND OR v_old_status <> 'pending' THEN
    RETURN false;
  END IF;

  UPDATE public.commission_ledger
  SET status = 'approved'
  WHERE id = p_commission_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.commission_admin_audit (
    commission_ledger_id, actor_id, old_status, new_status
  ) VALUES (
    p_commission_id, auth.uid(), v_old_status, 'approved'
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_commission_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_commission_ledger(text, text, integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_commission_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_commission_ledger(text, text, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_commission(uuid) TO authenticated;
