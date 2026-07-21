-- Align legacy Commerce installations with the secure checkout contract.
-- This migration is intentionally idempotent.

alter table if exists public.commerce_carts
  add column if not exists organization_id uuid,
  add column if not exists customer_email text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.commerce_checkout_sessions
  add column if not exists organization_id uuid,
  add column if not exists company_name text,
  add column if not exists billing_address jsonb not null default '{}'::jsonb,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key uuid default gen_random_uuid(),
  add column if not exists completed_at timestamptz;

alter table if exists public.commerce_payments
  add column if not exists organization_id uuid,
  add column if not exists checkout_url text,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists refunded_amount numeric(14,2) not null default 0;

create unique index if not exists commerce_checkout_idempotency_uq
  on public.commerce_checkout_sessions(idempotency_key)
  where idempotency_key is not null;

create index if not exists commerce_carts_org_status_idx
  on public.commerce_carts(organization_id, status);
create index if not exists commerce_checkout_org_status_idx
  on public.commerce_checkout_sessions(organization_id, status);
create index if not exists commerce_payments_org_status_idx
  on public.commerce_payments(organization_id, status);

-- The public shop currently reads from public.products. An older Commerce
-- bootstrap tied cart items to catalog_products and rejects otherwise-valid
-- public product UUIDs. Product integrity is checked server-side before insert.
do $drop_legacy_product_fk$
declare
  constraint_name text;
begin
  if to_regclass('public.commerce_cart_items') is null then return; end if;
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class source_table on source_table.oid = c.conrelid
    join pg_namespace source_schema on source_schema.oid = source_table.relnamespace
    join pg_class target_table on target_table.oid = c.confrelid
    join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
    where c.contype = 'f'
      and source_schema.nspname = 'public'
      and source_table.relname = 'commerce_cart_items'
      and target_schema.nspname = 'public'
      and target_table.relname = 'catalog_products'
  loop
    execute format('alter table public.commerce_cart_items drop constraint %I', constraint_name);
  end loop;
end
$drop_legacy_product_fk$;

