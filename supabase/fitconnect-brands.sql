-- FitConnect brand catalogue. Public visitors may read active brands; only admins may write.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  website text,
  address text,
  postal_code text,
  city text,
  country text,
  status text not null default 'active' check (status in ('active','draft','archived')),
  featured boolean not null default false,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brands enable row level security;

drop policy if exists "Public can view active brands" on public.brands;
create policy "Public can view active brands" on public.brands for select to public
using (status = 'active' or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can create brands" on public.brands;
create policy "Admins can create brands" on public.brands for insert to authenticated
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update brands" on public.brands;
create policy "Admins can update brands" on public.brands for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can delete brands" on public.brands;
create policy "Admins can delete brands" on public.brands for delete to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index if not exists brands_status_order_idx on public.brands(status, featured desc, display_order, name);
grant select on public.brands to anon, authenticated;
grant insert, update, delete on public.brands to authenticated;

alter table public.brands add column if not exists address text;
alter table public.brands add column if not exists postal_code text;
alter table public.brands add column if not exists city text;
alter table public.brands add column if not exists country text;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null unique, contact_name text,
  email text, phone text, address text, postal_code text, city text, country text,
  website text, notes text, status text not null default 'active' check (status in ('active','draft','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
drop policy if exists "Admins manage suppliers" on public.suppliers;
create policy "Admins manage suppliers" on public.suppliers for all to authenticated
using (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'))
with check (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
grant select, insert, update, delete on public.suppliers to authenticated;

create table if not exists public.platform_modules (
  module_key text primary key,
  name text not null,
  description text not null default '',
  enabled boolean not null default false,
  route text,
  accent_color text not null default '#f36f21',
  surface_style text not null default 'light',
  settings jsonb not null default '{}'::jsonb,
  display_order integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.platform_modules enable row level security;
drop policy if exists "Public can read platform modules" on public.platform_modules;
create policy "Public can read platform modules" on public.platform_modules for select to public using (true);
drop policy if exists "Admins manage platform modules" on public.platform_modules;
create policy "Admins manage platform modules" on public.platform_modules for all to authenticated
using (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'))
with check (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
grant select on public.platform_modules to anon, authenticated;
grant insert, update, delete on public.platform_modules to authenticated;
insert into public.platform_modules(module_key,name,description,enabled,route,accent_color,surface_style,display_order) values
('commerce','Commerce Shop','Productcatalogus, winkelmand en checkout.',true,'/shop/','#f36f21','light',10),
('nutrition','Nutrition Shop','Gezonde voeding en supplementen als afzonderlijke winkelmodule.',false,'/nutrition/','#245c4c','natural',20),
('rewards','FitCoins & FitKado','Beloningen sparen en inwisselen.',false,'/rewards/','#e0a51b','premium',30)
on conflict (module_key) do nothing;
