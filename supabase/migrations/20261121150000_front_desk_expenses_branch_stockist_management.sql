-- Additive Front Desk expenses and Admin branch/mobile-stockist management.
-- Existing member, POS, commission, purchase, and financial records are not modified.
begin;

create table if not exists public.front_desk_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (category in ('transport','supplies','utilities','meals','maintenance','communication','other')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (length(trim(description)) between 2 and 500),
  created_by uuid not null references public.member_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists front_desk_expenses_created_by_date_idx
  on public.front_desk_expenses(created_by, expense_date desc, created_at desc);
create index if not exists front_desk_expenses_date_idx
  on public.front_desk_expenses(expense_date desc);

create table if not exists public.amanah_branches (
  id uuid primary key default gen_random_uuid(),
  branch_code text not null unique check (length(trim(branch_code)) between 2 and 30),
  branch_name text not null check (length(trim(branch_name)) between 2 and 120),
  address text not null default '',
  contact_number text not null default '',
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null references public.member_profiles(id) on delete restrict,
  updated_by uuid not null references public.member_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.amanah_branch_operator_assignments (
  operator_member_id uuid primary key references public.member_profiles(id) on delete restrict,
  branch_id uuid not null references public.amanah_branches(id) on delete restrict,
  assigned_by uuid not null references public.member_profiles(id) on delete restrict,
  assigned_at timestamptz not null default now()
);
create index if not exists amanah_branch_operator_assignments_branch_idx
  on public.amanah_branch_operator_assignments(branch_id);

create table if not exists public.amanah_mobile_stockist_assignments (
  stockist_member_id uuid primary key references public.member_profiles(id) on delete restrict,
  branch_id uuid references public.amanah_branches(id) on delete restrict,
  service_area text not null default '',
  notes text not null default '',
  status text not null default 'active' check (status in ('active','inactive')),
  assigned_by uuid not null references public.member_profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amanah_mobile_stockist_assignments_branch_idx
  on public.amanah_mobile_stockist_assignments(branch_id);

create table if not exists public.amanah_operations_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.member_profiles(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists amanah_operations_audit_created_at_idx
  on public.amanah_operations_audit(created_at desc);

alter table public.front_desk_expenses enable row level security;
alter table public.amanah_branches enable row level security;
alter table public.amanah_branch_operator_assignments enable row level security;
alter table public.amanah_mobile_stockist_assignments enable row level security;
alter table public.amanah_operations_audit enable row level security;

revoke all on public.front_desk_expenses from public, anon, authenticated;
revoke all on public.amanah_branches from public, anon, authenticated;
revoke all on public.amanah_branch_operator_assignments from public, anon, authenticated;
revoke all on public.amanah_mobile_stockist_assignments from public, anon, authenticated;
revoke all on public.amanah_operations_audit from public, anon, authenticated;

create or replace function public.front_desk_create_expense(
  p_expense_date date,
  p_category text,
  p_amount numeric,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.member_profiles mp
    where mp.id = v_actor and mp.role = 'front_desk'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Active Front Desk access required' using errcode = '42501';
  end if;
  if p_expense_date is null
     or p_category not in ('transport','supplies','utilities','meals','maintenance','communication','other')
     or p_amount is null or p_amount <= 0 or p_amount > 100000000
     or p_description is null or length(trim(p_description)) < 2
     or length(trim(p_description)) > 500 then
    raise exception 'Invalid expense details' using errcode = '22023';
  end if;

  insert into public.front_desk_expenses(expense_date, category, amount, description, created_by)
  values (p_expense_date, p_category, round(p_amount, 2), trim(p_description), v_actor)
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.front_desk_list_expenses(
  p_limit integer,
  p_offset integer
)
returns table(
  id uuid, expense_date date, category text, amount numeric,
  description text, created_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.member_profiles mp
    where mp.id = auth.uid() and mp.role = 'front_desk'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Active Front Desk access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid pagination values' using errcode = '22023';
  end if;
  return query
  select e.id, e.expense_date, e.category, e.amount, e.description, e.created_at,
    count(*) over ()::bigint
  from public.front_desk_expenses e
  where e.created_by = auth.uid()
  order by e.expense_date desc, e.created_at desc
  limit p_limit offset p_offset;
end;
$function$;

create or replace function public.front_desk_expense_summary()
returns table(expense_count bigint, expense_total numeric)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.member_profiles mp
    where mp.id = auth.uid() and mp.role = 'front_desk'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Active Front Desk access required' using errcode = '42501';
  end if;
  return query
  select count(*)::bigint, coalesce(sum(e.amount),0)::numeric
  from public.front_desk_expenses e where e.created_by = auth.uid();
end;
$function$;

create or replace function public.admin_list_front_desk_expenses(
  p_from date, p_to date, p_search text, p_limit integer, p_offset integer
)
returns table(
  id uuid, expense_date date, category text, amount numeric, description text,
  created_at timestamptz, created_by_name text, created_by_member_number text,
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
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid pagination values' using errcode = '22023';
  end if;
  return query
  select e.id, e.expense_date, e.category, e.amount, e.description, e.created_at,
    mp.full_name, mp.member_number, count(*) over ()::bigint
  from public.front_desk_expenses e
  join public.member_profiles mp on mp.id = e.created_by
  where (p_from is null or e.expense_date >= p_from)
    and (p_to is null or e.expense_date <= p_to)
    and (nullif(trim(p_search),'') is null
      or e.description ilike '%' || trim(p_search) || '%'
      or e.category ilike '%' || trim(p_search) || '%'
      or mp.full_name ilike '%' || trim(p_search) || '%'
      or coalesce(mp.member_number,'') ilike '%' || trim(p_search) || '%')
  order by e.expense_date desc, e.created_at desc
  limit p_limit offset p_offset;
end;
$function$;

create or replace function public.admin_list_branches()
returns table(
  id uuid, branch_code text, branch_name text, address text, contact_number text,
  status text, created_at timestamptz, operator_member_id uuid,
  operator_name text, operator_member_number text
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
  return query
  select b.id, b.branch_code, b.branch_name, b.address, b.contact_number, b.status,
    b.created_at, a.operator_member_id, mp.full_name, mp.member_number
  from public.amanah_branches b
  left join public.amanah_branch_operator_assignments a on a.branch_id = b.id
  left join public.member_profiles mp on mp.id = a.operator_member_id
  order by b.branch_name, b.branch_code;
end;
$function$;

create or replace function public.admin_list_branch_operators()
returns table(
  member_id uuid, member_number text, full_name text, account_status text,
  branch_id uuid, branch_name text
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
  return query
  select mp.id, mp.member_number, mp.full_name, mp.account_status, a.branch_id, b.branch_name
  from public.member_profiles mp
  left join public.amanah_branch_operator_assignments a on a.operator_member_id = mp.id
  left join public.amanah_branches b on b.id = a.branch_id
  where mp.role = 'branch_operator'::public.amanah_role
  order by mp.full_name;
end;
$function$;

create or replace function public.admin_list_mobile_stockists()
returns table(
  member_id uuid, member_number text, full_name text, account_status text,
  assignment_status text, branch_id uuid, branch_name text, service_area text, notes text
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
  return query
  select mp.id, mp.member_number, mp.full_name, mp.account_status,
    coalesce(a.status,'unassigned'), a.branch_id, b.branch_name,
    coalesce(a.service_area,''), coalesce(a.notes,'')
  from public.member_profiles mp
  left join public.amanah_mobile_stockist_assignments a on a.stockist_member_id = mp.id
  left join public.amanah_branches b on b.id = a.branch_id
  where mp.role = 'mobile_stockist'::public.amanah_role
  order by mp.full_name;
end;
$function$;

create or replace function public.admin_save_branch(
  p_branch_id uuid, p_branch_code text, p_branch_name text,
  p_address text, p_contact_number text, p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if p_branch_code is null or length(trim(p_branch_code)) not between 2 and 30
    or p_branch_name is null or length(trim(p_branch_name)) not between 2 and 120
    or coalesce(p_status,'active') not in ('active','inactive') then
    raise exception 'Invalid branch details' using errcode = '22023';
  end if;

  if p_branch_id is null then
    insert into public.amanah_branches(branch_code,branch_name,address,contact_number,status,created_by,updated_by)
    values(upper(trim(p_branch_code)),trim(p_branch_name),coalesce(trim(p_address),''),coalesce(trim(p_contact_number),''),coalesce(p_status,'active'),v_actor,v_actor)
    returning id into v_id;
    insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
    values(v_actor,'branch_created','branch',v_id,jsonb_build_object('branch_code',upper(trim(p_branch_code)),'branch_name',trim(p_branch_name)));
  else
    update public.amanah_branches
    set branch_code=upper(trim(p_branch_code)), branch_name=trim(p_branch_name),
      address=coalesce(trim(p_address),''), contact_number=coalesce(trim(p_contact_number),''),
      status=coalesce(p_status,'active'), updated_by=v_actor, updated_at=now()
    where id=p_branch_id returning id into v_id;
    if v_id is null then raise exception 'Branch not found' using errcode = 'P0002'; end if;
    insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
    values(v_actor,'branch_updated','branch',v_id,jsonb_build_object('branch_code',upper(trim(p_branch_code)),'branch_name',trim(p_branch_name),'status',coalesce(p_status,'active')));
  end if;
  return v_id;
end;
$function$;

create or replace function public.admin_assign_branch_operator(p_branch_id uuid, p_operator_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.amanah_branches b where b.id=p_branch_id and b.status='active') then
    raise exception 'Active branch not found' using errcode = '22023';
  end if;
  if not exists(select 1 from public.member_profiles mp where mp.id=p_operator_member_id
    and mp.role='branch_operator'::public.amanah_role and mp.account_status='active') then
    raise exception 'Active Branch Operator account required' using errcode = '22023';
  end if;
  insert into public.amanah_branch_operator_assignments(operator_member_id,branch_id,assigned_by)
  values(p_operator_member_id,p_branch_id,v_actor)
  on conflict(operator_member_id) do update set branch_id=excluded.branch_id,assigned_by=excluded.assigned_by,assigned_at=now();
  insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
  values(v_actor,'branch_operator_assigned','member',p_operator_member_id,jsonb_build_object('branch_id',p_branch_id));
  return true;
end;
$function$;

create or replace function public.admin_assign_mobile_stockist(
  p_stockist_member_id uuid, p_branch_id uuid, p_service_area text, p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.member_profiles mp where mp.id=p_stockist_member_id
    and mp.role='mobile_stockist'::public.amanah_role and mp.account_status='active') then
    raise exception 'Active Mobile Stockist account required' using errcode = '22023';
  end if;
  if p_branch_id is not null and not exists(select 1 from public.amanah_branches b where b.id=p_branch_id and b.status='active') then
    raise exception 'Active branch not found' using errcode = '22023';
  end if;
  if length(coalesce(p_service_area,'')) > 160 or length(coalesce(p_notes,'')) > 500 then
    raise exception 'Stockist assignment details are too long' using errcode = '22023';
  end if;
  insert into public.amanah_mobile_stockist_assignments(stockist_member_id,branch_id,service_area,notes,status,assigned_by)
  values(p_stockist_member_id,p_branch_id,coalesce(trim(p_service_area),''),coalesce(trim(p_notes),''),'active',v_actor)
  on conflict(stockist_member_id) do update set branch_id=excluded.branch_id,
    service_area=excluded.service_area,notes=excluded.notes,status='active',
    assigned_by=excluded.assigned_by,assigned_at=now(),updated_at=now();
  insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
  values(v_actor,'mobile_stockist_assigned','member',p_stockist_member_id,
    jsonb_build_object('branch_id',p_branch_id,'service_area',coalesce(trim(p_service_area),'')));
  return true;
end;
$function$;

create or replace function public.admin_set_mobile_stockist_status(p_stockist_member_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.amanah_is_active_admin() then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if p_status not in ('active','inactive') then
    raise exception 'Invalid assignment status' using errcode = '22023';
  end if;
  update public.amanah_mobile_stockist_assignments
  set status=p_status,updated_at=now()
  where stockist_member_id=p_stockist_member_id;
  if not found then raise exception 'Stockist assignment not found' using errcode = 'P0002'; end if;
  insert into public.amanah_operations_audit(actor_id,event_type,entity_type,entity_id,details)
  values(v_actor,'mobile_stockist_status_updated','member',p_stockist_member_id,jsonb_build_object('status',p_status));
  return true;
end;
$function$;

revoke all on function public.front_desk_create_expense(date,text,numeric,text) from public, anon;
revoke all on function public.front_desk_list_expenses(integer,integer) from public, anon;
revoke all on function public.front_desk_expense_summary() from public, anon;
revoke all on function public.admin_list_front_desk_expenses(date,date,text,integer,integer) from public, anon;
revoke all on function public.admin_list_branches() from public, anon;
revoke all on function public.admin_list_branch_operators() from public, anon;
revoke all on function public.admin_list_mobile_stockists() from public, anon;
revoke all on function public.admin_save_branch(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.admin_assign_branch_operator(uuid,uuid) from public, anon;
revoke all on function public.admin_assign_mobile_stockist(uuid,uuid,text,text) from public, anon;
revoke all on function public.admin_set_mobile_stockist_status(uuid,text) from public, anon;

grant execute on function public.front_desk_create_expense(date,text,numeric,text) to authenticated;
grant execute on function public.front_desk_list_expenses(integer,integer) to authenticated;
grant execute on function public.front_desk_expense_summary() to authenticated;
grant execute on function public.admin_list_front_desk_expenses(date,date,text,integer,integer) to authenticated;
grant execute on function public.admin_list_branches() to authenticated;
grant execute on function public.admin_list_branch_operators() to authenticated;
grant execute on function public.admin_list_mobile_stockists() to authenticated;
grant execute on function public.admin_save_branch(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.admin_assign_branch_operator(uuid,uuid) to authenticated;
grant execute on function public.admin_assign_mobile_stockist(uuid,uuid,text,text) to authenticated;
grant execute on function public.admin_set_mobile_stockist_status(uuid,text) to authenticated;

commit;
