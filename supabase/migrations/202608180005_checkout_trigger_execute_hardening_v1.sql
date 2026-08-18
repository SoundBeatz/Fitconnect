-- Checkout trigger execute hardening v1
-- Trigger-only SECURITY DEFINER functions must not be directly callable via PostgREST/RPC.

revoke execute on function public.commerce_checkout_sync_profile_account_type() from public;
revoke execute on function public.commerce_checkout_sync_profile_account_type() from anon;
revoke execute on function public.commerce_checkout_sync_profile_account_type() from authenticated;

notify pgrst, 'reload schema';
