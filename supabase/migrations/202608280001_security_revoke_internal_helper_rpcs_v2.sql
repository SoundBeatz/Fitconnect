-- Internal authorization and tenant-resolution helpers are implementation details.
-- SECURITY DEFINER callers and RLS policies continue to invoke them internally;
-- signed-in clients must use their canonical domain operations instead.

revoke execute on function public.is_admin() from authenticated;
revoke execute on function public.is_fitconnect_admin() from authenticated;
revoke execute on function public.module_registry_is_admin() from authenticated;
revoke execute on function public.module_registry_is_member(uuid) from authenticated;
revoke execute on function public.commerce_is_member(uuid) from authenticated;
revoke execute on function public.customer_current_organization() from authenticated;

grant execute on function public.is_admin() to service_role;
grant execute on function public.is_fitconnect_admin() to service_role;
grant execute on function public.module_registry_is_admin() to service_role;
grant execute on function public.module_registry_is_member(uuid) to service_role;
grant execute on function public.commerce_is_member(uuid) to service_role;
grant execute on function public.customer_current_organization() to service_role;
