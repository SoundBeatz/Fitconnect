-- Internal authorization/tenant helpers are implementation details.
-- They remain executable by database owners/service_role and callable from
-- SECURITY DEFINER functions, but are no longer exposed as authenticated RPCs.

revoke execute on function public.command_center_is_admin() from authenticated;
revoke execute on function public.commerce_current_organization() from authenticated;

grant execute on function public.command_center_is_admin() to service_role;
grant execute on function public.commerce_current_organization() to service_role;
