-- Regression repair: production login/bootstrap calls public.is_admin() after successful authentication.
-- Keep anon denied; restore the authenticated RPC contract only.
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_admin() from anon;
