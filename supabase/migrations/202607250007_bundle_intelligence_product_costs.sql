-- FitConnect Commerce — Bundle Intelligence product cost controls
-- Adds safe cost-price management primitives and stock timestamps without changing public shop pricing.
-- Compatible with both the current global products table and a future organization-scoped products table.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_purchase_price_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_purchase_price_nonnegative
      check (purchase_price is null or purchase_price >= 0) not valid;
  end if;
end;
$$;

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
  v_has_organization_id boolean;
begin
  if p_purchase_price is not null and p_purchase_price < 0 then
    raise exception 'Inkoopprijs mag niet negatief zijn';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'organization_id'
  ) into v_has_organization_id;

  if v_has_organization_id then
    v_organization_id := public.commerce_current_organization();
    if v_organization_id is null then
      raise exception 'Geen organisatiecontext beschikbaar';
    end if;

    execute
      'update public.products
       set purchase_price = $1, updated_at = now()
       where id = $2 and organization_id = $3
       returning *'
      into v_product
      using p_purchase_price, p_product_id, v_organization_id;
  else
    update public.products
    set purchase_price = p_purchase_price,
        updated_at = now()
    where id = p_product_id
    returning * into v_product;
  end if;

  if not found then
    raise exception 'Product niet gevonden binnen de beschikbare productcontext';
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
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_organization_id uuid;
  v_has_organization_id boolean;
  v_sql text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'organization_id'
  ) into v_has_organization_id;

  v_sql :=
    'select
       count(*) filter (where p.status = ''active'')::bigint,
       count(*) filter (where p.status = ''active'' and p.purchase_price is not null)::bigint,
       count(*) filter (where p.status = ''active'' and p.purchase_price is null)::bigint,
       case
         when count(*) filter (where p.status = ''active'') = 0 then 100::numeric
         else round(
           count(*) filter (where p.status = ''active'' and p.purchase_price is not null)::numeric
           / count(*) filter (where p.status = ''active'')::numeric * 100,
           2
         )
       end
     from public.products p';

  if v_has_organization_id then
    v_organization_id := public.commerce_current_organization();
    if v_organization_id is null then
      raise exception 'Geen organisatiecontext beschikbaar';
    end if;
    v_sql := v_sql || ' where p.organization_id = $1';
    return query execute v_sql using v_organization_id;
  else
    return query execute v_sql;
  end if;
end;
$$;

revoke all on function public.commerce_bundle_cost_coverage_summary() from public;
grant execute on function public.commerce_bundle_cost_coverage_summary() to authenticated, service_role;

comment on function public.commerce_set_product_purchase_price(uuid, numeric) is
  'Stores an internal purchase price for one product and uses organization scoping automatically when the products table supports it.';

comment on function public.commerce_bundle_cost_coverage_summary() is
  'Returns purchase-price data coverage for active products and uses organization scoping automatically when available.';

notify pgrst, 'reload schema';