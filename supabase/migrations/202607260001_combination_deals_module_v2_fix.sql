-- FitConnect Commerce Combination Deals v2 compatibility repair.
-- Removes the hard dependency on public.organizations and guarantees the module registry row.

begin;

insert into public.platform_modules(
  module_key,name,description,enabled,route,accent_color,surface_style,settings,display_order,updated_at
) values (
  'commerce.combination_deals',
  'Combination Deals',
  'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',
  true,
  '/admin/#combination-deals',
  '#f36f21',
  'premium',
  jsonb_build_object(
    'shop_visible',true,
    'direct_ordering',true,
    'quote_requests',true,
    'stock_check_required',true,
    'minimum_margin_guard',true
  ),
  15,
  now()
)
on conflict (module_key) do update set
  name=excluded.name,
  description=excluded.description,
  route=excluded.route,
  accent_color=coalesce(public.platform_modules.accent_color,excluded.accent_color),
  surface_style=coalesce(public.platform_modules.surface_style,excluded.surface_style),
  settings=coalesce(public.platform_modules.settings,'{}'::jsonb)||excluded.settings,
  display_order=excluded.display_order,
  updated_at=now();

create or replace function public.commerce_current_organization()
returns uuid
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result uuid;
begin
  if auth.uid() is null then return null; end if;

  if to_regclass('public.organization_members') is not null then
    execute 'select organization_id from public.organization_members where user_id=$1 and coalesce(status,''active'')=''active'' order by created_at limit 1'
      into result using auth.uid();
  end if;

  if result is null and to_regclass('public.organization_memberships') is not null then
    execute 'select organization_id from public.organization_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and to_regclass('public.business_memberships') is not null then
    execute 'select organization_id from public.business_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and public.command_center_is_admin() then
    if to_regclass('public.products') is not null then
      execute 'select organization_id from public.products where organization_id is not null order by created_at limit 1' into result;
    end if;
    if result is null and to_regclass('public.commerce_bundles') is not null then
      execute 'select organization_id from public.commerce_bundles where organization_id is not null order by created_at limit 1' into result;
    end if;
    if result is null and to_regclass('public.commerce_combination_deals') is not null then
      execute 'select organization_id from public.commerce_combination_deals where organization_id is not null order by created_at limit 1' into result;
    end if;
  end if;

  return result;
end
$$;

revoke all on function public.commerce_current_organization() from public,anon;
grant execute on function public.commerce_current_organization() to authenticated,service_role;

notify pgrst,'reload schema';
commit;