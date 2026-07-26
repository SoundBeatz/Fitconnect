-- FitConnect Combination Deals product-schema compatibility.
-- Production stores SKU in specifications while older deal code expects products.sku.

begin;

alter table public.products
  add column if not exists sku text;

update public.products
set sku = nullif(trim(coalesce(specifications->>'SKU', specifications->>'sku')), '')
where sku is null
  and nullif(trim(coalesce(specifications->>'SKU', specifications->>'sku')), '') is not null;

create index if not exists products_sku_search_idx
  on public.products (lower(sku));

create or replace function public.commerce_products_sync_sku()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if nullif(trim(coalesce(new.sku,'')), '') is null then
    new.sku := nullif(trim(coalesce(new.specifications->>'SKU', new.specifications->>'sku')), '');
  end if;
  return new;
end
$$;

drop trigger if exists commerce_products_sync_sku on public.products;
create trigger commerce_products_sync_sku
before insert or update of sku, specifications on public.products
for each row execute function public.commerce_products_sync_sku();

create or replace function public.commerce_search_products_for_bundle(
  p_query text,
  p_limit integer default 12
)
returns table(
  id uuid,
  name text,
  sku text,
  price numeric,
  purchase_price numeric,
  brand text,
  category text
)
language sql
stable
security definer
set search_path=public
as $$
  select
    p.id,
    p.name,
    coalesce(nullif(p.sku,''), nullif(p.specifications->>'SKU',''), nullif(p.specifications->>'sku','')),
    p.price,
    p.purchase_price,
    coalesce(p.brand,''),
    coalesce(p.category,'')
  from public.products p
  where p.status <> 'archived'
    and length(trim(coalesce(p_query,''))) >= 3
    and (
      p.name ilike '%'||trim(p_query)||'%'
      or coalesce(p.sku,'') ilike '%'||trim(p_query)||'%'
      or coalesce(p.specifications->>'SKU','') ilike '%'||trim(p_query)||'%'
      or coalesce(p.specifications->>'sku','') ilike '%'||trim(p_query)||'%'
      or coalesce(p.brand,'') ilike '%'||trim(p_query)||'%'
      or coalesce(p.category,'') ilike '%'||trim(p_query)||'%'
    )
  order by case when p.name ilike trim(p_query)||'%' then 0 else 1 end, p.name
  limit greatest(1,least(coalesce(p_limit,12),50));
$$;

revoke all on function public.commerce_search_products_for_bundle(text,integer) from public,anon;
grant execute on function public.commerce_search_products_for_bundle(text,integer) to authenticated,service_role;

notify pgrst,'reload schema';
commit;
