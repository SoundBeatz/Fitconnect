create table if not exists public.customer_credit_packages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null,
 name text not null, description text, price numeric(14,2) not null check(price>0), credit_amount numeric(14,2) not null check(credit_amount>0), currency text not null default 'EUR', active boolean not null default true,
 sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customer_credit_purchases (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_user_id uuid not null,
 package_id uuid not null references public.customer_credit_packages(id) on delete restrict,
 amount_paid numeric(14,2) not null check(amount_paid>0), credit_amount numeric(14,2) not null check(credit_amount>0), currency text not null default 'EUR',
 provider text not null default 'mollie' check(provider in ('mollie')), provider_payment_id text unique, checkout_url text,
 status text not null default 'created' check(status in ('created','pending','paid','failed','cancelled','expired','refunded')),
 idempotency_key uuid not null, paid_at timestamptz, credited_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,customer_user_id,idempotency_key)
);
create index if not exists customer_credit_purchases_customer_idx on public.customer_credit_purchases(organization_id,customer_user_id,created_at desc);
alter table public.customer_credit_packages enable row level security;
alter table public.customer_credit_purchases enable row level security;
create policy customer_credit_packages_read on public.customer_credit_packages for select to authenticated using(active=true and organization_id=public.commerce_current_organization());
create policy customer_credit_purchases_own_read on public.customer_credit_purchases for select to authenticated using(customer_user_id=auth.uid() and organization_id=public.commerce_current_organization());
create policy customer_credit_packages_admin_all on public.customer_credit_packages for all to authenticated using(public.command_center_is_admin() and organization_id=public.commerce_current_organization()) with check(public.command_center_is_admin() and organization_id=public.commerce_current_organization());
create policy customer_credit_purchases_admin_read on public.customer_credit_purchases for select to authenticated using(public.command_center_is_admin() and organization_id=public.commerce_current_organization());

create or replace function public.customer_credit_finalize_purchase(p_purchase_id uuid,p_provider_payment_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v public.customer_credit_purchases%rowtype; v_wallet uuid; begin
 select * into v from public.customer_credit_purchases where id=p_purchase_id for update;
 if not found then raise exception 'Purchase not found'; end if;
 if v.provider_payment_id is distinct from p_provider_payment_id then raise exception 'Provider payment mismatch'; end if;
 if v.credited_at is not null then return false; end if;
 if v.status<>'paid' then raise exception 'Purchase is not paid'; end if;
 insert into public.customer_wallets(organization_id,customer_user_id,currency) values(v.organization_id,v.customer_user_id,v.currency)
 on conflict(organization_id,customer_user_id,currency) do update set updated_at=now() returning id into v_wallet;
 insert into public.customer_wallet_ledger(wallet_id,organization_id,customer_user_id,entry_type,amount,currency,reference_type,reference_id,description,idempotency_key,created_by)
 values(v_wallet,v.organization_id,v.customer_user_id,'purchase',v.credit_amount,v.currency,'credit_purchase',v.id,'Aankoop FitConnect-tegoed','credit-purchase:'||v.id,null);
 update public.customer_credit_purchases set credited_at=now(),updated_at=now() where id=v.id;
 return true;
end $$;
revoke all on function public.customer_credit_finalize_purchase(uuid,text) from public,anon,authenticated;
grant execute on function public.customer_credit_finalize_purchase(uuid,text) to service_role;
