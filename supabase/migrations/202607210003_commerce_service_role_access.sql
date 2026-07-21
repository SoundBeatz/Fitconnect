-- Commerce Edge Functions use the service role for trusted server-side work.
-- Keep these privileges explicit so legacy databases and restored environments
-- do not depend on Supabase's project-level default privileges.

grant usage on schema public to service_role;

do $commerce_service_role_access$
declare
  table_name text;
begin
  foreach table_name in array array[
    'commerce_carts',
    'commerce_cart_items',
    'commerce_checkout_sessions',
    'commerce_payments',
    'commerce_payment_events',
    'commerce_refunds',
    'commerce_payment_status_history'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to service_role',
        table_name
      );
    end if;
  end loop;
end
$commerce_service_role_access$;

-- Edge Functions access these tables through PostgREST. Refresh its schema
-- and privilege cache immediately after the grants are applied.
notify pgrst, 'reload schema';

