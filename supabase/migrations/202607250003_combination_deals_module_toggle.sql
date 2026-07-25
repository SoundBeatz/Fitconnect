-- Combination deals as a switchable FitConnect Commerce module.
-- The platform registry supplies the default. Organization assignments can
-- override that default for tenant and white-label environments.

insert into public.platform_modules(
  module_key,
  name,
  description,
  enabled,
  route,
  accent_color,
  surface_style,
  settings,
  display_order,
  updated_at
) values (
  'commerce.combination_deals',
  'Combinatiedeals',
  'Vaste productbundels met pakketprijs, voorraadcontrole en correcte orderverdeling.',
  true,
  '/admin/#combination-deals',
  '#f36f21',
  'premium',
  jsonb_build_object(
    'shop_visible', true,
    'direct_ordering', true,
    'quote_requests', true,
    'allow_discount_codes', false,
    'stock_check_required', true,
    'minimum_margin_guard', true
  ),
  15,
  now()
)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  settings = public.platform_modules.settings || excluded.settings,
  display_order = excluded.display_order,
  updated_at = now();

create table if not exists public.organization_module_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null references public.platform_modules(module_key) on delete cascade,
  enabled boolean not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_key)
);

create index if not exists organization_module_assignments_lookup_idx
  on public.organization_module_assignments (organization_id, module_key, enabled);

alter table public.organization_module_assignments enable row level security;

drop policy if exists organization_module_assignments_admin_read on public.organization_module_assignments;
create policy organization_module_assignments_admin_read
  on public.organization_module_assignments
  for select to authenticated
  using (
    public.command_center_is_admin()
    or public.commerce_is_member(organization_id)
  );

drop policy if exists organization_module_assignments_admin_write on public.organization_module_assignments;
create policy organization_module_assignments_admin_write
  on public.organization_module_assignments
  for all to authenticated
  using (public.command_center_is_admin())
  with check (public.command_center_is_admin());

grant select, insert, update, delete on public.organization_module_assignments to authenticated, service_role;

create or replace function public.commerce_module_enabled(
  p_module_key text,
  p_organization_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_organization_id uuid := p_organization_id;
  assignment_enabled boolean;
  default_enabled boolean := false;
begin
  if resolved_organization_id is null and auth.uid() is not null then
    resolved_organization_id := public.commerce_current_organization();
  end if;

  if resolved_organization_id is null then
    select id into resolved_organization_id
    from public.organizations
    order by
      case when lower(coalesce(slug, '')) = 'fitconnect' or lower(name) = 'fitconnect' then 0 else 1 end,
      created_at,
      id
    limit 1;
  end if;

  if resolved_organization_id is not null then
    select enabled into assignment_enabled
    from public.organization_module_assignments
    where organization_id = resolved_organization_id
      and module_key = p_module_key;

    if assignment_enabled is not null then
      return assignment_enabled;
    end if;
  end if;

  select enabled into default_enabled
  from public.platform_modules
  where module_key = p_module_key;

  return coalesce(default_enabled, false);
end
$$;

revoke all on function public.commerce_module_enabled(text, uuid) from public;
grant execute on function public.commerce_module_enabled(text, uuid) to anon, authenticated, service_role;

-- Public bundle visibility is governed by the module switch. Existing records
-- remain stored and historical order/factuurregels are untouched.
drop policy if exists commerce_bundles_public_read on public.commerce_bundles;
create policy commerce_bundles_public_read on public.commerce_bundles
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and public.commerce_module_enabled('commerce.combination_deals', organization_id)
  );

-- Administrators can always inspect existing deals. Creating or changing deals
-- is only allowed while the module is enabled for that organization.
drop policy if exists commerce_bundles_admin_write on public.commerce_bundles;
create policy commerce_bundles_admin_write on public.commerce_bundles
  for all to authenticated
  using (
    public.command_center_is_admin()
    or public.commerce_is_member(organization_id)
  )
  with check (
    (public.command_center_is_admin() or public.commerce_is_member(organization_id))
    and public.commerce_module_enabled('commerce.combination_deals', organization_id)
  );

drop policy if exists commerce_bundle_items_admin_write on public.commerce_bundle_items;
create policy commerce_bundle_items_admin_write on public.commerce_bundle_items
  for all to authenticated
  using (
    public.command_center_is_admin()
    or public.commerce_is_member(organization_id)
  )
  with check (
    (public.command_center_is_admin() or public.commerce_is_member(organization_id))
    and public.commerce_module_enabled('commerce.combination_deals', organization_id)
  );

-- Seed an explicit assignment for the canonical FitConnect tenant. Other
-- organizations inherit the platform default until a white-label owner or
-- platform administrator stores an override.
insert into public.organization_module_assignments(organization_id, module_key, enabled)
select id, 'commerce.combination_deals', true
from public.organizations
order by
  case when lower(coalesce(slug, '')) = 'fitconnect' or lower(name) = 'fitconnect' then 0 else 1 end,
  created_at,
  id
limit 1
on conflict (organization_id, module_key) do nothing;

notify pgrst, 'reload schema';
