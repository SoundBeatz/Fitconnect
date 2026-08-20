-- Restrict invoice issuer snapshot reads to the authenticated admin's active tenant.
create or replace function public.commerce_current_supplier_snapshot(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $function$
declare
  v_snapshot jsonb;
  v_current_organization uuid;
begin
  if not public.command_center_is_admin() then
    raise exception 'Admin access required';
  end if;

  v_current_organization := public.commerce_current_organization();
  if v_current_organization is null or p_organization_id is distinct from v_current_organization then
    raise exception 'Organization access denied';
  end if;

  select supplier_snapshot into v_snapshot
  from public.commerce_invoice_issuers
  where organization_id = p_organization_id;

  if v_snapshot is null or v_snapshot = '{}'::jsonb then
    raise exception 'Invoice issuer profile is not configured';
  end if;

  return v_snapshot;
end;
$function$;

revoke all on function public.commerce_current_supplier_snapshot(uuid) from public, anon;
grant execute on function public.commerce_current_supplier_snapshot(uuid) to authenticated, service_role;

comment on function public.commerce_current_supplier_snapshot(uuid) is
  'Returns the canonical supplier snapshot only for an authenticated admin and the currently active organization.';

notify pgrst,'reload schema';
