create table if not exists public.performance_intakes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text,
  dream_statement text,
  occupation_type text,
  daily_activity text,
  fitness_self_rating text,
  training_experience text,
  training_location text,
  session_minutes integer check (session_minutes between 10 and 180),
  training_days integer check (training_days between 1 and 7),
  motivation_reasons text[] not null default '{}',
  limitations text[] not null default '{}',
  health_flags text[] not null default '{}',
  confidence_barriers text[] not null default '{}',
  performance_profile text,
  start_level text,
  recommended_impact text,
  recommended_days integer,
  recommended_minutes integer,
  safety_review_required boolean not null default false,
  completed boolean not null default false,
  current_step integer not null default 0 check (current_step between 0 and 20),
  draft jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.performance_intakes enable row level security;

drop policy if exists "Users manage own performance intake" on public.performance_intakes;
create policy "Users manage own performance intake"
on public.performance_intakes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.performance_intakes to authenticated;