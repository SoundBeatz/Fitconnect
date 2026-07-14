create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  postcode text,
  room_type text,
  room_length text,
  room_width text,
  room_height text,
  users text,
  budget text,
  goals text[] not null default '{}',
  style text,
  timeline text,
  notes text,
  source text not null default 'website-configurator',
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_email_idx on public.leads (lower(email));

alter table public.leads enable row level security;

-- Website submissions use the server-only service role key.
-- No public insert/select policy is intentionally created.
