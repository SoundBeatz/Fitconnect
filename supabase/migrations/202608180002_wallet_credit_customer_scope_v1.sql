-- Wallet / Credits customer self-service tenant scope v1.
-- RLS remains authoritative; server payment flow derives organization from a customer-visible package.

drop policy if exists customer_credit_packages_read on public.customer_credit_packages;
create policy customer_credit_packages_read
on public.customer_credit_packages for select to authenticated
using(active=true and public.commerce_is_member(organization_id));

drop policy if exists customer_credit_purchases_own_read on public.customer_credit_purchases;
create policy customer_credit_purchases_own_read
on public.customer_credit_purchases for select to authenticated
using(customer_user_id=auth.uid() and public.commerce_is_member(organization_id));

notify pgrst,'reload schema';
