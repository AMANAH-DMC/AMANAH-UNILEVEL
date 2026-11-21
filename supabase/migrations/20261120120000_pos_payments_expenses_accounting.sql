-- POS payment capture and front-desk expense approval workflow.
-- Sales are recognized only after an order is marked paid.
-- Expenses affect official operating totals only after admin approval.

ALTER TABLE public.front_desk_pos_orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.front_desk_pos_orders'::regclass
      AND conname = 'front_desk_pos_orders_payment_status_check'
  ) THEN
    ALTER TABLE public.front_desk_pos_orders
      ADD CONSTRAINT front_desk_pos_orders_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'void'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.front_desk_pos_orders'::regclass
      AND conname = 'front_desk_pos_orders_payment_method_check'
  ) THEN
    ALTER TABLE public.front_desk_pos_orders
      ADD CONSTRAINT front_desk_pos_orders_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'gcash', 'bank_transfer', 'card', 'other'));
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.front_desk_pos_orders'::regclass
      AND conname = 'front_desk_pos_orders_paid_by_fkey'
  ) THEN
    ALTER TABLE public.front_desk_pos_orders
      ADD CONSTRAINT front_desk_pos_orders_paid_by_fkey
      FOREIGN KEY (paid_by) REFERENCES public.member_profiles(id);
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS front_desk_pos_orders_paid_at_idx
  ON public.front_desk_pos_orders (paid_at)
  WHERE payment_status = 'paid';

CREATE TABLE IF NOT EXISTS public.front_desk_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES public.member_profiles(id),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 3 AND 500),
  category text NOT NULL CHECK (category IN ('supplies', 'transport', 'utilities', 'rent', 'maintenance', 'staff', 'other')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  receipt_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.member_profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT front_desk_expenses_review_state_check CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS front_desk_expenses_status_created_idx
  ON public.front_desk_expenses (status, created_at DESC);

ALTER TABLE public.front_desk_expenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.front_desk_expenses FROM anon, authenticated;
REVOKE ALL ON public.front_desk_pos_orders FROM anon, authenticated;
REVOKE ALL ON public.front_desk_pos_order_items FROM anon, authenticated;
REVOKE ALL ON public.front_desk_pos_prices FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.front_desk_mark_pos_order_paid(
  p_order_id uuid,
  p_payment_method text,
  p_payment_reference text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  IF p_payment_method NOT IN ('cash', 'gcash', 'bank_transfer', 'card', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method' USING errcode = '22023';
  END IF;

  SELECT mp.role::text INTO v_role
  FROM public.member_profiles mp
  WHERE mp.id = v_user AND mp.account_status = 'active';

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Active account required' USING errcode = '42501';
  END IF;

  IF NOT public.amanah_is_active_admin()
     AND v_role <> 'front_desk' THEN
    RAISE EXCEPTION 'Front Desk or administrator access required' USING errcode = '42501';
  END IF;

  SELECT o.payment_status INTO v_status
  FROM public.front_desk_pos_orders o
  WHERE o.id = p_order_id
    AND (public.amanah_is_active_admin() OR o.created_by = v_user)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or access denied' USING errcode = '42501';
  END IF;

  IF v_status = 'paid' THEN
    RETURN false;
  END IF;

  IF v_status <> 'unpaid' THEN
    RAISE EXCEPTION 'Only unpaid orders can be paid' USING errcode = '22023';
  END IF;

  UPDATE public.front_desk_pos_orders
  SET payment_status = 'paid',
      payment_method = p_payment_method,
      payment_reference = NULLIF(trim(p_payment_reference), ''),
      paid_at = now(),
      paid_by = v_user
  WHERE id = p_order_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.front_desk_submit_expense(
  p_description text,
  p_category text,
  p_amount numeric,
  p_receipt_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_expense_id uuid;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.member_profiles mp
    WHERE mp.id = v_user
      AND mp.role::text = 'front_desk'
      AND mp.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active Front Desk access required' USING errcode = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'Expense amount is outside the allowed range' USING errcode = '22023';
  END IF;

  INSERT INTO public.front_desk_expenses (
    submitted_by, description, category, amount, receipt_reference
  ) VALUES (
    v_user, trim(p_description), p_category, p_amount,
    NULLIF(trim(p_receipt_reference), '')
  )
  RETURNING id INTO v_expense_id;

  RETURN v_expense_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_front_desk_expense(
  p_expense_id uuid,
  p_decision text,
  p_review_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING errcode = '42501';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected' USING errcode = '22023';
  END IF;

  UPDATE public.front_desk_expenses
  SET status = p_decision,
      reviewed_by = v_user,
      reviewed_at = now(),
      review_note = NULLIF(trim(p_review_note), '')
  WHERE id = p_expense_id
    AND status = 'pending';

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_sales_accounting_summary(
  p_from timestamptz DEFAULT date_trunc('day', now()),
  p_to timestamptz DEFAULT now()
)
RETURNS TABLE (
  paid_order_count bigint,
  gross_sales numeric,
  pending_expenses numeric,
  approved_expenses numeric,
  rejected_expenses numeric,
  net_operating_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING errcode = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'Invalid reporting period' USING errcode = '22023';
  END IF;

  RETURN QUERY
  WITH sales AS (
    SELECT count(*)::bigint AS order_count,
           coalesce(sum(o.total_amount), 0)::numeric AS total
    FROM public.front_desk_pos_orders o
    WHERE o.payment_status = 'paid'
      AND o.paid_at >= p_from AND o.paid_at < p_to
  ), expenses AS (
    SELECT
      coalesce(sum(e.amount) FILTER (WHERE e.status = 'pending'), 0)::numeric AS pending,
      coalesce(sum(e.amount) FILTER (WHERE e.status = 'approved'), 0)::numeric AS approved,
      coalesce(sum(e.amount) FILTER (WHERE e.status = 'rejected'), 0)::numeric AS rejected
    FROM public.front_desk_expenses e
    WHERE e.created_at >= p_from AND e.created_at < p_to
  )
  SELECT sales.order_count, sales.total, expenses.pending, expenses.approved,
         expenses.rejected, sales.total - expenses.approved
  FROM sales CROSS JOIN expenses;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_front_desk_expenses(
  p_status text DEFAULT 'pending',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  description text,
  category text,
  amount numeric,
  receipt_reference text,
  status text,
  submitted_by uuid,
  submitted_by_name text,
  created_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING errcode = '42501';
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'rejected', 'all') THEN
    RAISE EXCEPTION 'Invalid expense status filter' USING errcode = '22023';
  END IF;

  RETURN QUERY
  SELECT e.id, e.description, e.category, e.amount, e.receipt_reference,
         e.status, e.submitted_by, mp.full_name, e.created_at,
         e.reviewed_by, e.reviewed_at, e.review_note
  FROM public.front_desk_expenses e
  JOIN public.member_profiles mp ON mp.id = e.submitted_by
  WHERE p_status = 'all' OR e.status = p_status
  ORDER BY e.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500));
END;
$function$;

REVOKE ALL ON FUNCTION public.front_desk_mark_pos_order_paid(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.front_desk_submit_expense(text, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_front_desk_expense(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_sales_accounting_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_front_desk_expenses(text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.front_desk_mark_pos_order_paid(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.front_desk_submit_expense(text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_front_desk_expense(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_accounting_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_front_desk_expenses(text, integer) TO authenticated;
