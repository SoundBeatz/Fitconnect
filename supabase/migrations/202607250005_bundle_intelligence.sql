-- FitConnect Commerce — Bundle Intelligence Sprint 2.1
-- Additive, idempotent and compatible with the existing combination-deals engine.

alter table public.products
  add column if not exists purchase_price numeric(12,2),
  add column if not exists stock_updated_at timestamptz;

comment on column public.products.purchase_price is
  'Internal purchase price excluding VAT. Used for margin intelligence and never exposed in the public shop.';

create table if not exists public.commerce_bundle_metrics (
  bundle_id uuid primary key references public.commerce_bundles(id) on delete cascade,
  organization_id uuid not null,
  regular_sales_value numeric(14,2) not null default 0,
  bundle_sales_value numeric(14,2) not null default 0,
  total_purchase_cost numeric(14,2) not null default 0,
  customer_saving numeric(14,2) not null default 0,
  customer_saving_percent numeric(8,2) not null default 0,
  gross_margin numeric(14,2) not null default 0,
  gross_margin_percent numeric(8,2) not null default 0,
  stock_capacity integer not null default 0,
  potential_revenue numeric(16,2) not null default 0,
  potential_gross_margin numeric(16,2) not null default 0,
  health_score integer not null default 0 check (health_score between 0 and 100),
  health_status text not null default 'critical' check (health_status in ('excellent','healthy','attention','warning','critical')),
  warnings jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commerce_bundle_metrics_org_health_idx
  on public.commerce_bundle_metrics (organization_id, health_score desc, calculated_at desc);

create index if not exists commerce_bundle_items_product_idx
  on public.commerce_bundle_items (product_id, bundle_id);

alter table public.commerce_bundle_metrics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'commerce_bundle_metrics'
      and policyname = 'commerce_bundle_metrics_current_org'
  ) then
    create policy commerce_bundle_metrics_current_org
      on public.commerce_bundle_metrics
      for all
      using (organization_id = public.commerce_current_organization())
      with check (organization_id = public.commerce_current_organization());
  end if;
end $$;

create or replace function public.commerce_refresh_bundle_metrics(p_bundle_id uuid)
returns public.commerce_bundle_metrics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bundle public.commerce_bundles%rowtype;
  v_regular numeric(14,2) := 0;
  v_cost numeric(14,2) := 0;
  v_capacity integer := 0;
  v_saving numeric(14,2) := 0;
  v_saving_pct numeric(8,2) := 0;
  v_margin numeric(14,2) := 0;
  v_margin_pct numeric(8,2) := 0;
  v_score integer := 100;
  v_status text := 'excellent';
  v_warnings jsonb := '[]'::jsonb;
  v_result public.commerce_bundle_metrics%rowtype;
