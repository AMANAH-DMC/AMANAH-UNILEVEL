-- Distributor-scoped commission history.
-- Returns only commission rows earned by the authenticated active Distributor.
-- No financial rows are modified.
begin;

create or replace function public.get_member_commission_history(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  purchaser_name text,
  purchase_reference text,
  product_name text,
  level_number integer,
  product_pv numeric,
  commission_rate numeric,
  pv_conversion_rate numeric,
  commission_amount numeric,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.member_profiles mp
    where mp.id = v_member_id
      and mp.role = 'distributor'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Active Distributor access required' using errcode = '42501';
  end if;

  return query
  select
    cl.id,
    purchaser.full_name::text,
    p.purchase_reference::text,
    coalesce(pr.product_name, 'Product')::text,
    cl.level_number,
    cl.product_pv,
    cl.commission_rate,
    cl.pv_conversion_rate,
    cl.commission_amount,
    cl.status::text,
    cl.created_at
  from public.commission_ledger cl
  join public.member_profiles purchaser on purchaser.id = cl.purchaser_id
  join public.purchase_items pi on pi.id = cl.purchase_item_id
  join public.purchases p on p.id = pi.purchase_id
  left join public.products pr on pr.id = pi.product_id
  where cl.earner_id = v_member_id
  order by cl.created_at desc, cl.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_member_commission_history(integer, integer) from public, anon;
grant execute on function public.get_member_commission_history(integer, integer) to authenticated;

commit;
