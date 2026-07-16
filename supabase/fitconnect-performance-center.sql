create table if not exists public.performance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text check (gender in ('male','female','other')),
  birth_date date,
  height_cm numeric(5,2) check (height_cm between 100 and 250),
  weight_kg numeric(6,2) check (weight_kg between 25 and 350),
  bodyfat_percent numeric(5,2) check (bodyfat_percent between 2 and 70),
  activity_level text not null default 'moderate' check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal text not null default 'maintain' check (goal in ('fat_loss','maintain','muscle_gain','performance')),
  resting_hr integer check (resting_hr between 30 and 130),
  max_hr integer check (max_hr between 100 and 230),
  updated_at timestamptz not null default now()
);

alter table public.performance_profiles enable row level security;

drop policy if exists "Users can view own performance profile" on public.performance_profiles;
create policy "Users can view own performance profile"
on public.performance_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own performance profile" on public.performance_profiles;
create policy "Users can create own performance profile"
on public.performance_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own performance profile" on public.performance_profiles;
create policy "Users can update own performance profile"
on public.performance_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.performance_profiles to authenticated;
