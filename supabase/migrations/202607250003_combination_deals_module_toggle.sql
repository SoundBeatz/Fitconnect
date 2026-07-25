-- Combination deals as a switchable FitConnect Commerce module.
-- Compatibility version for the current single-tenant production database.
-- The function signature keeps an optional organization id so the module can
-- be extended to tenant overrides later without changing callers.

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

create or replace function public.commerce_module_enabled(
  p_module_key text,
  p_organization_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select enabled
      from public.platform_modules
      where module_key = p_module_key
      limit 1
    ),
    false
  );
$$;

revoke all on function public.commerce_module_enabled(text, uuid) from public;
grant execute on function public.commerce_module_enabled(text, uuid)
  to anon, authenticated, service_role;

-- Public visibility follows the module switch. Existing records and historical
-- order or invoice lines remain untouched when the module is disabled.
drop policy if exists commerce_bundles_public_read on public.commerce_bundles;
create policy commerce_bundles_public_read on public.commerce_bundles
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and public.commerce_module_enabled('commerce.combination_deals', organization_id)
  );

-- Administrators can inspect existing deals. New or changed records require
-- the module to be enabled. This is a soft switch and never deletes deal data.
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

notify pgrst, 'reload schema';
