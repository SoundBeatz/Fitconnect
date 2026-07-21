-- FitConnect Commerce Core v1
-- Provider-neutral cart, checkout, payments, webhooks and refunds.
create extension if not exists pgcrypto;

create table if not exists public.commerce_carts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  session_token uuid not null default gen_random_uuid() unique,
  status text not null default 'active' check (status in ('active','checkout','converted','abandoned','expired')),
  currency char(3) not null default 'EUR',
  customer_email text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now()+interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.commerce_carts(id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  quantity numeric(12,3) not null default 1 check (quantity>0),
  unit_price numeric(14,4) not null check (unit_price>=0),
  tax_rate numeric(7,4) not null default 21 check (tax_rate>=0),
  product_name text not null,
  sku text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  cart_id uuid not null references public.commerce_carts(id),
  user_id uuid references auth.users(id) on delete set null,
  -- Sales Orders is an optional business module. The foreign key is added
  -- below when that module is installed, so Commerce can be deployed first.
  sales_order_id uuid,
  status text not null default 'open' check (status in ('open','processing','completed','expired','cancelled')),
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  company_name text,
  billing_address jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  subtotal numeric(14,2) not null default 0 check (subtotal>=0),
  tax_total numeric(14,2) not null default 0 check (tax_total>=0),
  grand_total numeric(14,2) not null default 0 check (grand_total>=0),
  currency char(3) not null default 'EUR',
  selected_payment_provider text check (selected_payment_provider in ('mollie','stripe','invoice')),
  idempotency_key uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now()+interval '2 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  checkout_session_id uuid not null references public.commerce_checkout_sessions(id),
  provider text not null check (provider in ('mollie','stripe','invoice')),
  provider_payment_id text,
  status text not null default 'created' check (status in ('created','pending','authorized','paid','failed','cancelled','expired','refunded','partially_refunded')),
  amount numeric(14,2) not null check (amount>=0),
  refunded_amount numeric(14,2) not null default 0 check (refunded_amount>=0 and refunded_amount<=amount),
  currency char(3) not null default 'EUR',
  checkout_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_payment_id)
);

create table if not exists public.commerce_payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  payment_id uuid references public.commerce_payments(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider,provider_event_id)
);

create table if not exists public.commerce_refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  payment_id uuid not null references public.commerce_payments(id),
  provider_refund_id text,
  amount numeric(14,2) not null check (amount>0),
  currency char(3) not null default 'EUR',
  reason text,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','cancelled')),
  provider_payload jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_id,provider_refund_id)
);

create table if not exists public.commerce_payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.commerce_payments(id) on delete cascade,
  from_status text,
  to_status text not null,
  source text not null default 'system',
  source_event_id uuid references public.commerce_payment_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists commerce_cart_items_product_uq on public.commerce_cart_items(cart_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists commerce_carts_org_status_idx on public.commerce_carts(organization_id,status);
create index if not exists commerce_checkout_org_status_idx on public.commerce_checkout_sessions(organization_id,status);
create index if not exists commerce_payments_org_status_idx on public.commerce_payments(organization_id,status);
create index if not exists commerce_payment_events_payment_idx on public.commerce_payment_events(payment_id,received_at desc);
create index if not exists commerce_refunds_payment_idx on public.commerce_refunds(payment_id,created_at desc);

-- Add the optional Sales Orders relation when both modules are present.
-- Re-running Commerce Core after Sales Orders is installed activates it.
do $commerce_sales_orders$
begin
  if to_regclass('public.sales_orders') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid='public.commerce_checkout_sessions'::regclass
         and conname='commerce_checkout_sessions_sales_order_id_fkey'
     ) then
    execute 'alter table public.commerce_checkout_sessions '
      'add constraint commerce_checkout_sessions_sales_order_id_fkey '
      'foreign key (sales_order_id) references public.sales_orders(id)';
  end if;
end $commerce_sales_orders$;

alter table public.commerce_carts enable row level security;
alter table public.commerce_cart_items enable row level security;
alter table public.commerce_checkout_sessions enable row level security;
alter table public.commerce_payments enable row level security;
alter table public.commerce_payment_events enable row level security;
alter table public.commerce_refunds enable row level security;
alter table public.commerce_payment_status_history enable row level security;

-- Compatible with both organization_members and organization_memberships deployments.
create or replace function public.commerce_is_member(p_organization_id uuid)
returns boolean language plpgsql stable security definer set search_path=public as $commerce_member$
begin
  if to_regclass('public.organization_memberships') is not null then
    return exists(select 1 from public.organization_memberships m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active');
  elsif to_regclass('public.organization_members') is not null then
    return exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.status='active');
  end if;
  return false;
end $commerce_member$;

