-- FitConnect Commerce — Bundle Intelligence Sprint 2.1 smoke test
-- Safe to run after migrations 202607250005 through 202607250007.
-- This script performs read-only structural and consistency assertions.

begin;

do $$
declare
  v_invalid_metrics integer;
  v_missing_metrics integer;
  v_duplicate_metrics integer;
  v_missing_triggers text[];
  v_missing_functions text[];
begin
  if to_regclass('public.commerce_bundle_metrics') is null then
    raise exception 'Smoke test failed: public.commerce_bundle_metrics does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'purchase_price'
      and data_type = 'numeric'
  ) then
    raise exception 'Smoke test failed: products.purchase_price is missing or has an unexpected type';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_updated_at'
  ) then
    raise exception 'Smoke test failed: products.stock_updated_at is missing';
  end if;

  select array_agg(required_name)
  into v_missing_functions
  from (
    values
      ('commerce_refresh_bundle_metrics'),
      ('commerce_refresh_all_bundle_metrics'),
      ('commerce_bundle_intelligence_summary'),
      ('commerce_set_product_purchase_price'),
      ('commerce_bundle_cost_coverage_summary')
  ) required(required_name)
  where to_regprocedure('public.' || required_name || case
    when required_name = 'commerce_refresh_bundle_metrics' then '(uuid)'
    when required_name = 'commerce_set_product_purchase_price' then '(uuid,numeric)'
    else '()'
  end) is null;

  if v_missing_functions is not null then
    raise exception 'Smoke test failed: required functions missing: %', array_to_string(v_missing_functions, ', ');
  end if;

  select array_agg(required_name)
  into v_missing_triggers
  from (
    values
      ('commerce_bundle_metrics_on_bundle'),
      ('commerce_bundle_metrics_on_item'),
      ('commerce_bundle_metrics_on_product'),
      ('commerce_products_stock_timestamp')
  ) required(required_name)
  where not exists (
    select 1
    from pg_trigger
    where tgname = required_name
      and not tgisinternal
  );

  if v_missing_triggers is not null then
    raise exception 'Smoke test failed: required triggers missing: %', array_to_string(v_missing_triggers, ', ');
  end if;

  select count(*)
  into v_invalid_metrics
  from public.commerce_bundle_metrics
  where health_score < 0
     or health_score > 100
     or health_status not in ('excellent','healthy','attention','warning','critical')
     or stock_capacity < 0
     or regular_sales_value < 0
     or bundle_sales_value < 0
     or customer_saving < 0
     or potential_revenue < 0;

  if v_invalid_metrics > 0 then
    raise exception 'Smoke test failed: % invalid bundle metric rows found', v_invalid_metrics;
  end if;

  select count(*)
  into v_duplicate_metrics
  from (
    select bundle_id
    from public.commerce_bundle_metrics
    group by bundle_id
    having count(*) > 1
  ) duplicates;

  if v_duplicate_metrics > 0 then
    raise exception 'Smoke test failed: duplicate metric rows exist for % bundles', v_duplicate_metrics;
  end if;

  select count(*)
  into v_missing_metrics
  from public.commerce_bundles b
  where exists (
    select 1
    from public.commerce_bundle_items i
    where i.bundle_id = b.id
  )
  and not exists (
    select 1
    from public.commerce_bundle_metrics m
    where m.bundle_id = b.id
  );

  if v_missing_metrics > 0 then
    raise exception 'Smoke test failed: % populated bundles have no metrics row', v_missing_metrics;
  end if;

  if exists (
    select 1
    from public.products
    where purchase_price < 0
  ) then
    raise exception 'Smoke test failed: negative product purchase prices found';
  end if;

  perform public.commerce_bundle_intelligence_summary();
  perform public.commerce_bundle_cost_coverage_summary();

  raise notice 'Bundle Intelligence Sprint 2.1 smoke test passed';
end $$;

rollback;
