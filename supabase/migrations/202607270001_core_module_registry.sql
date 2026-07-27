-- FitConnect Core Module Registry enterprise extension.
-- Extends the existing canonical platform_modules table without replacing it.

do $$
begin
  if to_regclass('public.platform_modules') is null then
    raise exception 'platform_modules must exist before applying the enterprise registry extension';
  end if;
end
$$;

alter table public.platform_modules
  add column if not exists category text not null default 'integration',
  add column if not exists version text not null default '1.0.0',
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists is_core boolean not null default false,
  add column if not exists is_billable boolean not null default false,
  add column if not exists default_enabled boolean not null default false,
  add column if not exists icon_key text,
  add column if not exists configuration_schema jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.platform_modules
  drop constraint if exists platform_modules_category_check,
  add constraint platform_modules_category_check
    check (category in ('core','commerce','gym','portal','command_center','ai','integration')),
  drop constraint if exists platform_modules_version_check,
  add constraint platform_modules_version_check
    check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  drop constraint if exists platform_modules_lifecycle_status_check,
  add constraint platform_modules_lifecycle_status_check
    check (lifecycle_status in ('draft','active','deprecated','retired'));

create table if not exists public.platform_module_dependencies (
  module_id uuid not null references public.platform_modules(id) on delete cascade,
  depends_on_module_id uuid not null references public.platform_modules(id) on delete restrict,
  minimum_version text check (minimum_version is null or minimum_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (module_id, depends_on_module_id),
  check (module_id <> depends_on_module_id)
);

create table if not exists public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  module_id uuid not null references public.platform_modules(id) on delete restrict,
  status text not null default 'enabled' check (status in ('pending','enabled','suspended','disabled')),
  source text not null default 'manual' check (source in ('default','manual','subscription','trial','system')),
  configuration jsonb not null default '{}'::jsonb,
  enabled_at timestamptz,
  disabled_at timestamptz,
  trial_ends_at timestamptz,
  subscription_reference text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trial_ends_at is null or trial_ends_at > created_at)
);

create unique index if not exists organization_modules_scope_unique_idx
  on public.organization_modules (organization_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), module_id);

create table if not exists public.organization_module_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  workspace_id uuid,
  module_id uuid not null references public.platform_modules(id) on delete restrict,
  event_type text not null check (event_type in ('enabled','disabled','suspended','reactivated','configured','trial_started','trial_ended')),
  previous_state jsonb,
  new_state jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default now()
);

create index if not exists platform_modules_category_status_idx
  on public.platform_modules (category, lifecycle_status, display_order, name);
create index if not exists organization_modules_org_status_idx
  on public.organization_modules (organization_id, status);
create index if not exists organization_module_events_org_time_idx
  on public.organization_module_events (organization_id, occurred_at desc);

create or replace function public.module_registry_is_member(target_organization_id uuid)
returns boolean
language plpgsql stable security definer set search_path=public
as $$
begin
  if auth.uid() is null then return false; end if;
  if to_regclass('public.organization_memberships') is not null then
    return exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = target_organization_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    );
  end if;
  if to_regclass('public.organization_members') is not null then
    return exists (
      select 1 from public.organization_members member
      where member.organization_id = target_organization_id
        and member.user_id = auth.uid()
        and member.status = 'active'
    );
  end if;
  return false;
end
$$;

create or replace function public.module_registry_is_admin()
returns boolean
language plpgsql stable security definer set search_path=public
as $$
begin
  if to_regprocedure('public.command_center_is_admin()') is not null then
    return public.command_center_is_admin();
  end if;
  return false;
end
$$;

create or replace function public.module_is_enabled(
  target_organization_id uuid,
  target_module_key text,
  target_workspace_id uuid default null
)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.organization_modules organization_module
    join public.platform_modules module on module.id = organization_module.module_id
    where organization_module.organization_id = target_organization_id
      and module.module_key = target_module_key
      and module.lifecycle_status = 'active'
      and organization_module.status = 'enabled'
      and (organization_module.trial_ends_at is null or organization_module.trial_ends_at > now())
      and (organization_module.workspace_id is null or organization_module.workspace_id = target_workspace_id)
  );
$$;

create or replace function public.log_organization_module_change()
returns trigger
language plpgsql security definer set search_path=public
as $$
declare resolved_event_type text;
begin
  if tg_op = 'INSERT' then
    resolved_event_type := case new.status when 'enabled' then 'enabled' when 'suspended' then 'suspended' else 'configured' end;
  elsif old.status is distinct from new.status then
    resolved_event_type := case new.status
      when 'enabled' then case when old.status = 'suspended' then 'reactivated' else 'enabled' end
      when 'disabled' then 'disabled'
      when 'suspended' then 'suspended'
      else 'configured'
    end;
  else
    resolved_event_type := 'configured';
  end if;

  insert into public.organization_module_events (
    organization_id, workspace_id, module_id, event_type, previous_state, new_state, actor_user_id
  ) values (
    new.organization_id, new.workspace_id, new.module_id, resolved_event_type,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new), auth.uid()
  );
  return new;
end
$$;

drop trigger if exists organization_modules_audit_trigger on public.organization_modules;
create trigger organization_modules_audit_trigger
after insert or update on public.organization_modules
for each row execute function public.log_organization_module_change();

