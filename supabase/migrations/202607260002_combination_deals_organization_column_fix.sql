-- FitConnect Commerce Combination Deals organization resolution hardening.
-- Only queries organization_id on relations that actually expose that column.

begin;

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
  if auth.uid() is null then
    return null;
  end if;

  if to_regclass('public.organization_members') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='organization_members' and column_name='organization_id'
     ) then
    execute 'select organization_id from public.organization_members where user_id=$1 and coalesce(status,''active'')=''active'' order by created_at limit 1'
      into result using auth.uid();
  end if;

  if result is null
     and to_regclass('public.organization_memberships') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='organization_memberships' and column_name='organization_id'
     ) then
    execute 'select organization_id from public.organization_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null
     and to_regclass('public.business_memberships') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='business_memberships' and column_name='organization_id'
     ) then
    execute 'select organization_id from public.business_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and public.command_center_is_admin() then
    if to_regclass('public.commerce_bundles') is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='commerce_bundles' and column_name='organization_id'
       ) then
      execute 'select organization_id from public.commerce_bundles where organization_id is not null order by created_at limit 1'
        into result;
    end if;

    if result is null
       and to_regclass('public.commerce_bundle_metrics') is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='commerce_bundle_metrics' and column_name='organization_id'
       ) then
      execute 'select organization_id from public.commerce_bundle_metrics where organization_id is not null order by created_at limit 1'
        into result;
    end if;

    if result is null
       and to_regclass('public.commerce_combination_deals') is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='commerce_combination_deals' and column_name='organization_id'
       ) then
      execute 'select organization_id from public.commerce_combination_deals where organization_id is not null order by created_at limit 1'
        into result;
    end if;
  end if;

  return result;
end
$$;

revoke all on function public.commerce_current_organization() from public,anon;
grant execute on function public.commerce_current_organization() to authenticated,service_role;

notify pgrst,'reload schema';
commit;
