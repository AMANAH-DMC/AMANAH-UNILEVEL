-- Product-code issuance and one-time redemption foundation.
-- Codes are separate from Front Desk POS and activation codes.
-- Commission ledger generation is intentionally NOT enabled in this migration.
begin;

create sequence if not exists public.product_code_serial_seq
  start with 1 increment by 1 minvalue 1 maxvalue 999999 no cycle;

create table if not exists public.product_code_prefixes (
  product_code text primary key,
  prefix text not null unique,
  created_at timestamptz not null default now(),
  constraint product_code_prefixes_prefix_format check (prefix ~ '^[A-Z]{2,4}$')
);

insert into public.product_code_prefixes (product_code, prefix) values
  ('spirulina', 'SPI'),
  ('serpentina', 'SER'),
  ('herbal_oil', 'OIL'),
  ('herbal_rub', 'RUB'),
  ('baskug_coffee', 'BAS'),
  ('barakah_coffee', 'BAR'),
  ('max_c_pro', 'MAX'),
  ('glutagen_cee', 'GLU'),
  ('distributor_bundle', 'DB'),
  ('mobile_stockist_bundle', 'MSB')
on conflict (product_code) do update set prefix = excluded.prefix;

create table if not exists public.product_codes (
  id uuid primary key default gen_random_uuid(),
  product_code text not null,
  product_name text not null,
  prefix text not null,
  serial_number char(6) not null,
  code_hash text not null unique,
  product_pv numeric(12,2) not null,
  commissionable boolean not null,
  status text not null default 'issued',
  issued_by uuid not null references public.member_profiles(id),
  issued_at timestamptz not null default now(),
  redeemed_by uuid references public.member_profiles(id),
  redeemed_at timestamptz,
  purchase_id uuid references public.purchases(id),
  constraint product_codes_status_check check (status in ('issued','redeemed','void')),
  constraint product_codes_pv_check check (product_pv >= 0),
  constraint product_codes_redemption_state_check check (
    (status = 'redeemed' and redeemed_by is not null and redeemed_at is not null and purchase_id is not null)
    or (status <> 'redeemed' and redeemed_by is null and redeemed_at is null and purchase_id is null)
  )
);

create index if not exists product_codes_status_issued_at_idx
  on public.product_codes (status, issued_at desc);
create index if not exists product_codes_redeemed_by_idx
  on public.product_codes (redeemed_by, redeemed_at desc);

create table if not exists public.product_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  product_code_id uuid not null unique references public.product_codes(id),
  purchaser_id uuid not null references public.member_profiles(id),
  purchase_id uuid not null unique references public.purchases(id),
  product_code text not null,
  product_name text not null,
  product_pv numeric(12,2) not null,
  commissionable boolean not null,
  redeemed_at timestamptz not null default now()
);

alter table public.product_codes enable row level security;
alter table public.product_code_redemptions enable row level security;
alter table public.product_code_prefixes enable row level security;

revoke all on public.product_codes from anon, authenticated;
revoke all on public.product_code_redemptions from anon, authenticated;
revoke all on public.product_code_prefixes from anon, authenticated;

create or replace function public.front_desk_issue_product_codes(
  p_product_code text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.member_profiles%rowtype;
  v_catalog public.product_pv_catalog%rowtype;
  v_prefix text;
  v_serial bigint;
  v_code text;
  v_result jsonb := '[]'::jsonb;
  v_i integer;
begin
  select * into v_actor from public.member_profiles
  where id = auth.uid() and role = 'front_desk'::public.amanah_role
    and account_status = 'active';
  if not found then
    raise exception 'Active Front Desk access required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 500 then
    raise exception 'Quantity must be between 1 and 500';
  end if;

  select * into v_catalog from public.product_pv_catalog
  where product_code = lower(trim(p_product_code)) and is_active = true;
  if not found then
    raise exception 'Product is not active in the PV catalog';
  end if;

  select prefix into v_prefix from public.product_code_prefixes
  where product_code = v_catalog.product_code;
  if v_prefix is null then
    raise exception 'No product-code prefix is configured for this product';
  end if;

  if v_catalog.pv <> trunc(v_catalog.pv) then
    raise exception 'Product-code format requires whole-number PV';
  end if;

  for v_i in 1..p_quantity loop
    v_serial := nextval('public.product_code_serial_seq');
    if v_serial > 999999 then
      raise exception 'Product-code serial capacity exhausted';
    end if;
    v_code := v_prefix || lpad(v_serial::text, 6, '0') || trunc(v_catalog.pv)::bigint::text;
    insert into public.product_codes (
      product_code, product_name, prefix, serial_number, code_hash,
      product_pv, commissionable, issued_by
    ) values (
      v_catalog.product_code, v_catalog.product_name, v_prefix,
      lpad(v_serial::text, 6, '0'),
      encode(extensions.digest(upper(v_code), 'sha256'), 'hex'),
      v_catalog.pv, v_catalog.commissionable, v_actor.id
    );
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'code', v_code, 'product_name', v_catalog.product_name,
      'product_code', v_catalog.product_code, 'pv', v_catalog.pv
    ));
  end loop;

  return jsonb_build_object('issued_count', p_quantity, 'codes', v_result);
