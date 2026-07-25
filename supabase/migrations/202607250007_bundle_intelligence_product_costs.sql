-- FitConnect Commerce — Bundle Intelligence product cost controls
-- Adds safe cost-price management primitives and stock timestamps without changing public shop pricing.

alter table public.products
  add constraint products_purchase_price_nonnegative
  check (purchase_price is null or purchase_price >= 0) not valid;

alter table public.products
  validate constraint products_purchase_price_nonnegative;

create or replace function public.commerce_products_stock_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stock is distinct from old.stock then
    new.stock_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_products_stock_timestamp on public.products;
create trigger commerce_products_stock_timestamp
before update of stock on public.products
for each row execute function public.commerce_products_stock_timestamp();

update public.products
set stock_updated_at = coalesce(stock_updated_at, updated_at, created_at, now())
where stock_updated_at is null;

create or replace function public.commerce_set_product_purchase_price(
  p_product_id uuid,
  p_purchase_price numeric
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_organization_id uuid;
begin
  if p_purchase_price is not null and p_purchase_price < 0 then
    raise exception 'Inkoopprijs mag niet negatief zijn';
  end if;

  v_organization_id := public.commerce_current_organization();
  if v_organization_id is null then
    raise exception 'Geen organisatiecontext beschikbaar';
  end if;

  update public.products
  set purchase_price = p_purchase_price,
      updated_at = now()
  where id = p_product_id
    and organization_id = v_organization_id
  returning * into v_product;

  if not found then
    raise exception 'Product niet gevonden binnen de huidige organisatie';
  end if;

  return v_product;
end;
$$;

revoke all on function public.commerce_set_product_purchase_price(uuid, numeric) from public;
grant execute on function public.commerce_set_product_purchase_price(uuid, numeric) to authenticated, service_role;

create or replace function public.commerce_bundle_cost_coverage_summary()
returns table (
  active_products bigint,
  products_with_purchase_price bigint,
  products_missing_purchase_price bigint,
  coverage_percent numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where p.status = 'active')::bigint,
    count(*) filter (where p.status = 'active' and p.purchase_price is not null)::bigint,
    count(*) filter (where p.status = 'active' and p.purchase_price is null)::bigint,
    case
      when count(*) filter (where p.status = 'active') = 0 then 100::numeric
      else round(
        count(*) filter (where p.status = 'active' and p.purchase_price is not null)::numeric
        / count(*) filter (where p.status = 'active')::numeric * 100,
        2
      )
    end
  from public.products p
  where p.organization_id = public.commerce_current_organization();
$$;

revoke all on function public.commerce_bundle_cost_coverage_summary() from public;
grant execute on function public.commerce_bundle_cost_coverage_summary() to authenticated, service_role;

comment on function public.commerce_set_product_purchase_price(uuid, numeric) is
  'Stores an internal purchase price for one product in the current organization and triggers bundle metric recalculation.';

comment on function public.commerce_bundle_cost_coverage_summary() is
  'Returns purchase-price data coverage for active products in the current organization.';

notify pgrst, 'reload schema';
