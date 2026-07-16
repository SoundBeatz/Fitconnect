alter table public.performance_profiles
  add column if not exists neck_cm numeric(5,2) check (neck_cm between 20 and 80),
  add column if not exists waist_cm numeric(5,2) check (waist_cm between 40 and 250),
  add column if not exists abdomen_cm numeric(5,2) check (abdomen_cm between 40 and 250),
  add column if not exists hip_cm numeric(5,2) check (hip_cm between 50 and 250),
  add column if not exists measurement_method text not null default 'quick' check (measurement_method in ('quick','navy','device')),
  add column if not exists confidence_score integer not null default 45 check (confidence_score between 0 and 100),
  add column if not exists scan_completed_at timestamptz;

create table if not exists public.body_scan_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scan_mode text not null default 'quick' check (scan_mode in ('quick','advanced')),
  current_step integer not null default 0 check (current_step between 0 and 20),
  completed boolean not null default false,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2),
  bodyfat_percent numeric(5,2),
  neck_cm numeric(5,2),
  waist_cm numeric(5,2),
  abdomen_cm numeric(5,2),
  hip_cm numeric(5,2),
  bmi numeric(5,2),
  method text not null default 'quick' check (method in ('quick','navy','device')),
  confidence_score integer not null default 45 check (confidence_score between 0 and 100),
  is_baseline boolean not null default false,
  notes text
);

alter table public.body_scan_progress enable row level security;
alter table public.body_measurements enable row level security;

drop policy if exists "Users manage own scan progress" on public.body_scan_progress;
create policy "Users manage own scan progress" on public.body_scan_progress for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users view own body measurements" on public.body_measurements;
create policy "Users view own body measurements" on public.body_measurements for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users create own body measurements" on public.body_measurements;
create policy "Users create own body measurements" on public.body_measurements for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own body measurements" on public.body_measurements;
create policy "Users update own body measurements" on public.body_measurements for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.body_scan_progress to authenticated;
grant select, insert, update on public.body_measurements to authenticated;