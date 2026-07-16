create table if not exists public.training_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location_type text not null default 'home' check (location_type in ('home','commercial','studio','travel','other')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid references public.training_locations(id) on delete cascade,
  equipment_key text not null,
  equipment_name text not null,
  category text not null,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  warranty_until date,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, location_id, equipment_key)
);

alter table public.training_locations enable row level security;
alter table public.user_equipment enable row level security;

drop policy if exists "Users manage own training locations" on public.training_locations;
create policy "Users manage own training locations" on public.training_locations for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own equipment" on public.user_equipment;
create policy "Users manage own equipment" on public.user_equipment for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.training_locations to authenticated;
grant select, insert, update, delete on public.user_equipment to authenticated;