alter table public.platform_module_dependencies enable row level security;
alter table public.organization_modules enable row level security;
alter table public.organization_module_events enable row level security;

drop policy if exists platform_module_dependencies_authenticated_read on public.platform_module_dependencies;
create policy platform_module_dependencies_authenticated_read on public.platform_module_dependencies
  for select to authenticated using (true);

drop policy if exists organization_modules_member_read on public.organization_modules;
create policy organization_modules_member_read on public.organization_modules
  for select to authenticated using (public.module_registry_is_member(organization_id));

drop policy if exists organization_modules_admin_write on public.organization_modules;
create policy organization_modules_admin_write on public.organization_modules
  for all to authenticated
  using (public.module_registry_is_admin() and public.module_registry_is_member(organization_id))
  with check (public.module_registry_is_admin() and public.module_registry_is_member(organization_id));

drop policy if exists organization_module_events_admin_read on public.organization_module_events;
create policy organization_module_events_admin_read on public.organization_module_events
  for select to authenticated
  using (public.module_registry_is_admin() and public.module_registry_is_member(organization_id));

revoke all on function public.module_registry_is_member(uuid) from public, anon;
revoke all on function public.module_registry_is_admin() from public, anon;
revoke all on function public.module_is_enabled(uuid, text, uuid) from public, anon;
grant execute on function public.module_registry_is_member(uuid) to authenticated, service_role;
grant execute on function public.module_registry_is_admin() to authenticated, service_role;
grant execute on function public.module_is_enabled(uuid, text, uuid) to authenticated, service_role;

grant select on public.platform_module_dependencies to authenticated, service_role;
grant select, insert, update, delete on public.organization_modules to authenticated, service_role;
grant select on public.organization_module_events to authenticated, service_role;
grant usage, select on sequence public.organization_module_events_id_seq to service_role;

insert into public.platform_modules (
  module_key, name, description, enabled, route, accent_color, surface_style, display_order, settings,
  category, version, lifecycle_status, is_core, is_billable, default_enabled, icon_key
) values
  ('core_engine','Core Engine','Tenant identity, organizations, workspaces, permissions and platform foundations.',true,'','#1f2937','dark',1,'{}'::jsonb,'core','1.0.0','active',true,false,true,'settings'),
  ('customer_portal','Customer Portal','Customer self-service for orders, invoices, profiles, service and documents.',true,'/portal/','#f36f21','light',40,'{}'::jsonb,'portal','1.0.0','active',false,true,true,'user-round'),
  ('command_center','Command Center','Operational control, analytics, administration, monitoring and audit.',true,'/admin/','#1f2937','dark',5,'{}'::jsonb,'command_center','1.0.0','active',true,false,true,'layout-dashboard'),
  ('gym_platform','Gym Platform','Membership, coaching, scheduling, measurements and gym operations.',false,'/gym/','#236451','natural',50,'{}'::jsonb,'gym','1.0.0','active',false,true,false,'dumbbell'),
  ('unified_invoicing','Unified Invoicing','Invoices, credit notes, numbering, tax handling and delivery.',true,'/admin/#invoicing','#f36f21','light',16,'{}'::jsonb,'commerce','1.0.0','active',false,true,false,'receipt'),
  ('ai_services','AI Services','Governed AI capabilities, usage policies, prompts, tools and audit.',false,'/admin/#ai','#6d28d9','premium',60,'{}'::jsonb,'ai','1.0.0','active',false,true,false,'sparkles')
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  version = excluded.version,
  lifecycle_status = excluded.lifecycle_status,
  is_core = excluded.is_core,
  is_billable = excluded.is_billable,
  default_enabled = excluded.default_enabled,
  icon_key = excluded.icon_key,
  updated_at = now();

update public.platform_modules set
  category = 'commerce', version = '1.0.0', lifecycle_status = 'active',
  is_core = false, is_billable = true, default_enabled = enabled, icon_key = 'shopping-cart'
where module_key = 'commerce';
update public.platform_modules set
  category = 'commerce', version = '1.0.0', lifecycle_status = 'active',
  is_core = false, is_billable = true, default_enabled = false, icon_key = 'package'
where module_key = 'combination_deals';
update public.platform_modules set
  category = 'commerce', version = '1.0.0', lifecycle_status = 'active',
  is_core = false, is_billable = true, default_enabled = enabled, icon_key = 'salad'
where module_key = 'nutrition';
update public.platform_modules set
  category = 'commerce', version = '1.0.0', lifecycle_status = 'active',
  is_core = false, is_billable = true, default_enabled = enabled, icon_key = 'gift'
where module_key = 'rewards';

insert into public.platform_module_dependencies (module_id, depends_on_module_id, minimum_version, required)
select module.id, dependency.id, '1.0.0', true
from public.platform_modules module
join public.platform_modules dependency on dependency.module_key = 'core_engine'
where module.module_key in ('commerce','customer_portal','command_center','gym_platform','ai_services')
on conflict (module_id, depends_on_module_id) do nothing;

insert into public.platform_module_dependencies (module_id, depends_on_module_id, minimum_version, required)
select module.id, dependency.id, '1.0.0', true
from public.platform_modules module
join public.platform_modules dependency on dependency.module_key = 'commerce'
where module.module_key in ('combination_deals','unified_invoicing','nutrition','rewards')
on conflict (module_id, depends_on_module_id) do nothing;

notify pgrst, 'reload schema';