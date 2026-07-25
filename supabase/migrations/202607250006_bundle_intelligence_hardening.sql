-- FitConnect Commerce — Bundle Intelligence hardening
-- Splits trigger handlers per relation, restricts RPC execution and adds dashboard summary RPCs.

create or replace function public.commerce_bundle_metrics_on_bundle_change()
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

create or replace function public.commerce_bundle_metrics_on_item_change()
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
for each row execute function public.commerce_bundle_metrics_on_bundle_change();

drop trigger if exists commerce_bundle_metrics_on_item on public.commerce_bundle_items;
create trigger commerce_bundle_metrics_on_item
after insert or update or delete on public.commerce_bundle_items
for each row execute function public.commerce_bundle_metrics_on_item_change();

drop function if exists public.commerce_bundle_metrics_touch();

revoke all on function public.commerce_refresh_bundle_metrics(uuid) from public;
revoke all on function public.commerce_refresh_all_bundle_metrics() from public;
grant execute on function public.commerce_refresh_bundle_metrics(uuid) to authenticated, service_role;
grant execute on function public.commerce_refresh_all_bundle_metrics() to authenticated, service_role;

create or replace function public.commerce_bundle_intelligence_summary()
returns table (
  total_bundles bigint,
  active_bundles bigint,
  healthy_bundles bigint,
  attention_bundles bigint,
  critical_bundles bigint,
  total_stock_capacity bigint,
  potential_revenue numeric,
  potential_gross_margin numeric,
  average_health_score numeric,
  average_margin_percent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where b.status = 'active')::bigint,
    count(*) filter (where m.health_status in ('excellent','healthy'))::bigint,
    count(*) filter (where m.health_status in ('attention','warning'))::bigint,
    count(*) filter (where m.health_status = 'critical')::bigint,
    coalesce(sum(m.stock_capacity), 0)::bigint,
    coalesce(sum(m.potential_revenue), 0),
    coalesce(sum(m.potential_gross_margin), 0),
    coalesce(round(avg(m.health_score), 1), 0),
    coalesce(round(avg(m.gross_margin_percent), 1), 0)
  from public.commerce_bundles b
  left join public.commerce_bundle_metrics m on m.bundle_id = b.id
  where b.organization_id = public.commerce_current_organization();
$$;

revoke all on function public.commerce_bundle_intelligence_summary() from public;
grant execute on function public.commerce_bundle_intelligence_summary() to authenticated, service_role;

create or replace view public.commerce_bundle_intelligence
with (security_invoker = true)
as
select
  b.id as bundle_id,
  b.organization_id,
  b.name,
  b.internal_name,
  b.slug,
  b.category,
  b.brand,
  b.status,
  b.bundle_price,
  b.featured,
  b.updated_at as bundle_updated_at,
  m.regular_sales_value,
  m.total_purchase_cost,
  m.customer_saving,
  m.customer_saving_percent,
  m.gross_margin,
  m.gross_margin_percent,
  m.stock_capacity,
  m.potential_revenue,
  m.potential_gross_margin,
  m.health_score,
  m.health_status,
  m.warnings,
  m.calculated_at
from public.commerce_bundles b
left join public.commerce_bundle_metrics m on m.bundle_id = b.id
where b.organization_id = public.commerce_current_organization();

grant select on public.commerce_bundle_intelligence to authenticated, service_role;

notify pgrst, 'reload schema';
