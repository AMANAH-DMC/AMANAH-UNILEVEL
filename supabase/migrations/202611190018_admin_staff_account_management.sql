-- Admin-managed provisioning for the two privileged staff roles.
-- Auth identities use non-deliverable .invalid aliases; no email is sent.
begin;

create table if not exists public.admin_staff_account_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  target_user_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('created', 'password_reset')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_staff_account_events enable row level security;
revoke all on public.admin_staff_account_events from public, anon, authenticated;
grant all on public.admin_staff_account_events to service_role;

create or replace function public.get_admin_staff_accounts()
returns table (
  user_id uuid,
  full_name text,
  role text,
  member_number text,
  username text,
  account_status text,
  created_at timestamptz
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
    mp.full_name::text,
    mp.role::text,
    mp.member_number::text,
    mlu.username::text,
    mp.account_status::text,
    mp.created_at
  from public.member_profiles mp
  left join public.member_login_usernames mlu on mlu.user_id = mp.id
  where mp.role::text in ('admin', 'front_desk')
  order by case mp.role::text when 'admin' then 0 else 1 end, mp.created_at, mp.id;
end;
$$;

revoke all on function public.get_admin_staff_accounts() from public, anon;
grant execute on function public.get_admin_staff_accounts() to authenticated;

commit;
