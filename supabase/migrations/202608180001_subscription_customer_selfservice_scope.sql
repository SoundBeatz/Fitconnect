-- Subscription customer self-service scope hardening.
-- Active plans remain readable only inside the authenticated user's organization membership.

drop policy if exists customer_subscription_plans_read on public.customer_subscription_plans;
create policy customer_subscription_plans_read
on public.customer_subscription_plans
for select
to authenticated
using (
  active = true
  and public.commerce_is_member(organization_id)
);

-- Own subscriptions remain customer-readable, but enforce tenant membership as a second boundary.
drop policy if exists customer_subscriptions_own_read on public.customer_subscriptions;
create policy customer_subscriptions_own_read
on public.customer_subscriptions
for select
to authenticated
using (
  customer_user_id = auth.uid()
  and public.commerce_is_member(organization_id)
);

notify pgrst, 'reload schema';
