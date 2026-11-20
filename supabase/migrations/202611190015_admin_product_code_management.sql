-- Admin product-code monitoring (read-only).
-- Shows issuance and redemption lifecycle metadata without exposing plaintext codes or hashes.

begin;

create or replace function public.get_admin_product_code_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.member_profiles mp
    where mp.id = auth.uid()
      and mp.role = 'admin'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'total_codes', count(*)::bigint,
      'issued_codes', count(*) filter (where pc.status = 'issued')::bigint,
      'redeemed_codes', count(*) filter (where pc.status = 'redeemed')::bigint,
      'void_codes', count(*) filter (where pc.status = 'void')::bigint
    )
    from public.product_codes pc
  );
end;
$$;

create or replace function public.get_admin_product_codes(
  p_search text default null,
  p_status text default null,
  p_product_code text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  product_code text,
  product_name text,
  prefix text,
  serial_number text,
  product_pv numeric,
  commissionable boolean,
  status text,
  issued_by uuid,
  issued_by_name text,
  issued_by_member_number text,
  issued_at timestamptz,
  redeemed_by uuid,
  redeemed_by_name text,
  redeemed_by_member_number text,
  redeemed_at timestamptz,
  purchase_reference text,
  redemption_id uuid,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.member_profiles mp
    where mp.id = auth.uid()
      and mp.role = 'admin'::public.amanah_role
      and mp.account_status = 'active'
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_status is not null and p_status not in ('issued', 'redeemed', 'void') then
    raise exception 'Invalid product-code status';
  end if;

  return query
  with filtered as (
    select
      pc.id,
      pc.product_code,
      pc.product_name,
      pc.prefix,
      pc.serial_number::text as serial_number,
      pc.product_pv,
      pc.commissionable,
      pc.status,
      pc.issued_by,
      issuer.full_name::text as issued_by_name,
      issuer.member_number::text as issued_by_member_number,
      pc.issued_at,
      pc.redeemed_by,
      redeemer.full_name::text as redeemed_by_name,
      redeemer.member_number::text as redeemed_by_member_number,
      pc.redeemed_at,
      p.purchase_reference::text as purchase_reference,
      pcr.id as redemption_id
    from public.product_codes pc
    left join public.member_profiles issuer on issuer.id = pc.issued_by
    left join public.member_profiles redeemer on redeemer.id = pc.redeemed_by
    left join public.purchases p on p.id = pc.purchase_id
    left join public.product_code_redemptions pcr on pcr.product_code_id = pc.id
    where (p_status is null or pc.status = p_status)
      and (p_product_code is null or pc.product_code = lower(trim(p_product_code)))
      and (
        nullif(trim(p_search), '') is null
        or pc.product_name ilike '%' || trim(p_search) || '%'
        or pc.product_code ilike '%' || trim(p_search) || '%'
        or pc.prefix ilike '%' || trim(p_search) || '%'
        or pc.serial_number::text ilike '%' || trim(p_search) || '%'
        or issuer.full_name ilike '%' || trim(p_search) || '%'
        or issuer.member_number ilike '%' || trim(p_search) || '%'
        or redeemer.full_name ilike '%' || trim(p_search) || '%'
        or redeemer.member_number ilike '%' || trim(p_search) || '%'
      )
  )
  select f.*, count(*) over() as total_count
  from filtered f
  order by f.issued_at desc, f.id desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_admin_product_code_summary() from public, anon;
revoke all on function public.get_admin_product_codes(text, text, text, integer, integer) from public, anon;
grant execute on function public.get_admin_product_code_summary() to authenticated;
grant execute on function public.get_admin_product_codes(text, text, text, integer, integer) to authenticated;

commit;
