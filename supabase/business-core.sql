create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  kvk_number text,
  vat_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.organization_settings enable row level security;

create or replace function public.is_organization_member(org_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid() and m.status='active');
$$;

create policy "members read organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "members read memberships" on public.organization_members for select using (user_id=auth.uid() or public.is_organization_member(organization_id));
create policy "members read workspaces" on public.workspaces for select using (public.is_organization_member(organization_id));
create policy "members read settings" on public.organization_settings for select using (public.is_organization_member(organization_id));
create policy "managers update settings" on public.organization_settings for all using (exists(select 1 from public.organization_members m where m.organization_id=organization_settings.organization_id and m.user_id=auth.uid() and m.status='active' and m.role in ('manager','admin','owner'))) with check (exists(select 1 from public.organization_members m where m.organization_id=organization_settings.organization_id and m.user_id=auth.uid() and m.status='active' and m.role in ('manager','admin','owner')));