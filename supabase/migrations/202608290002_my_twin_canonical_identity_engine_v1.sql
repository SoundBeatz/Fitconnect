create table if not exists public.my_twin_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  avatar_id uuid not null references public.user_avatars(id) on delete cascade,
  identity_revision integer not null default 1 check (identity_revision > 0),
  source_sha256 text not null,
  prompt_revision text not null default 'canonical-v1',
  consistency_seed bigint not null default (floor(random() * 2147483647))::bigint,
  render_contract jsonb not null default jsonb_build_object(
    'pose','neutral_front',
    'camera','full_body_eye_level',
    'background','studio_neutral',
    'suit','fitconnect_performance_black',
    'lighting','premium_softbox',
    'identity_priority','maximum',
    'body_state','source'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (avatar_id)
);

create table if not exists public.my_twin_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  avatar_id uuid not null references public.user_avatars(id) on delete cascade,
  identity_profile_id uuid not null references public.my_twin_identity_profiles(id) on delete cascade,
  source_avatar_version integer not null check (source_avatar_version > 0),
  target_avatar_version integer check (target_avatar_version is null or target_avatar_version > 0),
  status text not null default 'queued' check (status in ('queued','awaiting_renderer','rendering','ready','failed','cancelled')),
  renderer text,
  renderer_job_id text,
  prompt_revision text not null default 'canonical-v1',
  parameters jsonb not null default '{}'::jsonb,
  output_path text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists my_twin_generation_jobs_user_created_idx
  on public.my_twin_generation_jobs (user_id, created_at desc);
create index if not exists my_twin_generation_jobs_avatar_created_idx
  on public.my_twin_generation_jobs (avatar_id, created_at desc);
create unique index if not exists my_twin_generation_jobs_one_active_idx
  on public.my_twin_generation_jobs (avatar_id)
  where status in ('queued','awaiting_renderer','rendering');

alter table public.my_twin_identity_profiles enable row level security;
alter table public.my_twin_generation_jobs enable row level security;

revoke all on public.my_twin_identity_profiles from anon, authenticated;
revoke all on public.my_twin_generation_jobs from anon, authenticated;
grant select on public.my_twin_identity_profiles to authenticated;
grant select on public.my_twin_generation_jobs to authenticated;
grant select, insert, update, delete on public.my_twin_identity_profiles to service_role;
grant select, insert, update, delete on public.my_twin_generation_jobs to service_role;

drop policy if exists "Users can view own My Twin identity profile" on public.my_twin_identity_profiles;
create policy "Users can view own My Twin identity profile"
on public.my_twin_identity_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view own My Twin generation jobs" on public.my_twin_generation_jobs;
create policy "Users can view own My Twin generation jobs"
on public.my_twin_generation_jobs for select to authenticated
using (user_id = auth.uid());