drop policy if exists commerce_carts_tenant on public.commerce_carts;
create policy commerce_carts_tenant on public.commerce_carts for all to authenticated using(public.commerce_is_member(organization_id) and (user_id=auth.uid() or user_id is null)) with check(public.commerce_is_member(organization_id) and (user_id=auth.uid() or user_id is null));
drop policy if exists commerce_cart_items_tenant on public.commerce_cart_items;
create policy commerce_cart_items_tenant on public.commerce_cart_items for all to authenticated using(exists(select 1 from public.commerce_carts c where c.id=cart_id and public.commerce_is_member(c.organization_id))) with check(exists(select 1 from public.commerce_carts c where c.id=cart_id and public.commerce_is_member(c.organization_id)));
drop policy if exists commerce_checkout_tenant on public.commerce_checkout_sessions;
create policy commerce_checkout_tenant on public.commerce_checkout_sessions for select to authenticated using(public.commerce_is_member(organization_id));
drop policy if exists commerce_payments_tenant_read on public.commerce_payments;
create policy commerce_payments_tenant_read on public.commerce_payments for select to authenticated using(public.commerce_is_member(organization_id));
drop policy if exists commerce_refunds_tenant_read on public.commerce_refunds;
create policy commerce_refunds_tenant_read on public.commerce_refunds for select to authenticated using(public.commerce_is_member(organization_id));

create or replace function public.commerce_cart_totals(p_cart_id uuid)
returns table(subtotal numeric,tax_total numeric,grand_total numeric,item_count bigint)
language sql stable security definer set search_path=public as $commerce_totals$
  select round(coalesce(sum(i.unit_price*i.quantity),0),2),round(coalesce(sum(i.unit_price*i.quantity*i.tax_rate/100),0),2),round(coalesce(sum(i.unit_price*i.quantity*(1+i.tax_rate/100)),0),2),coalesce(sum(ceil(i.quantity)),0)::bigint
  from public.commerce_cart_items i join public.commerce_carts c on c.id=i.cart_id
  where i.cart_id=p_cart_id and public.commerce_is_member(c.organization_id)
$commerce_totals$;

create or replace function public.commerce_record_payment_status(p_payment_id uuid,p_status text,p_source text default 'webhook',p_event_id uuid default null)
returns public.commerce_payments language plpgsql security definer set search_path=public as $commerce_status$
declare v_payment public.commerce_payments%rowtype; v_old text;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'Server access required'; end if;
  select * into v_payment from public.commerce_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p_status not in ('created','pending','authorized','paid','failed','cancelled','expired','refunded','partially_refunded') then raise exception 'Invalid payment status'; end if;
  v_old:=v_payment.status;
  if v_old=p_status then return v_payment; end if;
  update public.commerce_payments set status=p_status,paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end,updated_at=now() where id=p_payment_id returning * into v_payment;
  insert into public.commerce_payment_status_history(payment_id,from_status,to_status,source,source_event_id) values(p_payment_id,v_old,p_status,p_source,p_event_id);
  if p_status='paid' then update public.commerce_checkout_sessions set status='completed',completed_at=coalesce(completed_at,now()),updated_at=now() where id=v_payment.checkout_session_id; end if;
  return v_payment;
end $commerce_status$;

revoke all on function public.commerce_is_member(uuid),public.commerce_cart_totals(uuid),public.commerce_record_payment_status(uuid,text,text,uuid) from public,anon;
grant execute on function public.commerce_cart_totals(uuid) to authenticated;
grant execute on function public.commerce_record_payment_status(uuid,text,text,uuid) to service_role;
grant select,insert,update,delete on public.commerce_carts,public.commerce_cart_items to authenticated;
grant select on public.commerce_checkout_sessions,public.commerce_payments,public.commerce_refunds to authenticated;
grant usage on schema public to service_role;
grant select,insert,update,delete on public.commerce_carts,public.commerce_cart_items,public.commerce_checkout_sessions,public.commerce_payments,public.commerce_payment_events,public.commerce_refunds,public.commerce_payment_status_history to service_role;

-- Rewards is optional. If it is already installed, activate its payment hook
-- in the same run; otherwise the Rewards setup can safely be re-run later.
do $commerce_rewards$
begin
  if to_regprocedure('public.process_payment_fitcoins()') is not null then
    execute 'drop trigger if exists commerce_payment_fitcoins_trigger on public.commerce_payments';
    execute 'create trigger commerce_payment_fitcoins_trigger after update of status on public.commerce_payments for each row execute function public.process_payment_fitcoins()';
  end if;
end $commerce_rewards$;

comment on table public.commerce_payment_events is 'Immutable idempotent inbound provider webhook journal.';
comment on function public.commerce_record_payment_status(uuid,text,text,uuid) is 'Server-only payment state transition used by Mollie, Stripe and future providers.';
