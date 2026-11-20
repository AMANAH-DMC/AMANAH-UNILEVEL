-- Admin monthly activity monitoring (read-only).
-- Mirrors the member-facing ACTIVE rule: at least one paid qualifying regular-product purchase
-- in the current Asia/Manila calendar month. Bundles are excluded via unilevel_eligible=false.

begin;

create or replace function public.get_admin_monthly_activity(
  p_search text default null,
  p_role text default null,
  p_activity_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  member_id uuid,
  member_number text,
  full_name text,
  role text,
  account_status text,
  activity_status text,
  qualifying_purchase_count integer,
  last_qualifying_purchase_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month_start timestamptz;
begin
  if not exists (
    select 1 from public.member_profiles mp
    where mp.id = auth.uid()
      and mp.role = 'admin'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_activity_status is not null and p_activity_status not in ('ACTIVE', 'INACTIVE') then
    raise exception 'Invalid activity status';
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';

  return query
  with activity as (
    select
      p.member_id,
      count(distinct p.id)::integer as purchase_count,
      max(p.created_at) as last_purchase_at
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
      and p.created_at >= v_month_start
      and pi.unilevel_eligible = true
    group by p.member_id
  ),
  rows as (
    select
      mp.id as member_id,
      mp.member_number::text as member_number,
      mp.full_name::text as full_name,
      mp.role::text as role,
      mp.account_status::text as account_status,
      case when coalesce(a.purchase_count, 0) > 0 then 'ACTIVE' else 'INACTIVE' end as activity_status,
      coalesce(a.purchase_count, 0)::integer as qualifying_purchase_count,
      a.last_purchase_at as last_qualifying_purchase_at
    from public.member_profiles mp
    left join activity a on a.member_id = mp.id
    where (
      nullif(trim(p_search), '') is null
      or mp.full_name ilike '%' || trim(p_search) || '%'
      or mp.member_number ilike '%' || trim(p_search) || '%'
    )
      and (p_role is null or mp.role::text = p_role)
      and (p_activity_status is null or
        (case when coalesce(a.purchase_count, 0) > 0 then 'ACTIVE' else 'INACTIVE' end) = p_activity_status)
  )
  select r.*, count(*) over() as total_count
  from rows r
  order by (r.activity_status = 'ACTIVE') asc, r.member_number asc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_admin_monthly_activity(text, text, text, integer, integer) from public, anon;
grant execute on function public.get_admin_monthly_activity(text, text, text, integer, integer) to authenticated;

commit;
