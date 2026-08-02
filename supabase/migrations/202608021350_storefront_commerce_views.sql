begin;

create or replace view public.v_storefront_brands
with (security_invoker = true)
as
select id, name, slug, logo_url
from public.brands
where status = 'active';

create or replace view public.v_storefront_inventory
with (security_invoker = true)
as
select id as product_id, greatest(coalesce(stock, 0), 0)::numeric as stock_quantity, status
from public.products
where status = 'active';

grant select on public.v_storefront_brands to anon, authenticated;
grant select on public.v_storefront_inventory to anon, authenticated;

comment on view public.v_storefront_brands is 'Public storefront brand DTO. Internal brand fields are intentionally excluded.';
comment on view public.v_storefront_inventory is 'Public storefront availability backing DTO. Warehouse and internal logistics fields are intentionally excluded.';

commit;
