-- Make combination deal media persistent and resolve the current tenant across
-- all membership models used by the FitConnect platform.
alter table public.commerce_bundles
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists video_url text;

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

  if to_regclass('public.organization_memberships') is not null then
    execute 'select organization_id from public.organization_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and to_regclass('public.organization_members') is not null then
    execute 'select organization_id from public.organization_members where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  if result is null and to_regclass('public.business_memberships') is not null then
    execute 'select organization_id from public.business_memberships where user_id=$1 and coalesce(status,''active'')=''active'' order by organization_id limit 1'
      into result using auth.uid();
  end if;

  return result;
end
$$;

create or replace function public.commerce_is_member(p_organization_id uuid)
returns boolean
language plpgsql stable security definer set search_path=public
as $$
declare
  allowed boolean := false;
begin
  if auth.uid() is null or p_organization_id is null then
    return false;
  end if;

  if to_regclass('public.organization_memberships') is not null then
    execute 'select exists(select 1 from public.organization_memberships where organization_id=$1 and user_id=$2 and coalesce(status,''active'')=''active'')'
      into allowed using p_organization_id, auth.uid();
  end if;

  if not allowed and to_regclass('public.organization_members') is not null then
    execute 'select exists(select 1 from public.organization_members where organization_id=$1 and user_id=$2 and coalesce(status,''active'')=''active'')'
      into allowed using p_organization_id, auth.uid();
  end if;

  if not allowed and to_regclass('public.business_memberships') is not null then
    execute 'select exists(select 1 from public.business_memberships where organization_id=$1 and user_id=$2 and coalesce(status,''active'')=''active'')'
      into allowed using p_organization_id, auth.uid();
  end if;

  return allowed;
end
$$;

revoke all on function public.commerce_current_organization() from public, anon;
grant execute on function public.commerce_current_organization() to authenticated, service_role;
revoke all on function public.commerce_is_member(uuid) from public, anon;
grant execute on function public.commerce_is_member(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
