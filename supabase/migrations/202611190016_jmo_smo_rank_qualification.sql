-- JMO / SMO promotional rank qualification.
-- Accumulation runs from the member's registration timestamp through the first anniversary.
-- All paid purchase-item PV counts, including Distributor and Mobile Stockist bundles.
-- Once earned, promotional rank history is permanent. This migration does not generate payouts.

begin;

create table if not exists public.member_promotional_rank_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id),
  rank_name text not null check (rank_name in ('JMO', 'SMO')),
  qualified_at timestamptz not null,
  accumulation_started_at timestamptz not null,
  accumulation_ends_at timestamptz not null,
  personal_pv_at_qualification numeric(14,2) not null,
  group_pv_at_qualification numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint member_promotional_rank_history_unique unique (member_id, rank_name),
  constraint member_promotional_rank_history_pv_check check (
    personal_pv_at_qualification >= 0 and group_pv_at_qualification >= 0
  )
);

create index if not exists member_promotional_rank_history_member_idx
  on public.member_promotional_rank_history (member_id, qualified_at);

alter table public.member_promotional_rank_history enable row level security;
revoke all on public.member_promotional_rank_history from anon, authenticated;

-- Internal evaluator. Only called by trusted database triggers and the member-facing RPC.
create or replace function public.amanah_evaluate_promotional_rank(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.member_profiles%rowtype;
  v_window_end timestamptz;
  v_personal_pv numeric(14,2) := 0;
  v_group_pv numeric(14,2) := 0;
  v_jmo_at timestamptz;
  v_smo_at timestamptz;
  v_jmo_personal numeric(14,2) := 0;
  v_jmo_group numeric(14,2) := 0;
  v_smo_personal numeric(14,2) := 0;
  v_smo_group numeric(14,2) := 0;
begin
  select * into v_member
  from public.member_profiles
  where id = p_member_id and role = 'distributor'::public.amanah_role;

  if not found then
    return;
  end if;

  v_window_end := v_member.created_at + interval '1 year';

  with recursive network as (
    select mp.id, mp.sponsor_id, array[mp.id] as path
    from public.member_profiles mp
    where mp.id = v_member.id
    union all
    select child.id, child.sponsor_id, parent.path || child.id
    from public.member_profiles child
    join network parent on child.sponsor_id = parent.id
    where not child.id = any(parent.path)
  ),
  purchase_events as (
    select
      p.created_at as event_at,
      p.member_id,
      sum(pi.unit_pv * pi.quantity)::numeric(14,2) as event_pv
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
      and p.created_at >= v_member.created_at
      and p.created_at < v_window_end
      and p.member_id in (select id from network)
    group by p.created_at, p.member_id
  ),
  events as (
    select
      pe.event_at,
      sum(pe.event_pv)::numeric(14,2) as group_delta,
      (sum(pe.event_pv) filter (where pe.member_id = v_member.id))::numeric(14,2) as personal_delta
    from purchase_events pe
    group by pe.event_at
  ),
  running as (
    select
      e.event_at,
      sum(coalesce(e.personal_delta, 0)) over (
        order by e.event_at rows between unbounded preceding and current row
      )::numeric(14,2) as personal_pv,
      sum(e.group_delta) over (
        order by e.event_at rows between unbounded preceding and current row
      )::numeric(14,2) as group_pv
    from events e
  )
  select
    coalesce(max(r.personal_pv), 0),
    coalesce(max(r.group_pv), 0),
    min(r.event_at) filter (where r.personal_pv >= 5000 and r.group_pv >= 20000),
    min(r.event_at) filter (where r.personal_pv >= 10000 and r.group_pv >= 100000),
    coalesce((array_agg(r.personal_pv order by r.event_at) filter (
      where r.personal_pv >= 5000 and r.group_pv >= 20000
    ))[1], 0),
    coalesce((array_agg(r.group_pv order by r.event_at) filter (
      where r.personal_pv >= 5000 and r.group_pv >= 20000
    ))[1], 0),
    coalesce((array_agg(r.personal_pv order by r.event_at) filter (
      where r.personal_pv >= 10000 and r.group_pv >= 100000
    ))[1], 0),
    coalesce((array_agg(r.group_pv order by r.event_at) filter (
      where r.personal_pv >= 10000 and r.group_pv >= 100000
    ))[1], 0)
  into
    v_personal_pv, v_group_pv, v_jmo_at, v_smo_at,
    v_jmo_personal, v_jmo_group, v_smo_personal, v_smo_group
  from running r;

  if v_jmo_at is not null then
    insert into public.member_promotional_rank_history (
      member_id, rank_name, qualified_at, accumulation_started_at, accumulation_ends_at,
      personal_pv_at_qualification, group_pv_at_qualification
    ) values (
      v_member.id, 'JMO', v_jmo_at, v_member.created_at, v_window_end,
      v_jmo_personal, v_jmo_group
    )
    on conflict (member_id, rank_name) do nothing;
  end if;

  if v_smo_at is not null then
    insert into public.member_promotional_rank_history (
      member_id, rank_name, qualified_at, accumulation_started_at, accumulation_ends_at,
      personal_pv_at_qualification, group_pv_at_qualification
    ) values (
      v_member.id, 'SMO', v_smo_at, v_member.created_at, v_window_end,
      v_smo_personal, v_smo_group
    )
    on conflict (member_id, rank_name) do nothing;
  end if;
end;
$$;

-- Re-evaluate the purchaser and every sponsor above them when paid PV changes.
create or replace function public.amanah_refresh_promotional_ranks_for_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target record;
begin
  for v_target in
    with recursive uplines as (
      select mp.id, mp.sponsor_id, array[mp.id] as path
      from public.member_profiles mp
      where mp.id = p_member_id
      union all
      select parent.id, parent.sponsor_id, child.path || parent.id
      from public.member_profiles parent
      join uplines child on parent.id = child.sponsor_id
      where not parent.id = any(child.path)
    )
    select id from uplines
  loop
    perform public.amanah_evaluate_promotional_rank(v_target.id);
  end loop;
end;
$$;

create or replace function public.amanah_promotional_rank_purchase_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  if tg_table_name = 'purchases' then
    if tg_op = 'DELETE' then
      v_member_id := old.member_id;
    else
      v_member_id := new.member_id;
    end if;
  else
    if tg_op = 'DELETE' then
      select p.member_id into v_member_id from public.purchases p where p.id = old.purchase_id;
    else
      select p.member_id into v_member_id from public.purchases p where p.id = new.purchase_id;
    end if;
  end if;

  if v_member_id is not null then
    perform public.amanah_refresh_promotional_ranks_for_member(v_member_id);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists amanah_promotional_rank_purchase_status on public.purchases;
create trigger amanah_promotional_rank_purchase_status
after insert or update of purchase_status, member_id on public.purchases
for each row execute function public.amanah_promotional_rank_purchase_trigger();

drop trigger if exists amanah_promotional_rank_purchase_items on public.purchase_items;
create trigger amanah_promotional_rank_purchase_items
after insert or update or delete on public.purchase_items
for each row execute function public.amanah_promotional_rank_purchase_trigger();

create or replace function public.get_distributor_rank_progress()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.member_profiles%rowtype;
  v_window_end timestamptz;
  v_personal_pv numeric(14,2) := 0;
  v_group_pv numeric(14,2) := 0;
  v_jmo_at timestamptz;
  v_smo_at timestamptz;
  v_earned_rank text := 'Regular Member';
  v_jmo_record public.member_promotional_rank_history%rowtype;
  v_smo_record public.member_promotional_rank_history%rowtype;
begin
  select * into v_member
  from public.member_profiles
  where id = auth.uid()
    and role = 'distributor'::public.amanah_role
    and account_status = 'active';

  if not found then
    raise exception 'Active Distributor access required' using errcode = '42501';
  end if;

  perform public.amanah_evaluate_promotional_rank(v_member.id);
  v_window_end := v_member.created_at + interval '1 year';

  with recursive network as (
    select mp.id, mp.sponsor_id, array[mp.id] as path
    from public.member_profiles mp
    where mp.id = v_member.id
    union all
    select child.id, child.sponsor_id, parent.path || child.id
    from public.member_profiles child
    join network parent on child.sponsor_id = parent.id
    where not child.id = any(parent.path)
  ),
  totals as (
    select
      p.member_id,
      sum(pi.unit_pv * pi.quantity)::numeric(14,2) as pv
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
      and p.created_at >= v_member.created_at
      and p.created_at < v_window_end
      and p.member_id in (select id from network)
    group by p.member_id
  )
  select
    coalesce(sum(t.pv) filter (where t.member_id = v_member.id), 0),
    coalesce(sum(t.pv), 0)
  into v_personal_pv, v_group_pv
  from totals t;

  select * into v_jmo_record
  from public.member_promotional_rank_history
  where member_id = v_member.id and rank_name = 'JMO';

  select * into v_smo_record
  from public.member_promotional_rank_history
  where member_id = v_member.id and rank_name = 'SMO';

  if found and v_smo_record.id is not null then
    v_earned_rank := 'SMO';
  elsif v_jmo_record.id is not null then
    v_earned_rank := 'JMO';
  end if;

  return jsonb_build_object(
    'registration_at', v_member.created_at,
    'accumulation_ends_at', v_window_end,
    'countdown_active', now() < v_window_end,
    'seconds_remaining', greatest(0, extract(epoch from (v_window_end - now())))::bigint,
    'personal_pv', v_personal_pv,
    'group_pv', v_group_pv,
    'earned_rank', v_earned_rank,
    'jmo', jsonb_build_object(
      'personal_target', 5000,
      'group_target', 20000,
      'personal_progress', least(100, round(v_personal_pv / 5000 * 100, 2)),
      'group_progress', least(100, round(v_group_pv / 20000 * 100, 2)),
      'qualified', v_jmo_record.id is not null,
      'qualified_at', v_jmo_record.qualified_at,
      'additional_rate', 0.013
    ),
    'smo', jsonb_build_object(
      'personal_target', 10000,
      'group_target', 100000,
      'personal_progress', least(100, round(v_personal_pv / 10000 * 100, 2)),
      'group_progress', least(100, round(v_group_pv / 100000 * 100, 2)),
      'qualified', v_smo_record.id is not null,
      'qualified_at', v_smo_record.qualified_at,
      'additional_rate', 0.013
    ),
    'pv_includes_bundles', true,
    'qualification_window', 'First year from registration; only paid purchase PV within this window counts.',
    'rank_permanence', 'Once qualified, JMO or SMO rank is permanent.'
  );
end;
$$;

revoke all on function public.amanah_evaluate_promotional_rank(uuid) from public, anon, authenticated;
revoke all on function public.amanah_refresh_promotional_ranks_for_member(uuid) from public, anon, authenticated;
revoke all on function public.amanah_promotional_rank_purchase_trigger() from public, anon, authenticated;
revoke all on function public.get_distributor_rank_progress() from public, anon;
grant execute on function public.get_distributor_rank_progress() to authenticated;

-- Backfill rank history for existing distributors whose first-year PV already meets the rules.
do $$
declare
  v_member record;
begin
  for v_member in
    select id from public.member_profiles
    where role = 'distributor'::public.amanah_role
  loop
    perform public.amanah_evaluate_promotional_rank(v_member.id);
  end loop;
end;
$$;

commit;
