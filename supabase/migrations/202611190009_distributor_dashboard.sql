-- Distributor dashboard read model.
-- PV is sourced from immutable purchase-item snapshots on PAID purchases only.
-- Bundle PV remains included for rank qualification; commission eligibility is not used here.
begin;

create or replace function public.get_distributor_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.member_profiles%rowtype;
  v_sponsor jsonb := null;
  v_personal_pv numeric(14,2) := 0;
  v_downline jsonb := '[]'::jsonb;
  v_direct jsonb := '[]'::jsonb;
  v_level_totals jsonb := '[]'::jsonb;
  v_group_pv numeric(14,2) := 0;
begin
  select * into v_member
  from public.member_profiles
  where id = auth.uid()
    and role = 'distributor'::public.amanah_role
    and account_status = 'active';

  if not found then
    raise exception 'Active distributor access required' using errcode = '42501';
  end if;

  select coalesce(sum(pi.unit_pv * pi.quantity), 0)::numeric(14,2)
    into v_personal_pv
  from public.purchases p
  join public.purchase_items pi on pi.purchase_id = p.id
  where p.member_id = v_member.id
    and p.purchase_status = 'paid';

  if v_member.sponsor_id is not null then
    select jsonb_build_object(
      'id', s.id,
      'member_number', s.member_number,
      'full_name', s.full_name,
      'role', s.role,
      'account_status', s.account_status
    )
    into v_sponsor
    from public.member_profiles s
    where s.id = v_member.sponsor_id;
  end if;

  with recursive downline as (
    select mp.id, mp.sponsor_id, mp.member_number, mp.full_name,
           mp.role, mp.account_status, mp.created_at,
           1 as level_number, array[mp.id] as path
    from public.member_profiles mp
    where mp.sponsor_id = v_member.id
    union all
    select child.id, child.sponsor_id, child.member_number, child.full_name,
           child.role, child.account_status, child.created_at,
           parent.level_number + 1, parent.path || child.id
    from public.member_profiles child
    join downline parent on child.sponsor_id = parent.id
    where parent.level_number < 10
      and not child.id = any(parent.path)
  ),
  pv_by_member as (
    select p.member_id, sum(pi.unit_pv * pi.quantity)::numeric(14,2) as pv
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
    group by p.member_id
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'member_number', d.member_number,
        'full_name', d.full_name,
        'role', d.role,
        'account_status', d.account_status,
        'joined_at', d.created_at,
        'level_number', d.level_number,
        'personal_pv', coalesce(pv.pv, 0)
      ) order by d.level_number, d.full_name
    ), '[]'::jsonb),
    coalesce(sum(coalesce(pv.pv, 0)), 0)::numeric(14,2),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'level_number', grouped.level_number,
        'member_count', grouped.member_count,
        'group_pv', grouped.group_pv
      ) order by grouped.level_number)
      from (
        select d2.level_number,
               count(*)::integer as member_count,
               coalesce(sum(coalesce(pv2.pv, 0)), 0)::numeric(14,2) as group_pv
        from downline d2
        left join pv_by_member pv2 on pv2.member_id = d2.id
        group by d2.level_number
      ) grouped
    ), '[]'::jsonb)
  into v_downline, v_group_pv, v_level_totals
  from downline d
  left join pv_by_member pv on pv.member_id = d.id;

  with pv_by_member as (
    select p.member_id, sum(pi.unit_pv * pi.quantity)::numeric(14,2) as pv
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
    group by p.member_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', mp.id,
    'member_number', mp.member_number,
    'full_name', mp.full_name,
    'role', mp.role,
    'account_status', mp.account_status,
    'joined_at', mp.created_at,
    'personal_pv', coalesce(pv.pv, 0)
  ) order by mp.created_at desc), '[]'::jsonb)
  into v_direct
  from public.member_profiles mp
  left join pv_by_member pv on pv.member_id = mp.id
  where mp.sponsor_id = v_member.id;

  v_group_pv := v_group_pv + v_personal_pv;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_member.id,
      'member_number', v_member.member_number,
      'full_name', v_member.full_name,
      'email', v_member.email,
      'mobile_number', v_member.mobile_number,
      'role', v_member.role,
      'rank', v_member.rank,
      'account_status', v_member.account_status,
      'joined_at', v_member.created_at
    ),
    'sponsor', v_sponsor,
    'personal_pv', v_personal_pv,
    'group_pv', v_group_pv,
    'direct_referral_count', jsonb_array_length(v_direct),
    'direct_referrals', v_direct,
    'downline', v_downline,
    'level_totals', v_level_totals,
    'pv_basis', 'Paid purchases only; purchase-item PV snapshots multiplied by quantity. Includes rank-qualifying bundle PV.'
  );
end;
$$;

revoke all on function public.get_distributor_dashboard() from public, anon;
grant execute on function public.get_distributor_dashboard() to authenticated;

commit;
