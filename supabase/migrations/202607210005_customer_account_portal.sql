-- FitConnect customer account portal: profile details and delivery addresses.
-- Authentication secrets, passwords and MFA factors remain in Supabase Auth.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_date date,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country_code text not null default 'NL',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Bezorgadres',
  recipient_name text not null,
  address_line1 text not null,
  address_line2 text,
  postal_code text not null,
  city text not null,
  country_code text not null default 'NL',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_delivery_addresses_user_idx
  on public.customer_delivery_addresses (user_id, created_at desc);

create unique index if not exists customer_delivery_addresses_one_default_idx
  on public.customer_delivery_addresses (user_id)
  where is_default;

alter table public.profiles enable row level security;
alter table public.customer_delivery_addresses enable row level security;

drop policy if exists "Customers can read own profile" on public.profiles;
create policy "Customers can read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "Customers can update own profile" on public.profiles;
create policy "Customers can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Customers can read own delivery addresses" on public.customer_delivery_addresses;
create policy "Customers can read own delivery addresses"
on public.customer_delivery_addresses for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Customers can create own delivery addresses" on public.customer_delivery_addresses;
create policy "Customers can create own delivery addresses"
on public.customer_delivery_addresses for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Customers can update own delivery addresses" on public.customer_delivery_addresses;
create policy "Customers can update own delivery addresses"
on public.customer_delivery_addresses for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Customers can delete own delivery addresses" on public.customer_delivery_addresses;
create policy "Customers can delete own delivery addresses"
on public.customer_delivery_addresses for delete to authenticated
using (user_id = auth.uid());

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (
  first_name, last_name, full_name, birth_date, phone,
  address_line1, address_line2, postal_code, city, country_code, updated_at
) on public.profiles to authenticated;
grant select, insert, update, delete on public.customer_delivery_addresses to authenticated;

notify pgrst, 'reload schema';
