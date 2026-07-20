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
