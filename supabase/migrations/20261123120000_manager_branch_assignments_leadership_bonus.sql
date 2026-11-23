-- Manager branch assignments and separate 9% Leadership Bonus reporting.
-- Additive: existing member profiles, purchases, commissions, and Unilevel rules are not changed.
begin;

create table if not exists public.amanah_manager_branch_assignments (
  branch_id uuid primary key references public.amanah_branches(id) on delete restrict,
  manager_member_id uuid not null references public.member_profiles(id) on delete restrict,
  assigned_by uuid not null references public.member_profiles(id) on delete restrict,
  assigned_at timestamptz not null default now()
);
create index if not exists amanah_manager_branch_assignments_manager_idx
  on public.amanah_manager_branch_assignments(manager_member_id);
alter table public.amanah_manager_branch_assignments enable row level security;
revoke all on public.amanah_manager_branch_assignments from public, anon, authenticated;

create or replace function public.admin_list_managers()
returns table(member_id uuid, member_number text, full_name text, account_status text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  return query
  select mp.id, mp.member_number::text, mp.full_name::text, mp.account_status::text
  from public.member_profiles mp
  where mp.role = 'manager'::public.amanah_role
  order by mp.full_name;
end;
$$;

create or replace function public.admin_list_branch_manager_assignments()
returns table(branch_id uuid, branch_name text, branch_status text, manager_member_id uuid, manager_name text, manager_member_number text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  return query
  select b.id, b.branch_name::text, b.status::text, a.manager_member_id,
         mp.full_name::text, mp.member_number::text
  from public.amanah_branches b
  left join public.amanah_manager_branch_assignments a on a.branch_id=b.id
  left join public.member_profiles mp on mp.id=a.manager_member_id
  order by b.branch_name,b.branch_code;
end;
$$;

create or replace function public.admin_assign_manager_to_branch(p_branch_id uuid, p_manager_member_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.amanah_branches b where b.id=p_branch_id and b.status='active') then
    raise exception 'Active branch not found' using errcode = '22023';
  end if;
  if not exists(select 1 from public.member_profiles mp where mp.id=p_manager_member_id
    and mp.role='manager'::public.amanah_role and mp.account_status='active') then
    raise exception 'Active Manager account required' using errcode = '22023';
  end if;
  insert into public.amanah_manager_branch_assignments(branch_id,manager_member_id,assigned_by)
  values(p_branch_id,p_manager_member_id,v_actor)
  on conflict(branch_id) do update set manager_member_id=excluded.manager_member_id,
    assigned_by=excluded.assigned_by,assigned_at=now();
  insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
  values(v_actor,'manager_branch_assigned','branch',p_branch_id,
    jsonb_build_object('manager_member_id',p_manager_member_id));
  return true;
end;
$$;

create or replace function public.admin_assign_manager_to_all_branches(p_manager_member_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_count integer;
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.member_profiles mp where mp.id=p_manager_member_id
    and mp.role='manager'::public.amanah_role and mp.account_status='active') then
    raise exception 'Active Manager account required' using errcode = '22023';
  end if;
  insert into public.amanah_manager_branch_assignments(branch_id,manager_member_id,assigned_by)
  select b.id,p_manager_member_id,v_actor from public.amanah_branches b where b.status='active'
  on conflict(branch_id) do update set manager_member_id=excluded.manager_member_id,
    assigned_by=excluded.assigned_by,assigned_at=now();
  get diagnostics v_count = row_count;
  insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
  values(v_actor,'manager_assigned_all_branches','manager',p_manager_member_id,
    jsonb_build_object('branches_affected',v_count));
  return v_count;
end;
$$;

create or replace function public.get_manager_leadership_bonus()
returns table(month_start date, branch_id uuid, branch_name text, operator_count bigint,
  paid_purchase_count bigint, paid_purchase_amount numeric, leadership_bonus numeric)
language plpgsql stable security definer set search_path = ''
as $$
declare v_manager uuid := auth.uid();
begin
  if v_manager is null or not exists(
    select 1 from public.member_profiles mp where mp.id=v_manager
      and mp.role='manager'::public.amanah_role and mp.account_status='active'
  ) then
    raise exception 'Active Manager access required' using errcode = '42501';
  end if;
  return query
  with months as (
    select (date_trunc('month',now() at time zone 'Asia/Manila') - (interval '1 month' * gs))::date as month_start
    from generate_series(0,11) gs
  ), assigned as (
    select mba.branch_id,b.branch_name,boa.operator_member_id
    from public.amanah_manager_branch_assignments mba
    join public.amanah_branches b on b.id=mba.branch_id and b.status='active'
    left join public.amanah_branch_operator_assignments boa on boa.branch_id=b.id
    where mba.manager_member_id=v_manager
  ), purchases_by_month as (
    select a.branch_id,date_trunc('month',p.created_at at time zone 'Asia/Manila')::date as month_start,
      count(distinct p.id)::bigint as purchase_count,
      coalesce(sum(p.total_amount),0)::numeric(14,2) as purchase_amount
    from assigned a
    join public.purchases p on p.member_id=a.operator_member_id and p.purchase_status='paid'
    where p.created_at >= (select min(month_start) from months)::timestamp at time zone 'Asia/Manila'
      and p.created_at < ((select max(month_start) from months)+interval '1 month')::timestamp at time zone 'Asia/Manila'
    group by a.branch_id,date_trunc('month',p.created_at at time zone 'Asia/Manila')::date
  )
  select m.month_start,a.branch_id,a.branch_name,
    case when a.operator_member_id is null then 0 else 1 end::bigint,
    coalesce(p.purchase_count,0)::bigint,coalesce(p.purchase_amount,0)::numeric(14,2),
    round(coalesce(p.purchase_amount,0)*0.09,2)::numeric(14,2)
  from months m cross join assigned a
  left join purchases_by_month p on p.branch_id=a.branch_id and p.month_start=m.month_start
  order by m.month_start desc,a.branch_name;
end;
$$;

revoke all on function public.admin_list_managers() from public, anon;
revoke all on function public.admin_list_branch_manager_assignments() from public, anon;
revoke all on function public.admin_assign_manager_to_branch(uuid,uuid) from public, anon;
revoke all on function public.admin_assign_manager_to_all_branches(uuid) from public, anon;
revoke all on function public.get_manager_leadership_bonus() from public, anon;
grant execute on function public.admin_list_managers() to authenticated;
grant execute on function public.admin_list_branch_manager_assignments() to authenticated;
grant execute on function public.admin_assign_manager_to_branch(uuid,uuid) to authenticated;
grant execute on function public.admin_assign_manager_to_all_branches(uuid) to authenticated;
grant execute on function public.get_manager_leadership_bonus() to authenticated;

commit;
