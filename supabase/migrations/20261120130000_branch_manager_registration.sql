-- Branch Operator registration requires an explicit active Manager assignment.
-- The existing register_member() remains the activation-code authority. This wrapper
-- validates the selected application type and saves the Manager assignment atomically.

begin;

alter table public.member_profiles
  add column if not exists manager_id uuid
  references public.member_profiles(id) on delete restrict;

create index if not exists member_profiles_manager_id_idx
  on public.member_profiles(manager_id)
  where manager_id is not null;

create or replace function public.get_active_managers_for_registration()
returns table (
  id uuid,
  full_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select mp.id, mp.full_name::text
  from public.member_profiles as mp
  where mp.role = 'manager'::public.amanah_role
    and mp.account_status = 'active'
  order by mp.full_name, mp.member_number;
$$;

-- Registration loads this minimal directory before a new applicant is authenticated.
-- Only Manager UUIDs and display names are exposed; member numbers remain private.
revoke all on function public.get_active_managers_for_registration() from public;
grant execute on function public.get_active_managers_for_registration() to anon, authenticated;

create or replace function public.register_member_for_role(
  p_activation_code text,
  p_full_name text,
  p_mobile_number text,
  p_expected_role text,
  p_manager_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual_role text;
  v_manager_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_role not in ('distributor', 'mobile_stockist', 'branch_operator') then
    raise exception 'Unsupported registration form' using errcode = '22023';
  end if;

  if p_expected_role = 'branch_operator' then
    if p_manager_id is null then
      raise exception 'Select an active Manager before registering as a Branch Operator'
        using errcode = '22023';
    end if;

    select mp.id
      into v_manager_id
    from public.member_profiles as mp
    where mp.id = p_manager_id
      and mp.role = 'manager'::public.amanah_role
      and mp.account_status = 'active'
    for key share;

    if v_manager_id is null then
      raise exception 'The selected Manager is not active or does not exist'
        using errcode = '22023';
    end if;
  elsif p_manager_id is not null then
    raise exception 'Manager assignment is only valid for Branch Operator registration'
      using errcode = '22023';
  end if;

  -- Reuse the established activation-code redemption flow. Any later validation
  -- error aborts this transaction, including the activation redemption.
  perform public.register_member(
    p_activation_code,
    p_full_name,
    p_mobile_number
  );

  select mp.role::text
    into v_actual_role
  from public.member_profiles as mp
  where mp.id = auth.uid();

  if v_actual_role is distinct from p_expected_role then
    raise exception 'The activation code is for %, not %',
      coalesce(v_actual_role, 'an unknown role'), p_expected_role
      using errcode = '22023';
  end if;

  if p_expected_role = 'branch_operator' then
    update public.member_profiles
    set manager_id = v_manager_id,
        updated_at = now()
    where id = auth.uid()
      and role = 'branch_operator'::public.amanah_role;

    if not found then
      raise exception 'Branch Operator profile could not be assigned to the selected Manager';
    end if;
  end if;
end;
$$;

revoke all on function public.register_member_for_role(text, text, text, text, uuid) from public, anon;
grant execute on function public.register_member_for_role(text, text, text, text, uuid) to authenticated;

commit;
