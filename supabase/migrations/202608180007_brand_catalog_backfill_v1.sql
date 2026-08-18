-- Brand catalogue backfill v1
-- Centralize existing product.brand values in public.brands without rewriting product ownership.

insert into public.brands (name, slug, description, status, featured, display_order)
select
  source.name,
  source.slug,
  '',
  'active',
  false,
  100
from (
  select distinct on (lower(btrim(p.brand)))
    btrim(p.brand) as name,
    regexp_replace(
      regexp_replace(lower(btrim(p.brand)), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g'
    ) as slug
  from public.products p
  where btrim(coalesce(p.brand, '')) <> ''
  order by lower(btrim(p.brand)), btrim(p.brand)
) source
where not exists (
  select 1
  from public.brands b
  where lower(btrim(b.name)) = lower(source.name)
     or lower(btrim(b.slug)) = lower(source.slug)
);

notify pgrst, 'reload schema';
