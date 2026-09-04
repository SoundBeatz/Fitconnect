create table if not exists public.body_scan_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(), source_type text not null default 'manual' check (source_type in ('manual','device','import','calculated')),
  provider text, provider_reference text, height_cm numeric, weight_kg numeric, bmi numeric, body_fat_pct numeric, fat_mass_kg numeric,
  lean_mass_kg numeric, skeletal_muscle_mass_kg numeric, body_water_pct numeric, visceral_fat numeric, bmr_kcal numeric, phase_angle numeric,
  neck_cm numeric, waist_cm numeric, abdomen_cm numeric, hip_cm numeric, waist_height_ratio numeric, waist_hip_ratio numeric,
  confidence_score integer not null default 0 check (confidence_score between 0 and 100), is_baseline boolean not null default false,
  provenance jsonb not null default '{}'::jsonb, notes text, created_at timestamptz not null default now()
);
create table if not exists public.body_scan_segments (
  id uuid primary key default gen_random_uuid(), snapshot_id uuid not null references public.body_scan_snapshots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, region text not null check (region in ('left_arm','right_arm','trunk','left_leg','right_leg')),
  lean_mass_kg numeric, fat_mass_kg numeric, fat_pct numeric, balance_ratio numeric, provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(snapshot_id, region)
);
create index if not exists body_scan_snapshots_user_measured_idx on public.body_scan_snapshots(user_id, measured_at desc);
create index if not exists body_scan_segments_snapshot_idx on public.body_scan_segments(snapshot_id);
alter table public.body_scan_snapshots enable row level security; alter table public.body_scan_segments enable row level security;
revoke all on public.body_scan_snapshots from anon; revoke all on public.body_scan_segments from anon;
grant select, insert, update on public.body_scan_snapshots to authenticated; grant select, insert, update on public.body_scan_segments to authenticated;
create policy "Users view own body scan snapshots" on public.body_scan_snapshots for select to authenticated using (auth.uid() = user_id);
create policy "Users create own body scan snapshots" on public.body_scan_snapshots for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own body scan snapshots" on public.body_scan_snapshots for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own body scan segments" on public.body_scan_segments for select to authenticated using (auth.uid() = user_id);
create policy "Users create own body scan segments" on public.body_scan_segments for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.body_scan_snapshots s where s.id=snapshot_id and s.user_id=auth.uid()));
create policy "Users update own body scan segments" on public.body_scan_segments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.body_scan_snapshots s where s.id=snapshot_id and s.user_id=auth.uid()));
