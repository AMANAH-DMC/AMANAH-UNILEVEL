-- Username-based sign-in mapping for AMANAH.
-- Supabase Auth continues to own and verify passwords. The Edge Function uses
-- this private mapping to resolve usernames without exposing account email addresses.

begin;

create table if not exists public.member_login_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_login_usernames_format_check
    check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,39}$')
);

alter table public.member_login_usernames enable row level security;
revoke all on public.member_login_usernames from anon, authenticated;
grant all on public.member_login_usernames to service_role;

-- Assign standard member numbers to operational members; the two Admin
-- accounts receive stable custom usernames and Front Desk receives frontdesk.
with ranked_admins as (
  select mp.id,
         row_number() over (order by mp.created_at, mp.id) as admin_number
  from public.member_profiles mp
  where mp.role::text = 'admin'
),
initial_usernames as (
  select mp.id as user_id,
         case
           when mp.role::text = 'admin' then 'amanahadmin' || ra.admin_number::text
           when mp.role::text = 'front_desk' then 'frontdesk'
           else lower(mp.member_number::text)
         end as username
  from public.member_profiles mp
  left join ranked_admins ra on ra.id = mp.id
  where mp.role::text in ('admin', 'front_desk')
     or mp.member_number is not null
)
insert into public.member_login_usernames (user_id, username)
select user_id, username
from initial_usernames
where username is not null
  and username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'
on conflict (user_id) do nothing;

-- New enrollments automatically receive their login username.
create or replace function public.amanah_assign_member_login_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_admin_number bigint;
begin
  if new.role::text = 'admin' then
    select count(*) + 1 into v_admin_number
    from public.member_profiles mp
    where mp.role::text = 'admin'
      and (mp.created_at, mp.id) < (new.created_at, new.id);
    v_username := 'amanahadmin' || v_admin_number::text;
  elsif new.role::text = 'front_desk' then
    v_username := 'frontdesk';
  else
    v_username := lower(new.member_number::text);
  end if;

  if v_username is not null
     and v_username ~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    insert into public.member_login_usernames (user_id, username)
    values (new.id, v_username)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists amanah_assign_member_login_username on public.member_profiles;
create trigger amanah_assign_member_login_username
after insert on public.member_profiles
for each row execute function public.amanah_assign_member_login_username();

-- Admin-only function for changing a custom login username without changing
-- the member's role, email address, or password.
create or replace function public.admin_set_member_login_username(
  p_member_id uuid,
  p_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(trim(p_username));
begin
  if not public.amanah_is_active_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Username must be 3-40 characters using letters, numbers, dot, underscore or hyphen';
  end if;
  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'Member profile not found';
  end if;
  insert into public.member_login_usernames (user_id, username, updated_at)
  values (p_member_id, v_username, now())
  on conflict (user_id) do update
    set username = excluded.username, updated_at = now();
exception
  when unique_violation then
    raise exception 'That username is already assigned to another account';
end;
$$;

revoke all on function public.amanah_assign_member_login_username() from public, anon, authenticated;
revoke all on function public.admin_set_member_login_username(uuid, text) from public, anon;
grant execute on function public.admin_set_member_login_username(uuid, text) to authenticated;

commit;
