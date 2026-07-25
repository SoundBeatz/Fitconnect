-- Resolve the tenant for platform administrators who can use Command Center
-- without a legacy organization_members row, and let those administrators
-- manage bundles inside that resolved organization.
create or replace function public.commerce_current_organization()
returns uuid
language plpgsql stable security definer set search_path=public
as $$
declare
  result uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  if to_regclass('public.organization_members') is not null then
    select organization_id into result
    from public.organization_members
    where user_id=auth.uid() and coalesce(status,'active')='active'
    order by created_at
    limit 1;
  end if;

  if result is null and to_regclass('public.organization_memberships') is not null then
    execute 'select organization_id from public.organization_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and to_regclass('public.business_memberships') is not null then
    execute 'select organization_id from public.business_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  -- Platform admins are already authorized by profiles.role. Older FitConnect
  -- accounts predate organization memberships, so select the canonical tenant
  -- deterministically instead of blocking every Command Center write.
  if result is null and public.command_center_is_admin() then
    select id into result
    from public.organizations
    order by
      case when lower(coalesce(slug,''))='fitconnect' or lower(name)='fitconnect' then 0 else 1 end,
      created_at,
      id
    limit 1;
  end if;

  return result;
end
$$;

drop policy if exists commerce_bundles_admin_write on public.commerce_bundles;
create policy commerce_bundles_admin_write on public.commerce_bundles
  for all to authenticated
  using (public.command_center_is_admin() or public.commerce_is_member(organization_id))
  with check (public.command_center_is_admin() or public.commerce_is_member(organization_id));

drop policy if exists commerce_bundle_items_admin_write on public.commerce_bundle_items;
create policy commerce_bundle_items_admin_write on public.commerce_bundle_items
  for all to authenticated
  using (public.command_center_is_admin() or public.commerce_is_member(organization_id))
  with check (public.command_center_is_admin() or public.commerce_is_member(organization_id));

revoke all on function public.commerce_current_organization() from public, anon;
grant execute on function public.commerce_current_organization() to authenticated, service_role;

notify pgrst, 'reload schema';
