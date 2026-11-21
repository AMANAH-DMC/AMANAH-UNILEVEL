-- Sponsor selection and display by login username.
-- Only active Admins can browse the active sponsor directory for activation-code creation.
-- Every active member role may be selected as a sponsor.

begin;

create or replace function public.get_active_members_for_activation_sponsor()
returns table (
  id uuid,
  username text,
  full_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.amanah_is_active_admin() then
    raise exception 'Active administrator access required' using errcode = '42501';
  end if;

  return query
  select mp.id, mlu.username, mp.full_name::text
  from public.member_profiles as mp
  join public.member_login_usernames as mlu on mlu.user_id = mp.id
  where mp.account_status = 'active'
  order by mlu.username;
end;
$$;

create or replace function public.get_my_sponsor_username()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select sponsor_login.username
    into v_username
  from public.member_profiles as member
  left join public.member_login_usernames as sponsor_login
    on sponsor_login.user_id = member.sponsor_id
  where member.id = auth.uid();

  return v_username;
end;
$$;

revoke all on function public.get_active_members_for_activation_sponsor() from public, anon;
grant execute on function public.get_active_members_for_activation_sponsor() to authenticated;

revoke all on function public.get_my_sponsor_username() from public, anon;
grant execute on function public.get_my_sponsor_username() to authenticated;

commit;
