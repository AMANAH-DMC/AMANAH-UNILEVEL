-- Admin-only reporting for existing Front Desk POS orders.
-- This migration does not alter or delete any existing POS records.
begin;

create or replace function public.admin_get_front_desk_sales_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table(order_count bigint, recorded_sales numeric)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;

  return query
  select count(*)::bigint, coalesce(sum(o.total_amount), 0)::numeric
  from public.front_desk_pos_orders o
  where (p_from is null or o.created_at >= p_from)
    and (p_to is null or o.created_at < p_to);
end;
$function$;

create or replace function public.admin_list_front_desk_pos_orders(
  p_from timestamptz,
  p_to timestamptz,
  p_search text,
  p_limit integer,
  p_offset integer
)
returns table(
  id uuid,
  order_number text,
  customer_type text,
  customer_name text,
  total_amount numeric,
  created_at timestamptz,
  items jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100
     or p_offset is null or p_offset < 0 then
    raise exception 'Invalid pagination values' using errcode = '22023';
  end if;

  return query
  with filtered as (
    select o.*
    from public.front_desk_pos_orders o
    where (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
      and (
        nullif(trim(p_search), '') is null
        or o.order_number ilike '%' || trim(p_search) || '%'
        or coalesce(o.customer_name, '') ilike '%' || trim(p_search) || '%'
        or o.customer_type ilike '%' || trim(p_search) || '%'
        or exists (
          select 1
          from public.front_desk_pos_order_items si
          where si.order_id = o.id
            and si.product_name ilike '%' || trim(p_search) || '%'
        )
      )
  )
  select
    f.id,
    f.order_number,
    f.customer_type,
    f.customer_name,
    f.total_amount,
    f.created_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_code', i.product_code,
          'product_name', i.product_name,
          'quantity', i.quantity,
          'unit_price', i.unit_price,
          'line_total', i.line_total
        ) order by i.product_name
      )
      from public.front_desk_pos_order_items i
      where i.order_id = f.id
    ), '[]'::jsonb),
    count(*) over ()::bigint
  from filtered f
  order by f.created_at desc, f.id desc
  limit p_limit
  offset p_offset;
end;
$function$;

revoke all on function public.admin_get_front_desk_sales_summary(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_list_front_desk_pos_orders(timestamptz, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.admin_get_front_desk_sales_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_list_front_desk_pos_orders(timestamptz, timestamptz, text, integer, integer) to authenticated;

commit;
