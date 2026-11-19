-- Front Desk POS: private order records and server-authoritative price snapshots.
begin;

create table if not exists public.front_desk_pos_prices (
  product_code text primary key,
  product_name text not null,
  walk_in_price numeric(12,2) not null check (walk_in_price >= 0),
  distributor_price numeric(12,2) not null check (distributor_price >= 0),
  mobile_stockist_price numeric(12,2) not null check (mobile_stockist_price >= 0),
  branch_operator_price numeric(12,2) not null check (branch_operator_price >= 0),
  manager_price numeric(12,2) not null check (manager_price >= 0),
  is_active boolean not null default true
);

insert into public.front_desk_pos_prices
(product_code,product_name,walk_in_price,distributor_price,mobile_stockist_price,branch_operator_price,manager_price)
values
('spirulina','Spirulina',350,304,273,227,196),
('serpentina','Serpentina',600,522,460,390,336),
('glutagen_cee','Glutagen Cee',600,522,460,390,336),
('max_c_pro','Max C Pro',1000,870,800,710,620),
('baskug_coffee','Baskug',450,391,355,317,279),
('barakah_coffee','Barakah',450,391,355,317,279),
('herbal_oil','Herbal Oil',180,156,140,125,110),
('herbal_rub','Herbal Rub',125,108,110,90,77)
on conflict (product_code) do update set
product_name=excluded.product_name, walk_in_price=excluded.walk_in_price,
distributor_price=excluded.distributor_price, mobile_stockist_price=excluded.mobile_stockist_price,
branch_operator_price=excluded.branch_operator_price, manager_price=excluded.manager_price;

create table if not exists public.front_desk_pos_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  created_by uuid not null references auth.users(id),
  customer_type text not null check (customer_type in ('walk_in','distributor','mobile_stockist','branch_operator','manager')),
  customer_name text,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.front_desk_pos_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.front_desk_pos_orders(id),
  product_code text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

alter table public.front_desk_pos_prices enable row level security;
alter table public.front_desk_pos_orders enable row level security;
alter table public.front_desk_pos_order_items enable row level security;
revoke all on public.front_desk_pos_prices, public.front_desk_pos_orders, public.front_desk_pos_order_items from anon, authenticated;

create or replace function public.front_desk_create_pos_order(
  p_customer_type text,
  p_customer_name text,
  p_items jsonb
)
returns table(order_id uuid, order_number text, total_amount numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_code text;
  v_qty integer;
  v_name text;
  v_price numeric(12,2);
begin
  if v_user is null or not exists (
    select 1 from public.member_profiles mp
    where mp.id = v_user and mp.role = 'front_desk' and mp.account_status = 'active'
  ) then
    raise exception 'Active Front Desk access required' using errcode = '42501';
  end if;
  if p_customer_type not in ('walk_in','distributor','mobile_stockist','branch_operator','manager') then
    raise exception 'Invalid customer price category' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Order must contain between 1 and 100 item lines' using errcode = '22023';
  end if;

  v_order_id := gen_random_uuid();
  v_order_number := 'FD-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.front_desk_pos_orders(id,order_number,created_by,customer_type,customer_name,total_amount)
  values(v_order_id,v_order_number,v_user,p_customer_type,nullif(trim(p_customer_name),''),0);

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_code := v_item->>'product_code';
    if (v_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'Invalid item quantity' using errcode = '22023';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 10000 then
      raise exception 'Item quantity is outside the allowed range' using errcode = '22023';
    end if;
    select product_name,
      case p_customer_type
        when 'walk_in' then walk_in_price
        when 'distributor' then distributor_price
        when 'mobile_stockist' then mobile_stockist_price
        when 'branch_operator' then branch_operator_price
        when 'manager' then manager_price
      end
    into v_name,v_price
    from public.front_desk_pos_prices
    where product_code = v_code and is_active = true;
    if not found then raise exception 'Unknown or inactive product: %',v_code using errcode = '22023'; end if;
    insert into public.front_desk_pos_order_items(order_id,product_code,product_name,quantity,unit_price,line_total)
    values(v_order_id,v_code,v_name,v_qty,v_price,v_price*v_qty);
    v_total := v_total + (v_price*v_qty);
  end loop;

  update public.front_desk_pos_orders set total_amount=v_total where id=v_order_id;
  return query select v_order_id,v_order_number,v_total;
end;
$$;

revoke all on function public.front_desk_create_pos_order(text,text,jsonb) from public, anon;
grant execute on function public.front_desk_create_pos_order(text,text,jsonb) to authenticated;
commit;
