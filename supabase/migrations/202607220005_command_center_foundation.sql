-- FitConnect Command Center foundation.
-- Tenant-scoped KPI snapshots, actionable signals and immutable audit events.

create table if not exists public.command_center_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  metric_key text not null check (metric_key ~ '^[a-z0-9_.-]+$'),
  metric_value numeric not null,
  currency char(3),
  dimensions jsonb not null default '{}'::jsonb,
  period_start timestamptz not null,
  period_end timestamptz not null,
  calculated_at timestamptz not null default now(),
  source_version text not null default '1.0.0',
  check (period_end > period_start)
);

create unique index if not exists command_center_metric_snapshot_uq
  on public.command_center_metric_snapshots
  (organization_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), metric_key, period_start, period_end);
create index if not exists command_center_metric_lookup_idx
  on public.command_center_metric_snapshots (organization_id, metric_key, period_end desc);

create table if not exists public.command_center_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  alert_key text not null,
  category text not null check (category in ('commerce','finance','customer','inventory','service','security','platform','ai','data_quality')),
  severity text not null check (severity in ('info','warning','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  title text not null,
  description text,
  source_type text not null,
  source_id text,
  evidence jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists command_center_open_alert_uq
  on public.command_center_alerts (organization_id, alert_key)
  where status in ('open','acknowledged');
create index if not exists command_center_alert_queue_idx
  on public.command_center_alerts (organization_id, status, severity, last_detected_at desc);

create table if not exists public.command_center_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user','system','service','ai')),
  action text not null,
  resource_type text not null,
  resource_id text,
  outcome text not null default 'success' check (outcome in ('success','denied','failed')),
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists command_center_audit_timeline_idx
  on public.command_center_audit_events (organization_id, occurred_at desc);

alter table public.command_center_metric_snapshots enable row level security;
alter table public.command_center_alerts enable row level security;
alter table public.command_center_audit_events enable row level security;

create or replace function public.command_center_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','owner'));
$$;

drop policy if exists command_center_metrics_read on public.command_center_metric_snapshots;
create policy command_center_metrics_read on public.command_center_metric_snapshots
  for select to authenticated using (public.command_center_is_admin() or public.commerce_is_member(organization_id));
drop policy if exists command_center_alerts_read on public.command_center_alerts;
create policy command_center_alerts_read on public.command_center_alerts
  for select to authenticated using (public.command_center_is_admin() or public.commerce_is_member(organization_id));
drop policy if exists command_center_alerts_admin_update on public.command_center_alerts;
create policy command_center_alerts_admin_update on public.command_center_alerts
  for update to authenticated using (public.command_center_is_admin()) with check (public.command_center_is_admin());
drop policy if exists command_center_audit_read on public.command_center_audit_events;
create policy command_center_audit_read on public.command_center_audit_events
  for select to authenticated using (public.command_center_is_admin() or public.commerce_is_member(organization_id));

revoke all on public.command_center_metric_snapshots,public.command_center_alerts,public.command_center_audit_events from anon;
grant select on public.command_center_metric_snapshots,public.command_center_alerts,public.command_center_audit_events to authenticated;
grant update(status,acknowledged_at,acknowledged_by,resolved_at,resolved_by,updated_at) on public.command_center_alerts to authenticated;
grant select,insert,update,delete on public.command_center_metric_snapshots,public.command_center_alerts to service_role;
grant select,insert on public.command_center_audit_events to service_role;
revoke all on function public.command_center_is_admin() from public,anon;
grant execute on function public.command_center_is_admin() to authenticated,service_role;

comment on table public.command_center_metric_snapshots is 'Immutable tenant-scoped KPI results; definitions remain versioned in source control.';
comment on table public.command_center_alerts is 'Deduplicated actionable Command Center signals with ownership lifecycle.';
comment on table public.command_center_audit_events is 'Append-only business and platform audit trail for Command Center investigations.';

notify pgrst, 'reload schema';
