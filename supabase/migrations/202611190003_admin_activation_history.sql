-- AMANAH Admin Activation Code History
-- Read-only Admin RPCs. Never return code hashes or previously generated plaintext codes.

begin;

create or replace function public.get_admin_activation_codes(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id text,
  assigned_role text,
  sponsor_id text,
  created_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  code_status text
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
    'distributor', 'mobile_stockist', 'branch_operator', 'manager'
  ) then
    raise exception 'Invalid activation role filter' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in (
    'unused', 'redeemed', 'expired', 'revoked'
  ) then
    raise exception 'Invalid activation status filter' using errcode = '22023';
  end if;

  return query
  with source_rows as (
    select to_jsonb(ac) as item
    from public.activation_codes as ac
  ), normalized as (
    select
      item,
      item ->> 'id' as code_id,
      coalesce(item ->> 'assigned_role', item ->> 'role') as code_role,
      item ->> 'sponsor_id' as code_sponsor_id,
      nullif(item ->> 'created_at', '')::timestamptz as code_created_at,
      nullif(item ->> 'expires_at', '')::timestamptz as code_expires_at,
      nullif(item ->> 'redeemed_at', '')::timestamptz as code_redeemed_at,
      nullif(item ->> 'revoked_at', '')::timestamptz as code_revoked_at
    from source_rows
  ), classified as (
    select
      *,
      case
        when code_revoked_at is not null then 'revoked'
        when code_redeemed_at is not null then 'redeemed'
        when code_expires_at is not null and code_expires_at <= now() then 'expired'
        else 'unused'
      end as computed_status
    from normalized
  )
  select
    c.code_id,
    c.code_role,
    c.code_sponsor_id,
    c.code_created_at,
    c.code_expires_at,
    c.code_redeemed_at,
    c.code_revoked_at,
    c.computed_status
  from classified as c
  where (
      nullif(trim(p_search), '') is null
      or coalesce(c.code_id, '') ilike '%' || trim(p_search) || '%'
      or coalesce(c.code_role, '') ilike '%' || trim(p_search) || '%'
    )
    and (p_role is null or c.code_role = p_role)
    and (p_status is null or c.computed_status = p_status)
  order by c.code_created_at desc nulls last, c.code_id desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.get_admin_activation_events(
  p_limit integer default 10
)
returns table (
  event_id text,
  event_type text,
  actor_id text,
  activation_code_id text,
  occurred_at timestamptz
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
    coalesce(j ->> 'id', '') as event_id,
    coalesce(j ->> 'event_type', j ->> 'event', j ->> 'action', 'unknown') as event_type,
    coalesce(j ->> 'actor_id', j ->> 'created_by', j ->> 'performed_by') as actor_id,
    coalesce(j ->> 'activation_code_id', j ->> 'code_id') as activation_code_id,
    coalesce(
      nullif(j ->> 'created_at', '')::timestamptz,
      nullif(j ->> 'occurred_at', '')::timestamptz
    ) as occurred_at
  from (
    select to_jsonb(ev) as j
    from public.activation_events as ev
  ) as events
  order by coalesce(
    nullif(j ->> 'created_at', '')::timestamptz,
    nullif(j ->> 'occurred_at', '')::timestamptz
  ) desc nulls last
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

revoke all on function public.get_admin_activation_codes(text, text, text, integer, integer) from public, anon;
revoke all on function public.get_admin_activation_events(integer) from public, anon;
grant execute on function public.get_admin_activation_codes(text, text, text, integer, integer) to authenticated;
grant execute on function public.get_admin_activation_events(integer) to authenticated;

commit;
