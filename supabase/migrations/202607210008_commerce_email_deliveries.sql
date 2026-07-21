-- Auditable and idempotent transactional email delivery for Commerce.

create table if not exists public.commerce_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  checkout_session_id uuid not null references public.commerce_checkout_sessions(id) on delete cascade,
  email_type text not null check (email_type in ('order_paid','order_shipped','order_cancelled','order_refunded')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_session_id, email_type)
);

create index if not exists commerce_email_delivery_status_idx
  on public.commerce_email_deliveries (status, created_at);

alter table public.commerce_email_deliveries enable row level security;
revoke all on public.commerce_email_deliveries from anon, authenticated;
grant select, insert, update, delete on public.commerce_email_deliveries to service_role;

notify pgrst, 'reload schema';
