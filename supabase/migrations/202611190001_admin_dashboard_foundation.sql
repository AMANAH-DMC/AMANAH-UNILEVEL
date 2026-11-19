-- AMANAH Admin Dashboard foundation
-- Read-only Admin RPCs for the overview and member directory.
-- No existing rows or relationships are modified by this migration.

begin;

create or replace function public.get_admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.amanah_is_active_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_members', count(*),
    'active_members', count(*) filter (where account_status = 'active'),
    'inactive_members', count(*) filter (where account_status is distinct from 'active'),
    'distributors', count(*) filter (where role::text = 'distributor'),
    'mobile_stockists', count(*) filter (where role::text = 'mobile_stockist'),
    'branch_operators', count(*) filter (where role::text = 'branch_operator'),
    'managers', count(*) filter (where role::text = 'manager'),
    'admins', count(*) filter (where role::text = 'admin')
  )
  into result
  from public.member_profiles;

  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.get_admin_members(
  p_search text default null,
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

  return query
  select
    mp.id,
    mp.member_number::text,
    mp.full_name::text,
    mp.role::text,
    mp.account_status::text
  from public.member_profiles as mp
  where p_search is null
     or mp.full_name ilike '%' || p_search || '%'
     or mp.member_number ilike '%' || p_search || '%'
  order by mp.member_number
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_admin_dashboard_summary() from public, anon;
revoke all on function public.get_admin_members(text, integer, integer) from public, anon;
grant execute on function public.get_admin_dashboard_summary() to authenticated;
grant execute on function public.get_admin_members(text, integer, integer) to authenticated;

commit;
