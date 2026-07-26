begin;
do $$
declare
  v_org uuid;
begin
  if to_regclass('public.commerce_runtime_settings') is null then
    raise exception 'commerce_runtime_settings missing';
  end if;
  if to_regprocedure('public.commerce_set_runtime_organization(uuid)') is null then
    raise exception 'commerce_set_runtime_organization(uuid) missing';
  end if;
  select setting_value::uuid into v_org from public.commerce_runtime_settings where setting_key='fitconnect.organization_id';
  if v_org is null then
    raise exception 'Canonical FitConnect organization is not registered';
  end if;
end $$;
rollback;
