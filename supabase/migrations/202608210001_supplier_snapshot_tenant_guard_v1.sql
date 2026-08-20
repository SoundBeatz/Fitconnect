-- Restrict invoice issuer snapshot reads to the active admin tenant or an owned customer quote tenant.
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
  v_allowed boolean := false;
begin
  if p_organization_id is null or auth.uid() is null then
    raise exception 'Authentication and organization context required';
  end if;

  if public.command_center_is_admin() then
    v_current_organization := public.commerce_current_organization();
    v_allowed := v_current_organization is not null and p_organization_id = v_current_organization;
  else
    select exists(
      select 1
      from public.commerce_quotes q
      where q.organization_id = p_organization_id
        and q.portal_user_id = auth.uid()
        and q.status in ('approved','converted_to_invoice')
    ) into v_allowed;
  end if;

  if not v_allowed then
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
  'Returns the canonical supplier snapshot only to an admin in the active tenant or a customer with an owned approved/converted quote in that tenant.';

notify pgrst,'reload schema';
