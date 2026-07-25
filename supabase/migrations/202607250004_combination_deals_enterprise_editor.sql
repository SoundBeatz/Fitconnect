-- Enterprise Bundle Engine Sprint 1 metadata.
-- Additive and idempotent: existing deals, orders and invoice lines remain intact.

alter table public.commerce_bundles
  add column if not exists internal_name text,
  add column if not exists category text,
  add column if not exists brand text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text,
  add column if not exists installation_included boolean not null default false,
  add column if not exists delivery_included boolean not null default false,
  add column if not exists warranty_text text,
  add column if not exists stock_check_required boolean not null default true;

create index if not exists commerce_bundles_category_status_idx
  on public.commerce_bundles (category, status, featured desc, display_order, created_at desc);

create index if not exists commerce_bundles_brand_status_idx
  on public.commerce_bundles (brand, status, featured desc, display_order, created_at desc);

notify pgrst, 'reload schema';
