-- Registration category/sponsor validation and read-only monthly purchase monitoring.
-- Additive only: existing members, activation codes, purchases, commissions, and financial rows are untouched.
begin;

create or replace function public.register_member_with_category(
  p_activation_code text,
  p_full_name text,
  p_mobile_number text,
  p_selected_role text,
  p_sponsor_username text
)
returns table(member_id uuid, member_number text, assigned_role public.amanah_role, assigned_rank public.amanah_rank, sponsor_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code_role text;
  v_code_sponsor uuid;
  v_selected_sponsor uuid;
  v_registered record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_selected_role not in ('distributor','branch_operator','mobile_stockist') then
    raise exception 'Invalid partnership category' using errcode = '22023';
  end if;
  if nullif(trim(p_sponsor_username),'') is null then
    raise exception 'Sponsor username is required' using errcode = '22023';
  end if;

  select ac.assigned_role::text, ac.sponsor_id
    into v_code_role, v_code_sponsor
  from public.activation_codes ac
  where ac.code_hash = encode(extensions.digest(upper(trim(p_activation_code)), 'sha256'), 'hex')
    and ac.redeemed_at is null
    and ac.revoked_at is null
    and (ac.expires_at is null or ac.expires_at > now());

  if v_code_role is null then
    raise exception 'Activation code is invalid, redeemed, revoked, or expired' using errcode = '22023';
  end if;
  if v_code_role <> p_selected_role then
    raise exception 'Selected partnership category does not match the activation code' using errcode = '22023';
  end if;

  select mp.id into v_selected_sponsor
  from public.member_login_usernames lu
  join public.member_profiles mp on mp.id = lu.user_id
  where lu.username = lower(trim(p_sponsor_username))
    and mp.account_status::text = 'active';

  if v_selected_sponsor is null then
    raise exception 'Sponsor username was not found or is not active' using errcode = '22023';
  end if;
  if v_code_sponsor is not null and v_code_sponsor <> v_selected_sponsor then
    raise exception 'Sponsor username does not match the sponsor assigned to this activation code' using errcode = '22023';
  end if;

  for v_registered in
    select * from public.register_member(p_activation_code, p_full_name, p_mobile_number)
  loop
    if v_code_sponsor is null then
      update public.member_profiles
        set sponsor_id = v_selected_sponsor
        where id = v_registered.member_id;
    end if;
    return query select v_registered.member_id, v_registered.member_number,
      v_registered.assigned_role, v_registered.assigned_rank,
      case when v_code_sponsor is null then v_selected_sponsor else v_code_sponsor end;
  end loop;
end;
$function$;

revoke all on function public.register_member_with_category(text,text,text,text,text) from public, anon;
grant execute on function public.register_member_with_category(text,text,text,text,text) to authenticated;

create or replace function public.admin_get_branch_stockist_monthly_purchase_activity()
returns table(
  member_id uuid,
  member_number text,
  full_name text,
  role text,
  account_status text,
  branch_name text,
  purchase_count bigint,
  purchase_pv numeric,
  month_start timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_month_start timestamptz;
begin
  if auth.uid() is null or not public.amanah_is_active_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';

  return query
  with monthly_paid as (
    select
      p.member_id,
      count(distinct p.id)::bigint as purchase_count,
      coalesce(sum(pi.unit_pv * pi.quantity),0)::numeric as purchase_pv
    from public.purchases p
    join public.purchase_items pi on pi.purchase_id = p.id
    where p.purchase_status = 'paid'
      and p.created_at >= v_month_start
      and pi.unilevel_eligible = true
    group by p.member_id
  )
  select
    mp.id,
    mp.member_number::text,
    mp.full_name::text,
    mp.role::text,
    mp.account_status::text,
    b.branch_name::text,
    coalesce(m.purchase_count,0)::bigint,
    coalesce(m.purchase_pv,0)::numeric,
    v_month_start
  from public.member_profiles mp
  left join monthly_paid m on m.member_id = mp.id
  left join public.amanah_branch_operator_assignments boa on boa.operator_member_id = mp.id
  left join public.amanah_mobile_stockist_assignments msa on msa.stockist_member_id = mp.id
  left join public.amanah_branches b on b.id = coalesce(boa.branch_id, msa.branch_id)
  where mp.role::text in ('branch_operator','mobile_stockist')
  order by mp.role::text, mp.member_number::text;
end;
$function$;

revoke all on function public.admin_get_branch_stockist_monthly_purchase_activity() from public, anon;
grant execute on function public.admin_get_branch_stockist_monthly_purchase_activity() to authenticated;

commit;
