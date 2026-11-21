-- Let the enrolling client identify their sponsor by login username.
-- The database resolves the username to an active member and stores sponsor_id.
-- Branch Operator Manager assignment remains enforced in the same transaction.

begin;

alter table public.member_profiles
  add column if not exists manager_id uuid
  references public.member_profiles(id) on delete restrict;

create index if not exists member_profiles_manager_id_idx
  on public.member_profiles(manager_id)
  where manager_id is not null;

drop function if exists public.register_member_for_role(text, text, text, text, uuid);

create function public.register_member_for_role(
  p_activation_code text,
  p_full_name text,
  p_mobile_number text,
  p_expected_role text,
  p_sponsor_username text,
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
  v_sponsor_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_role not in ('distributor', 'mobile_stockist', 'branch_operator') then
    raise exception 'Unsupported registration form' using errcode = '22023';
  end if;

  if p_sponsor_username is null or btrim(p_sponsor_username) = '' then
    raise exception 'Enter your sponsor username' using errcode = '22023';
  end if;

  select mp.id
    into v_sponsor_id
  from public.member_profiles as mp
  join public.member_login_usernames as mlu on mlu.user_id = mp.id
  where lower(mlu.username) = lower(btrim(p_sponsor_username))
    and mp.account_status = 'active'
    and mp.id <> auth.uid();

  if v_sponsor_id is null then
    raise exception 'Sponsor username was not found or the member is not active'
      using errcode = '22023';
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

  update public.member_profiles
  set sponsor_id = v_sponsor_id,
      manager_id = case
        when p_expected_role = 'branch_operator' then v_manager_id
        else null
      end,
      updated_at = now()
  where id = auth.uid()
    and role::text = p_expected_role;

  if not found then
    raise exception 'Member profile could not be assigned to the selected sponsor and Manager';
  end if;
end;
$$;

revoke all on function public.register_member_for_role(text, text, text, text, text, uuid) from public, anon;
grant execute on function public.register_member_for_role(text, text, text, text, text, uuid) to authenticated;

commit;
