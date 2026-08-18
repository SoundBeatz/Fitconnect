-- Customer tenant resolver v1.
-- commerce_is_member() is intentionally admin-only in the certified Commerce baseline,
-- so customer-facing domains require their own authenticated tenant resolver.

create or replace function public.customer_current_organization()
returns uuid
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then return null; end if;

  select p.organization_id into v_org
  from public.profiles p
  where p.id=v_user and p.organization_id is not null
  limit 1;
  if v_org is not null then return v_org; end if;

  select w.organization_id into v_org
  from public.customer_wallets w
  where w.customer_user_id=v_user
  order by w.updated_at desc nulls last, w.created_at desc
  limit 1;
  if v_org is not null then return v_org; end if;

  select s.organization_id into v_org
  from public.customer_subscriptions s
  where s.customer_user_id=v_user
  order by s.updated_at desc nulls last, s.created_at desc
  limit 1;
  if v_org is not null then return v_org; end if;

  select c.organization_id into v_org
  from public.commerce_carts c
  where c.user_id=v_user and c.organization_id is not null
  order by c.updated_at desc nulls last, c.created_at desc
  limit 1;
  if v_org is not null then return v_org; end if;

  -- Current FitConnect public-tenant fallback for authenticated customers with no domain record yet.
  select setting_value::uuid into v_org
  from public.commerce_runtime_settings
  where setting_key='fitconnect.organization_id'
  limit 1;

  return v_org;
end;
$$;

revoke all on function public.customer_current_organization() from public,anon;
grant execute on function public.customer_current_organization() to authenticated;

-- Subscription customer reads.
drop policy if exists customer_subscription_plans_read on public.customer_subscription_plans;
create policy customer_subscription_plans_read
on public.customer_subscription_plans for select to authenticated
using(active=true and organization_id=public.customer_current_organization());

drop policy if exists customer_subscriptions_own_read on public.customer_subscriptions;
create policy customer_subscriptions_own_read
on public.customer_subscriptions for select to authenticated
using(customer_user_id=auth.uid() and organization_id=public.customer_current_organization());

-- Wallet / credit customer reads.
drop policy if exists customer_credit_packages_read on public.customer_credit_packages;
create policy customer_credit_packages_read
on public.customer_credit_packages for select to authenticated
using(active=true and organization_id=public.customer_current_organization());

drop policy if exists customer_credit_purchases_own_read on public.customer_credit_purchases;
create policy customer_credit_purchases_own_read
on public.customer_credit_purchases for select to authenticated
using(customer_user_id=auth.uid() and organization_id=public.customer_current_organization());

notify pgrst,'reload schema';
