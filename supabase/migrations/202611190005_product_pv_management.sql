-- AMANAH Product PV Catalog
-- Admin-managed PV/commission eligibility with an append-only audit trail.
-- Existing public product descriptions/prices and historical transactions are untouched.

begin;

create table if not exists public.product_pv_catalog (
  product_code text primary key,
  product_name text not null,
  pv numeric(10,2) not null check (pv >= 0),
  commissionable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.product_pv_audit (
  audit_id bigint generated always as identity primary key,
  product_code text not null,
  old_pv numeric(10,2),
  new_pv numeric(10,2) not null,
  old_commissionable boolean,
  new_commissionable boolean not null,
  old_is_active boolean,
  new_is_active boolean not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.product_pv_catalog enable row level security;
alter table public.product_pv_audit enable row level security;

revoke all on public.product_pv_catalog from anon, authenticated;
revoke all on public.product_pv_audit from anon, authenticated;

insert into public.product_pv_catalog
  (product_code, product_name, pv, commissionable, is_active)
values
  ('spirulina', 'Spirulina', 20, true, true),
  ('serpentina', 'Serpentina', 25, true, true),
  ('herbal_oil', 'Herbal Oil', 15, true, true),
  ('herbal_rub', 'Herbal Rub', 10, true, true),
  ('baskug_coffee', 'Baskug Coffee', 30, true, true),
  ('barakah_coffee', 'Barakah Coffee', 30, true, true),
  ('max_c_pro', 'Max C Pro', 40, true, true),
  ('glutagen_cee', 'Glutagen Cee', 35, true, true),
  ('distributor_bundle', 'Distributor Bundle', 50, false, true),
  ('mobile_stockist_bundle', 'Mobile Stockist Bundle', 100, false, true)
on conflict (product_code) do nothing;

create or replace function public.get_admin_product_pv_catalog()
returns table (
  product_code text,
  product_name text,
  pv numeric,
  commissionable boolean,
  is_active boolean,
  updated_at timestamptz
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
  select p.product_code, p.product_name, p.pv, p.commissionable,
         p.is_active, p.updated_at
    from public.product_pv_catalog p
   order by p.product_name;
end;
$$;

create or replace function public.admin_update_product_pv(
  p_product_code text,
  p_pv numeric,
  p_commissionable boolean,
  p_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.product_pv_catalog%rowtype;
begin
  if not public.amanah_is_active_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_pv is null or p_pv < 0 or p_pv <> round(p_pv, 2) then
    raise exception 'PV must be zero or greater, with up to two decimal places' using errcode = '22023';
  end if;
  if p_commissionable is null or p_is_active is null then
    raise exception 'Commission eligibility and active status are required' using errcode = '22023';
  end if;

  select * into v_old
    from public.product_pv_catalog
   where product_code = p_product_code
   for update;

  if not found then
    raise exception 'Product PV record not found' using errcode = 'P0002';
  end if;

  if v_old.pv = p_pv
     and v_old.commissionable = p_commissionable
     and v_old.is_active = p_is_active then
    return true;
  end if;

  update public.product_pv_catalog
     set pv = p_pv,
         commissionable = p_commissionable,
         is_active = p_is_active,
         updated_at = now(),
         updated_by = auth.uid()
   where product_code = p_product_code;

  insert into public.product_pv_audit (
    product_code, old_pv, new_pv,
    old_commissionable, new_commissionable,
    old_is_active, new_is_active, changed_by
  ) values (
    p_product_code, v_old.pv, p_pv,
    v_old.commissionable, p_commissionable,
    v_old.is_active, p_is_active, auth.uid()
  );

  return true;
end;
$$;

create or replace function public.prevent_product_pv_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Product PV audit records are immutable';
end;
$$;

drop trigger if exists product_pv_audit_immutable on public.product_pv_audit;
create trigger product_pv_audit_immutable
before update or delete on public.product_pv_audit
for each row execute function public.prevent_product_pv_audit_mutation();

revoke all on function public.get_admin_product_pv_catalog() from public, anon;
revoke all on function public.admin_update_product_pv(text, numeric, boolean, boolean) from public, anon;
grant execute on function public.get_admin_product_pv_catalog() to authenticated;
grant execute on function public.admin_update_product_pv(text, numeric, boolean, boolean) to authenticated;

commit;