end;
$$;

create or replace function public.redeem_product_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.member_profiles%rowtype;
  v_code public.product_codes%rowtype;
  v_product_id uuid;
  v_purchase_id uuid;
  v_reference text;
begin
  select * into v_member from public.member_profiles
  where id = auth.uid()
    and role = 'distributor'::public.amanah_role
    and account_status = 'active';
  if not found then
    raise exception 'Active Distributor access required' using errcode = '42501';
  end if;

  if p_code is null or length(trim(p_code)) < 9 or length(trim(p_code)) > 20 then
    raise exception 'Enter a valid product code';
  end if;

  select * into v_code from public.product_codes
  where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Product code is invalid';
  end if;
  if v_code.status <> 'issued' then
    raise exception 'Product code has already been redeemed or voided';
  end if;

  select id into v_product_id from public.products
  where lower(product_name) = lower(v_code.product_name) and is_active = true
  order by created_at asc limit 1;
  if v_product_id is null then
    raise exception 'The linked product is not active in the product catalog';
  end if;

  v_purchase_id := gen_random_uuid();
  v_reference := 'PC-' || replace(v_purchase_id::text, '-', '');

  insert into public.purchases (
    id, purchase_reference, member_id, purchase_status, total_amount, total_pv, created_at
  ) values (
    v_purchase_id, v_reference, v_member.id, 'paid', 0, v_code.product_pv, now()
  );

  insert into public.purchase_items (
    purchase_id, product_id, quantity, unit_price, unit_pv, unilevel_eligible, created_at
  ) values (
    v_purchase_id, v_product_id, 1, 0, v_code.product_pv, v_code.commissionable, now()
  );

  update public.product_codes
  set status = 'redeemed', redeemed_by = v_member.id,
      redeemed_at = now(), purchase_id = v_purchase_id
  where id = v_code.id and status = 'issued';

  if not found then
    raise exception 'Product code was redeemed by another request';
  end if;

  insert into public.product_code_redemptions (
    product_code_id, purchaser_id, purchase_id, product_code,
    product_name, product_pv, commissionable
  ) values (
    v_code.id, v_member.id, v_purchase_id, v_code.product_code,
    v_code.product_name, v_code.product_pv, v_code.commissionable
  );

  return jsonb_build_object(
    'success', true, 'product_name', v_code.product_name,
    'product_pv', v_code.product_pv, 'purchase_reference', v_reference,
    'commissionable', v_code.commissionable,
    'message', 'Product code redeemed and PV credited successfully.'
  );
end;
$$;

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
begin
  select * into v_member from public.member_profiles
  where id = auth.uid() and account_status = 'active';
  if not found then
    raise exception 'Active member account required' using errcode = '42501';
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';

  select count(distinct p.id)::integer, max(p.created_at)
    into v_count, v_last_purchase
  from public.purchases p
  join public.purchase_items pi on pi.purchase_id = p.id
  where p.member_id = v_member.id
    and p.purchase_status = 'paid'
    and p.created_at >= v_month_start
    and pi.unilevel_eligible = true;

  return jsonb_build_object(
    'month_start', v_month_start,
    'qualifying_purchase_count', v_count,
    'last_qualifying_purchase_at', v_last_purchase,
    'is_active', v_count > 0,
    'status', case when v_count > 0 then 'ACTIVE' else 'INACTIVE' end,
    'qualification_rule', 'At least one paid regular-product purchase in the current Asia/Manila calendar month. Bundles do not qualify.'
  );
end;
$$;

revoke all on function public.front_desk_issue_product_codes(text, integer) from public, anon;
revoke all on function public.redeem_product_code(text) from public, anon;
revoke all on function public.get_member_monthly_activity() from public, anon;
grant execute on function public.front_desk_issue_product_codes(text, integer) to authenticated;
grant execute on function public.redeem_product_code(text) to authenticated;
grant execute on function public.get_member_monthly_activity() to authenticated;

commit;
