-- Restore the RLS helper privilege required by Commerce policies.
--
-- commerce_is_member remains SECURITY DEFINER and is only callable by the
-- authenticated application role and server-side service role.
revoke all on function public.commerce_is_member(uuid) from public, anon;
grant execute on function public.commerce_is_member(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
