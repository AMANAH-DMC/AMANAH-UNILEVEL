-- Keep Admin, Front Desk, and the first Root Distributor exempt from monthly product activation.
-- This affects product-activation activity only; it does not alter
-- account_status, purchase history, PV, rank qualification, or Unilevel rules.

begin;

create or replace function public.get_member_monthly_activity()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.member_profiles%rowtype;
  v_month_start timestamptz;
  v_count integer := 0;
  v_last_purchase timestamptz;
  v_is_exempt boolean := false;
begin
  select *
    into v_member
  from public.member_profiles
  where id = auth.uid();

  if not found then
    raise exception 'Member account required' using errcode = '42501';
  end if;

  -- Permanent exemptions: all Admin accounts, Front Desk, and the first
  -- Root Distributor account (amanah).
  v_is_exempt :=
    v_member.role::text in ('admin', 'front_desk')
    or v_member.id = '8b8001d0-75d1-4792-b291-25593edd9dda'::uuid;

  v_month_start :=
    date_trunc('month', now() at time zone 'Asia/Manila')
    at time zone 'Asia/Manila';

  select count(distinct p.id)::integer, max(p.created_at)
    into v_count, v_last_purchase
  from public.purchases p
  join public.purchase_items pi on pi.purchase_id = p.id
  where p.member_id = v_member.id
    and p.purchase_status = 'paid'
    and p.created_at >= v_month_start
    and pi.unilevel_eligible = true;

  if v_is_exempt then
    return jsonb_build_object(
      'month_start', v_month_start,
      'qualifying_purchase_count', v_count,
      'last_qualifying_purchase_at', v_last_purchase,
      'is_active', true,
      'status', 'ACTIVE',
      'is_product_activation_exempt', true,
      'qualification_rule', 'Permanently exempt from monthly product activation.'
    );
  end if;

  if v_member.account_status is distinct from 'active' then
    raise exception 'Active member account required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'month_start', v_month_start,
    'qualifying_purchase_count', v_count,
    'last_qualifying_purchase_at', v_last_purchase,
    'is_active', v_count > 0,
    'status', case when v_count > 0 then 'ACTIVE' else 'INACTIVE' end,
    'is_product_activation_exempt', false,
    'qualification_rule', 'At least one paid regular-product purchase in the current Asia/Manila calendar month. Bundles do not qualify.'
  );
end;
$$;

revoke all on function public.get_member_monthly_activity() from public, anon;
grant execute on function public.get_member_monthly_activity() to authenticated;

commit;
