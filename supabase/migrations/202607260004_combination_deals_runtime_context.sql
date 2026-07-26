begin;

create table if not exists public.commerce_runtime_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.commerce_runtime_settings enable row level security;
revoke all on public.commerce_runtime_settings from public, anon, authenticated;
grant select, insert, update, delete on public.commerce_runtime_settings to service_role;

create or replace function public.commerce_set_runtime_organization(p_organization_id uuid)
returns void
language sql
security definer
set search_path=public
as $$
  insert into public.commerce_runtime_settings(setting_key,setting_value,updated_at)
  values ('fitconnect.organization_id',p_organization_id::text,now())
  on conflict (setting_key) do update set setting_value=excluded.setting_value,updated_at=now();
$$;

revoke all on function public.commerce_set_runtime_organization(uuid) from public,anon,authenticated;
grant execute on function public.commerce_set_runtime_organization(uuid) to service_role;

create or replace function public.commerce_current_organization()
returns uuid
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result uuid;
  relation_name text;
begin
  if auth.uid() is null then return null; end if;

  foreach relation_name in array array['organization_members','organization_memberships','business_memberships'] loop
    if to_regclass('public.'||relation_name) is not null
       and exists(select 1 from information_schema.columns where table_schema='public' and table_name=relation_name and column_name='organization_id')
       and exists(select 1 from information_schema.columns where table_schema='public' and table_name=relation_name and column_name='user_id') then
      execute format('select organization_id from public.%I where user_id=$1 order by organization_id limit 1',relation_name)
        into result using auth.uid();
      if result is not null then return result; end if;
    end if;
  end loop;

  if public.command_center_is_admin() then
    select setting_value::uuid into result
    from public.commerce_runtime_settings
    where setting_key='fitconnect.organization_id'
    limit 1;
    if result is not null then return result; end if;

    foreach relation_name in array array['commerce_bundles','commerce_combination_deals','commerce_orders','invoices'] loop
      if to_regclass('public.'||relation_name) is not null
         and exists(select 1 from information_schema.columns where table_schema='public' and table_name=relation_name and column_name='organization_id') then
        execute format('select organization_id from public.%I where organization_id is not null limit 1',relation_name) into result;
        if result is not null then return result; end if;
      end if;
    end loop;
  end if;

  return null;
end
$$;

revoke all on function public.commerce_current_organization() from public,anon;
grant execute on function public.commerce_current_organization() to authenticated,service_role;

notify pgrst,'reload schema';
commit;
