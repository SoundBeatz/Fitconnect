-- Mollie Recurring provider bridge v1.
-- Additive only: customer_subscriptions remains canonical subscription truth.

alter table public.customer_subscriptions
  add column if not exists provider_mandate_id text,
  add column if not exists provider_mandate_status text,
  add column if not exists provider_first_payment_id text,
  add column if not exists provider_last_payment_id text,
  add column if not exists provider_last_event_at timestamptz;

create index if not exists customer_subscriptions_provider_customer_idx
  on public.customer_subscriptions(organization_id, provider, provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists customer_subscriptions_provider_subscription_uidx
  on public.customer_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.customer_subscription_provider_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  subscription_id uuid not null references public.customer_subscriptions(id) on delete cascade,
  provider text not null,
  event_type text not null,
  provider_event_id text not null,
  provider_payment_id text,
  provider_mandate_id text,
  provider_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create index if not exists customer_subscription_provider_events_subscription_idx
  on public.customer_subscription_provider_events(organization_id, subscription_id, created_at desc);

alter table public.customer_subscription_provider_events enable row level security;

-- Provider events are server/admin audit data. Customers do not mutate or read raw provider payloads.
do $$ begin
 if to_regprocedure('public.command_center_is_admin()') is not null then
  execute 'create policy customer_subscription_provider_events_admin_read on public.customer_subscription_provider_events for select to authenticated using(public.command_center_is_admin())';
 end if;
exception when duplicate_object then null; end $$;

comment on table public.customer_subscription_provider_events is
  'Append-only provider audit/idempotency bridge for customer subscriptions. Payment truth must be verified server-side before projection.';
comment on column public.customer_subscriptions.provider_mandate_id is
  'External provider mandate reference only; never domain identity.';
comment on column public.customer_subscriptions.provider_first_payment_id is
  'External first-payment reference used to establish/verify recurring mandate.';
