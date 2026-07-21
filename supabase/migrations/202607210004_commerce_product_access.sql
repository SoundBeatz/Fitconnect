-- Checkout prices products server-side and must never trust browser totals.
-- Explicitly grant read-only catalog access to the Edge Function service role
-- for projects where default service_role privileges were hardened or revoked.

grant usage on schema public to service_role;

do $commerce_product_access$
begin
  if to_regclass('public.products') is null then
    raise exception 'Required checkout catalog table public.products does not exist';
  end if;

  grant select on table public.products to service_role;
end
$commerce_product_access$;

-- Product metadata is queried through PostgREST by the Edge Function.
notify pgrst, 'reload schema';
