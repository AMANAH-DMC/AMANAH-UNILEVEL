-- AMANAH Admin Member Management
-- Adds server-side role/status filters to the existing read-only member directory.
-- Does not modify member records or account statuses.

begin;

create or replace function public.get_admin_members_filtered(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  member_number text,
  full_name text,
  role text,
  account_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.amanah_is_active_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_role is not null and p_role not in (
    'distributor', 'mobile_stockist', 'branch_operator', 'manager', 'admin'
  ) then
    raise exception 'Invalid member role filter' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in ('active', 'inactive') then
    raise exception 'Invalid account status filter' using errcode = '22023';
  end if;

  return query
  select
    mp.id,
    mp.member_number::text,
    mp.full_name::text,
    mp.role::text,
    mp.account_status::text
  from public.member_profiles as mp
  where (
      nullif(trim(p_search), '') is null
      or mp.full_name ilike '%' || trim(p_search) || '%'
      or mp.member_number ilike '%' || trim(p_search) || '%'
    )
    and (p_role is null or mp.role::text = p_role)
    and (
      p_status is null
      or (p_status = 'active' and mp.account_status::text = 'active')
      or (p_status = 'inactive' and mp.account_status::text is distinct from 'active')
    )
  order by mp.member_number
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_admin_members_filtered(text, text, text, integer, integer) from public, anon;
grant execute on function public.get_admin_members_filtered(text, text, text, integer, integer) to authenticated;

commit;
