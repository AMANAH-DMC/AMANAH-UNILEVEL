-- Front Desk POS reporting for active Admin users only.
-- Read-only reporting: this migration does not modify existing orders or order items.
-- It does not grant direct table access or add RLS policies.

CREATE OR REPLACE FUNCTION public.admin_get_front_desk_sales_summary(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  order_count bigint,
  recorded_sales numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(o.total_amount), 0)::numeric
  FROM public.front_desk_pos_orders AS o
  WHERE o.created_at >= COALESCE(p_from, '-infinity'::timestamptz)
    AND o.created_at < COALESCE(p_to, 'infinity'::timestamptz);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_front_desk_pos_orders(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  created_at timestamptz,
  customer_type text,
  customer_name text,
  total_amount numeric,
  items jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.amanah_is_active_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.created_at,
    o.customer_type,
    o.customer_name,
    o.total_amount,
    COALESCE(item_data.items, '[]'::jsonb),
    COUNT(*) OVER ()::bigint
  FROM public.front_desk_pos_orders AS o
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_code', i.product_code,
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price', i.unit_price,
        'line_total', i.line_total
      )
      ORDER BY i.product_name, i.product_code
    ) AS items
    FROM public.front_desk_pos_order_items AS i
    WHERE i.order_id = o.id
  ) AS item_data ON TRUE
  WHERE o.created_at >= COALESCE(p_from, '-infinity'::timestamptz)
    AND o.created_at < COALESCE(p_to, 'infinity'::timestamptz)
    AND (
      NULLIF(BTRIM(p_search), '') IS NULL
      OR o.order_number ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(o.customer_name, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.front_desk_pos_order_items AS si
        WHERE si.order_id = o.id
          AND (
            si.product_name ILIKE '%' || BTRIM(p_search) || '%'
            OR si.product_code ILIKE '%' || BTRIM(p_search) || '%'
          )
      )
    )
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_front_desk_sales_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_front_desk_pos_orders(timestamptz, timestamptz, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_front_desk_sales_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_front_desk_pos_orders(timestamptz, timestamptz, text, integer, integer) TO authenticated;