begin
  select * into v_bundle from public.commerce_bundles where id = p_bundle_id;
  if not found then
    delete from public.commerce_bundle_metrics where bundle_id = p_bundle_id;
    return null;
  end if;

  select
    coalesce(sum(coalesce(p.price, 0) * i.quantity), 0),
    coalesce(sum(coalesce(p.purchase_price, 0) * i.quantity), 0),
    coalesce(min(floor(coalesce(p.stock, 0)::numeric / greatest(i.quantity, 1)))::integer, 0)
  into v_regular, v_cost, v_capacity
  from public.commerce_bundle_items i
  join public.products p on p.id = i.product_id
  where i.bundle_id = p_bundle_id;

  v_saving := greatest(0, v_regular - coalesce(v_bundle.bundle_price, 0));
  v_saving_pct := case when v_regular > 0 then round((v_saving / v_regular) * 100, 2) else 0 end;
  v_margin := coalesce(v_bundle.bundle_price, 0) - v_cost;
  v_margin_pct := case when coalesce(v_bundle.bundle_price, 0) > 0 then round((v_margin / v_bundle.bundle_price) * 100, 2) else 0 end;

  if v_capacity < 1 then
    v_score := v_score - 45;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','out_of_stock','severity','critical','message','Bundel is momenteel niet volledig leverbaar.'));
  elsif v_capacity <= 3 then
    v_score := v_score - 20;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','low_capacity','severity','warning','message',format('Nog %s complete bundels leverbaar.', v_capacity)));
  end if;

  if v_cost <= 0 then
    v_score := v_score - 15;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','missing_cost','severity','attention','message','Vul inkoopprijzen in om de marge betrouwbaar te berekenen.'));
  elsif v_margin < 0 then
    v_score := v_score - 50;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','negative_margin','severity','critical','message','De pakketprijs ligt onder de totale inkoopwaarde.'));
  elsif v_margin_pct < 15 then
    v_score := v_score - 25;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','low_margin','severity','warning','message','Brutomarge is lager dan 15%.'));
  elsif v_margin_pct < 25 then
    v_score := v_score - 10;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','margin_attention','severity','attention','message','Brutomarge is lager dan 25%.'));
  end if;

  if v_saving_pct > 35 then
    v_score := v_score - 10;
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','high_discount','severity','attention','message','De bundelkorting is hoger dan 35%. Controleer prijs en marge.'));
  end if;

  v_score := greatest(0, least(100, v_score));
  v_status := case
    when v_score >= 95 then 'excellent'
    when v_score >= 85 then 'healthy'
    when v_score >= 70 then 'attention'
    when v_score >= 50 then 'warning'
    else 'critical'
  end;

  insert into public.commerce_bundle_metrics (
    bundle_id, organization_id, regular_sales_value, bundle_sales_value,
    total_purchase_cost, customer_saving, customer_saving_percent,
    gross_margin, gross_margin_percent, stock_capacity,
    potential_revenue, potential_gross_margin, health_score,
    health_status, warnings, calculated_at, updated_at
  ) values (
    v_bundle.id, v_bundle.organization_id, v_regular, coalesce(v_bundle.bundle_price, 0),
    v_cost, v_saving, v_saving_pct, v_margin, v_margin_pct, v_capacity,
    coalesce(v_bundle.bundle_price, 0) * v_capacity, v_margin * v_capacity,
    v_score, v_status, v_warnings, now(), now()
  )
  on conflict (bundle_id) do update set
    organization_id = excluded.organization_id,
    regular_sales_value = excluded.regular_sales_value,
    bundle_sales_value = excluded.bundle_sales_value,
    total_purchase_cost = excluded.total_purchase_cost,
    customer_saving = excluded.customer_saving,
    customer_saving_percent = excluded.customer_saving_percent,
    gross_margin = excluded.gross_margin,
    gross_margin_percent = excluded.gross_margin_percent,
    stock_capacity = excluded.stock_capacity,
    potential_revenue = excluded.potential_revenue,
    potential_gross_margin = excluded.potential_gross_margin,
    health_score = excluded.health_score,
    health_status = excluded.health_status,
    warnings = excluded.warnings,
    calculated_at = excluded.calculated_at,
    updated_at = excluded.updated_at
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.commerce_refresh_all_bundle_metrics()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bundle_id uuid;
  v_count integer := 0;
begin
  for v_bundle_id in select id from public.commerce_bundles loop
    perform public.commerce_refresh_bundle_metrics(v_bundle_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.commerce_bundle_row_metrics_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.commerce_refresh_bundle_metrics(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function public.commerce_bundle_item_metrics_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.commerce_refresh_bundle_metrics(coalesce(new.bundle_id, old.bundle_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists commerce_bundle_metrics_on_bundle on public.commerce_bundles;
create trigger commerce_bundle_metrics_on_bundle
after insert or update of bundle_price, status on public.commerce_bundles
for each row execute function public.commerce_bundle_row_metrics_touch();

drop trigger if exists commerce_bundle_metrics_on_item on public.commerce_bundle_items;
create trigger commerce_bundle_metrics_on_item
after insert or update or delete on public.commerce_bundle_items
for each row execute function public.commerce_bundle_item_metrics_touch();

create or replace function public.commerce_product_bundle_metrics_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bundle_id uuid;
begin
  for v_bundle_id in
    select distinct bundle_id from public.commerce_bundle_items
    where product_id = coalesce(new.id, old.id)
  loop
    perform public.commerce_refresh_bundle_metrics(v_bundle_id);
  end loop;
  return coalesce(new, old);
end;
$$;

drop trigger if exists commerce_bundle_metrics_on_product on public.products;
create trigger commerce_bundle_metrics_on_product
after update of price, purchase_price, stock, status on public.products
for each row execute function public.commerce_product_bundle_metrics_touch();

select public.commerce_refresh_all_bundle_metrics();

notify pgrst, 'reload schema';