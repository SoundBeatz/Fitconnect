-- Product catalogue validation v1
-- Enforce canonical product invariants at the database boundary.

do $$ begin
  alter table public.products add constraint products_name_not_blank check (btrim(name) <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_slug_not_blank check (btrim(slug) <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_brand_not_blank check (btrim(brand) <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_category_not_blank check (btrim(category) <> '');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_price_nonnegative check (price >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_stock_nonnegative check (stock >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_vat_supported check (vat in (9,21));
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
