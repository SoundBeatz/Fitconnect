-- Sprint E Customer 360 foundation: communication, documents, wallet ledger and subscriptions.
create table if not exists public.customer_communications (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_user_id uuid not null,
 channel text not null default 'portal' check(channel in ('portal','email','phone','internal')), direction text not null default 'outbound' check(direction in ('inbound','outbound','internal')),
 subject text, body text not null, visible_to_customer boolean not null default true, created_by uuid, created_at timestamptz not null default now()
);
create index if not exists customer_communications_customer_idx on public.customer_communications(organization_id,customer_user_id,created_at desc);

create table if not exists public.customer_documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_user_id uuid not null,
 document_type text not null default 'general', title text not null, storage_path text, external_url text, metadata jsonb not null default '{}'::jsonb,
 visible_to_customer boolean not null default true, created_by uuid, created_at timestamptz not null default now()
);
create index if not exists customer_documents_customer_idx on public.customer_documents(organization_id,customer_user_id,created_at desc);

create table if not exists public.customer_wallets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_user_id uuid not null,
 currency text not null default 'EUR', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,customer_user_id,currency)
);
create table if not exists public.customer_wallet_ledger (
 id uuid primary key default gen_random_uuid(), wallet_id uuid not null references public.customer_wallets(id) on delete restrict,
 organization_id uuid not null, customer_user_id uuid not null, entry_type text not null check(entry_type in ('purchase','subscription_credit','manual_credit','redemption','refund','expiry','correction')),
 amount numeric(14,2) not null check(amount<>0), currency text not null default 'EUR', reference_type text, reference_id uuid, description text,
 idempotency_key text, created_by uuid, created_at timestamptz not null default now(), unique(organization_id,idempotency_key)
);
create index if not exists customer_wallet_ledger_customer_idx on public.customer_wallet_ledger(organization_id,customer_user_id,created_at desc);

create table if not exists public.customer_subscription_plans (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, name text not null, description text,
 price numeric(14,2) not null check(price>=0), currency text not null default 'EUR', billing_interval text not null check(billing_interval in ('month','quarter','year')),
 credits_per_cycle numeric(14,2) not null default 0 check(credits_per_cycle>=0), active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customer_subscriptions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_user_id uuid not null,
 plan_id uuid not null references public.customer_subscription_plans(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','active','paused','past_due','cancelled','expired')),
 provider text, provider_customer_id text, provider_subscription_id text, current_period_start timestamptz, current_period_end timestamptz,
 cancel_at_period_end boolean not null default false, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists customer_subscriptions_customer_idx on public.customer_subscriptions(organization_id,customer_user_id,status);

alter table public.customer_communications enable row level security;
alter table public.customer_documents enable row level security;
alter table public.customer_wallets enable row level security;
alter table public.customer_wallet_ledger enable row level security;
alter table public.customer_subscription_plans enable row level security;
alter table public.customer_subscriptions enable row level security;

-- Customers may only read their own customer-visible records. Mutations remain server/admin controlled.
drop policy if exists customer_communications_own_read on public.customer_communications;
create policy customer_communications_own_read on public.customer_communications for select to authenticated using(customer_user_id=auth.uid() and visible_to_customer=true);
drop policy if exists customer_documents_own_read on public.customer_documents;
create policy customer_documents_own_read on public.customer_documents for select to authenticated using(customer_user_id=auth.uid() and visible_to_customer=true);
drop policy if exists customer_wallets_own_read on public.customer_wallets;
create policy customer_wallets_own_read on public.customer_wallets for select to authenticated using(customer_user_id=auth.uid());
drop policy if exists customer_wallet_ledger_own_read on public.customer_wallet_ledger;
create policy customer_wallet_ledger_own_read on public.customer_wallet_ledger for select to authenticated using(customer_user_id=auth.uid());
drop policy if exists customer_subscription_plans_read on public.customer_subscription_plans;
create policy customer_subscription_plans_read on public.customer_subscription_plans for select to authenticated using(active=true);
drop policy if exists customer_subscriptions_own_read on public.customer_subscriptions;
create policy customer_subscriptions_own_read on public.customer_subscriptions for select to authenticated using(customer_user_id=auth.uid());

-- Admin access remains organization-scoped through the certified Command Center authorization function.
do $$ begin
 if to_regprocedure('public.command_center_is_admin()') is not null then
  execute 'create policy customer_communications_admin_all on public.customer_communications for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
  execute 'create policy customer_documents_admin_all on public.customer_documents for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
  execute 'create policy customer_wallets_admin_all on public.customer_wallets for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
  execute 'create policy customer_wallet_ledger_admin_all on public.customer_wallet_ledger for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
  execute 'create policy customer_subscription_plans_admin_all on public.customer_subscription_plans for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
  execute 'create policy customer_subscriptions_admin_all on public.customer_subscriptions for all to authenticated using(public.command_center_is_admin()) with check(public.command_center_is_admin())';
 end if;
exception when duplicate_object then null; end $$;

create or replace view public.customer_wallet_balances with (security_invoker=true) as
 select w.id wallet_id,w.organization_id,w.customer_user_id,w.currency,coalesce(sum(l.amount),0)::numeric(14,2) balance
 from public.customer_wallets w left join public.customer_wallet_ledger l on l.wallet_id=w.id group by w.id,w.organization_id,w.customer_user_id,w.currency;

grant select on public.customer_wallet_balances to authenticated;
