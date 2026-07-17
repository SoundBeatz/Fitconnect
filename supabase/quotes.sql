create extension if not exists pgcrypto;

create table if not exists public.sales_quote_sequences (
  organization_id uuid not null,
  workspace_id uuid,
  year integer not null,
  prefix text not null default 'OFF',
  current_value bigint not null default 0,
  primary key (organization_id, workspace_id, year, prefix)
);

create table if not exists public.sales_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  quote_number text not null,
  customer_id uuid,
  contact_id uuid,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','rejected','expired','cancelled')),
  currency text not null default 'EUR',
  issued_at date not null default current_date,
  valid_until date,
  subject text not null default '',
  introduction text not null default '',
  terms text not null default '',
  notes text not null default '',
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  cost_total numeric(14,2) not null default 0,
  margin_amount numeric(14,2) not null default 0,
  margin_percent numeric(8,2) not null default 0,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  rejected_at timestamptz,
  expired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, quote_number)
);

create table if not exists public.sales_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sales_quotes(id) on delete cascade,
  organization_id uuid not null,
  workspace_id uuid,
  product_id uuid,
  variant_id uuid,
  description text not null default '',
  quantity numeric(14,3) not null default 0,
  unit_price numeric(14,4) not null default 0,
  discount_percent numeric(8,3) not null default 0,
  tax_percent numeric(8,3) not null default 0,
  net_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  cost_price numeric(14,4) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sales_quotes(id) on delete cascade,
  organization_id uuid not null,
  workspace_id uuid,
  version_number integer not null,
  snapshot jsonb not null,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (quote_id, version_number)
);

create table if not exists public.sales_quote_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sales_quotes(id) on delete cascade,
  organization_id uuid not null,
  workspace_id uuid,
  from_status text,
  to_status text not null,
  reason text,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create index if not exists sales_quotes_org_status_idx on public.sales_quotes(organization_id,status) where deleted_at is null;
create index if not exists sales_quotes_customer_idx on public.sales_quotes(customer_id) where deleted_at is null;
create index if not exists sales_quote_lines_quote_idx on public.sales_quote_lines(quote_id,position);

create or replace function public.quotes_next_number(p_organization_id uuid,p_workspace_id uuid,p_prefix text default 'OFF',p_year integer default extract(year from current_date)::integer)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare v_value bigint;
begin
  insert into public.sales_quote_sequences(organization_id,workspace_id,year,prefix,current_value)
  values(p_organization_id,p_workspace_id,p_year,p_prefix,1)
  on conflict (organization_id,workspace_id,year,prefix)
  do update set current_value=public.sales_quote_sequences.current_value+1
  returning current_value into v_value;
  return p_prefix||'-'||p_year::text||'-'||lpad(v_value::text,6,'0');
end;$$;

alter table public.sales_quote_sequences enable row level security;
alter table public.sales_quotes enable row level security;
alter table public.sales_quote_lines enable row level security;
alter table public.sales_quote_versions enable row level security;
alter table public.sales_quote_status_history enable row level security;

create or replace function public.fc_has_org_access(p_organization_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.business_memberships m where m.organization_id=p_organization_id and m.user_id=auth.uid() and coalesce(m.status,'active')='active');
$$;

do $$ begin
  create policy sales_quotes_org_access on public.sales_quotes for all using (public.fc_has_org_access(organization_id)) with check (public.fc_has_org_access(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sales_quote_lines_org_access on public.sales_quote_lines for all using (public.fc_has_org_access(organization_id)) with check (public.fc_has_org_access(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sales_quote_versions_org_access on public.sales_quote_versions for all using (public.fc_has_org_access(organization_id)) with check (public.fc_has_org_access(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sales_quote_status_history_org_access on public.sales_quote_status_history for all using (public.fc_has_org_access(organization_id)) with check (public.fc_has_org_access(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sales_quote_sequences_org_access on public.sales_quote_sequences for all using (public.fc_has_org_access(organization_id)) with check (public.fc_has_org_access(organization_id));
exception when duplicate_object then null; end $$;