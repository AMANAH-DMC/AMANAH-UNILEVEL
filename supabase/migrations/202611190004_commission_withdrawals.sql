-- Commission withdrawal records: no platform-held money or wallet balance.
-- Available commission is approved Unilevel + approved positional commission,
-- less requests already pending, approved, or paid.

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_confirmed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'withdrawal_requests_payment_method_check'
      AND conrelid = 'public.withdrawal_requests'::regclass
  ) THEN
    ALTER TABLE public.withdrawal_requests
      ADD CONSTRAINT withdrawal_requests_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('gcash', 'cash'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'withdrawal_requests_paid_amount_check'
      AND conrelid = 'public.withdrawal_requests'::regclass
  ) THEN
    ALTER TABLE public.withdrawal_requests
      ADD CONSTRAINT withdrawal_requests_paid_amount_check
      CHECK (paid_amount IS NULL OR paid_amount > 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_commission_summary()
RETURNS TABLE (
  unilevel_approved numeric,
  positional_approved numeric,
  already_claimed numeric,
  available_commission numeric,
  withdrawal_threshold numeric,
  eligible_to_withdraw boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid := auth.uid();
  v_role text;
  v_unilevel numeric := 0;
  v_positional numeric := 0;
  v_claimed numeric := 0;
  v_available numeric := 0;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT mp.role::text
    INTO v_role
    FROM public.member_profiles mp
   WHERE mp.id = v_member_id
     AND mp.account_status = 'active';

  IF NOT FOUND OR v_role <> 'distributor' THEN
    RAISE EXCEPTION 'An active distributor account is required';
  END IF;

  SELECT COALESCE(sum(cl.commission_amount), 0)
    INTO v_unilevel
    FROM public.commission_ledger cl
   WHERE cl.earner_id = v_member_id
     AND cl.status = 'approved';

  SELECT COALESCE(sum(pcl.commission_amount), 0)
    INTO v_positional
    FROM public.positional_commission_ledger pcl
   WHERE pcl.earner_id = v_member_id
     AND pcl.status = 'approved';

  SELECT COALESCE(sum(wr.requested_amount), 0)
    INTO v_claimed
    FROM public.withdrawal_requests wr
   WHERE wr.member_id = v_member_id
     AND wr.status IN ('pending', 'approved', 'paid');

  v_available := GREATEST(v_unilevel + v_positional - v_claimed, 0);

  RETURN QUERY SELECT
    v_unilevel,
    v_positional,
    v_claimed,
    v_available,
    300::numeric,
    v_available >= 300;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_withdrawal_history()
RETURNS TABLE (
  id uuid,
  requested_amount numeric,
  status text,
  requested_at timestamptz,
  processed_at timestamptz,
  payment_method text,
  payment_reference text,
  payment_notes text,
  paid_amount numeric,
  paid_at timestamptz,
  receipt_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid := auth.uid();
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT wr.id, wr.requested_amount, wr.status, wr.requested_at,
         wr.processed_at, wr.payment_method, wr.payment_reference,
         wr.payment_notes, wr.paid_amount, wr.paid_at,
         wr.receipt_confirmed_at
    FROM public.withdrawal_requests wr
   WHERE wr.member_id = v_member_id
   ORDER BY wr.requested_at DESC
   LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_commission_withdrawal(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid := auth.uid();
  v_role text;
  v_unilevel numeric := 0;
  v_positional numeric := 0;
  v_claimed numeric := 0;
  v_available numeric := 0;
  v_request_id uuid;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Enter a valid withdrawal amount greater than zero with up to two decimal places';
  END IF;

  -- Serializes requests for the same member to prevent duplicate over-claims.
  SELECT mp.role::text
    INTO v_role
    FROM public.member_profiles mp
   WHERE mp.id = v_member_id
     AND mp.account_status = 'active'
   FOR UPDATE;

  IF NOT FOUND OR v_role <> 'distributor' THEN
    RAISE EXCEPTION 'An active distributor account is required';
  END IF;

  SELECT COALESCE(sum(cl.commission_amount), 0)
    INTO v_unilevel
    FROM public.commission_ledger cl
   WHERE cl.earner_id = v_member_id AND cl.status = 'approved';

  SELECT COALESCE(sum(pcl.commission_amount), 0)
    INTO v_positional
    FROM public.positional_commission_ledger pcl
   WHERE pcl.earner_id = v_member_id AND pcl.status = 'approved';

  SELECT COALESCE(sum(wr.requested_amount), 0)
    INTO v_claimed
    FROM public.withdrawal_requests wr
   WHERE wr.member_id = v_member_id
     AND wr.status IN ('pending', 'approved', 'paid');

  v_available := GREATEST(v_unilevel + v_positional - v_claimed, 0);

  IF v_available < 300 THEN
    RAISE EXCEPTION 'A minimum combined available commission of PHP 300 is required';
  END IF;
  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Requested amount exceeds available commission (PHP %)', to_char(v_available, 'FM999999990.00');
  END IF;

  INSERT INTO public.withdrawal_requests (member_id, requested_amount, status)
  VALUES (v_member_id, p_amount, 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_commission_receipt(p_withdrawal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.withdrawal_requests
     SET receipt_confirmed_at = now()
   WHERE id = p_withdrawal_id
     AND member_id = v_member_id
     AND status = 'paid'
     AND receipt_confirmed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_withdrawal_requests(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  member_number text,
  full_name text,
  mobile_number text,
  requested_amount numeric,
  status text,
  requested_at timestamptz,
  processed_at timestamptz,
  payment_method text,
  payment_reference text,
  payment_notes text,
  paid_amount numeric,
  paid_at timestamptz,
  receipt_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Active administrator access required';
  END IF;

  RETURN QUERY
  SELECT wr.id, wr.member_id, mp.member_number, mp.full_name,
         mp.mobile_number, wr.requested_amount, wr.status,
         wr.requested_at, wr.processed_at, wr.payment_method,
         wr.payment_reference, wr.payment_notes, wr.paid_amount,
         wr.paid_at, wr.receipt_confirmed_at
    FROM public.withdrawal_requests wr
    JOIN public.member_profiles mp ON mp.id = wr.member_id
   ORDER BY wr.requested_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_commission_withdrawal(
  p_withdrawal_id uuid,
  p_decision text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Active administrator access required';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  UPDATE public.withdrawal_requests
     SET status = p_decision,
         processed_at = now(),
         processed_by = auth.uid()
   WHERE id = p_withdrawal_id
     AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_commission_payment(
  p_withdrawal_id uuid,
  p_payment_method text,
  p_payment_reference text DEFAULT NULL,
  p_payment_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Active administrator access required';
  END IF;
  IF p_payment_method NOT IN ('gcash', 'cash') THEN
    RAISE EXCEPTION 'Payment method must be GCash or cash';
  END IF;
  IF p_payment_method = 'gcash' AND NULLIF(btrim(p_payment_reference), '') IS NULL THEN
    RAISE EXCEPTION 'Enter the GCash transaction reference';
  END IF;

  UPDATE public.withdrawal_requests
     SET status = 'paid',
         payment_method = p_payment_method,
         payment_reference = NULLIF(btrim(p_payment_reference), ''),
         payment_notes = NULLIF(btrim(p_payment_notes), ''),
         paid_amount = requested_amount,
         paid_at = now(),
         processed_at = now(),
         processed_by = auth.uid()
   WHERE id = p_withdrawal_id
     AND status = 'approved';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_commission_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_member_withdrawal_history() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_commission_withdrawal(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_commission_receipt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_withdrawal_requests(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_commission_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_commission_payment(uuid, text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_member_commission_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_withdrawal_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_commission_withdrawal(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_commission_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_withdrawal_requests(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_commission_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_commission_payment(uuid, text, text, text) TO authenticated;
