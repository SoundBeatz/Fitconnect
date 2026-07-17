create extension if not exists pgcrypto;

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  parent_id uuid references public.catalog_categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  position integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  category_id uuid references public.catalog_categories(id) on delete set null,
  name text not null,
  slug text not null default '',
  sku text,
  description text,
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  type text not null default 'physical' check (type in ('physical','service','digital')),
  price numeric(14,2) not null default 0,
  compare_at_price numeric(14,2),
  cost_price numeric(14,2),
  currency char(3) not null default 'EUR',
  tax_code text not null default 'standard',
  track_inventory boolean not null default true,
  barcode text,
  weight numeric(12,3),
  unit text not null default 'piece',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists catalog_products_org_sku_uq on public.catalog_products(organization_id,sku) where sku is not null and deleted_at is null;
create index if not exists catalog_products_search_idx on public.catalog_products using gin (to_tsvector('simple',coalesce(name,'')||' '||coalesce(sku,'')||' '||coalesce(barcode,'')));

create table if not exists public.catalog_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  name text not null default 'Standaard',
  sku text,
  barcode text,
  price_delta numeric(14,2) not null default 0,
  cost_price numeric(14,2),
  options jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.catalog_product_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  url text not null,
  alt_text text,
  type text not null default 'image',
  position integer not null default 0,
  is_primary boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_tax_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name text not null,
  country char(2) not null default 'NL',
  rate numeric(6,3) not null default 0,
  prices_include_tax boolean not null default false,
  active boolean not null default true,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, country)
);

alter table public.catalog_categories enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_variants enable row level security;
alter table public.catalog_product_media enable row level security;
alter table public.catalog_tax_rates enable row level security;

-- Uses the organization membership table introduced by business-core.sql.
do $$
declare t text; begin
  foreach t in array array['catalog_categories','catalog_products','catalog_variants','catalog_product_media','catalog_tax_rates'] loop
    execute format('drop policy if exists %I_tenant_access on public.%I',t,t);
    execute format('create policy %I_tenant_access on public.%I for all using (exists (select 1 from public.business_memberships m where m.organization_id = %I.organization_id and m.user_id = auth.uid() and m.status = ''active'')) with check (exists (select 1 from public.business_memberships m where m.organization_id = %I.organization_id and m.user_id = auth.uid() and m.status = ''active''))',t,t,t,t);
  end loop;
end $$;