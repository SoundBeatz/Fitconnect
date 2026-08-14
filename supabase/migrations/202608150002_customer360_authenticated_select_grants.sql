-- Customer 360 read grants. RLS remains authoritative for row visibility.
grant select on table public.customer_communications to authenticated;
grant select on table public.customer_documents to authenticated;
grant select on table public.customer_wallets to authenticated;
grant select on table public.customer_wallet_ledger to authenticated;
grant select on table public.customer_subscription_plans to authenticated;
grant select on table public.customer_subscriptions to authenticated;
grant select on table public.customer_credit_packages to authenticated;
grant select on table public.customer_credit_purchases to authenticated;
