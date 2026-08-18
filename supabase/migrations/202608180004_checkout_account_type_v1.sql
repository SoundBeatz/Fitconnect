-- Checkout account type v1
-- Canonical values are profiles.account_type: private | business.
-- UI compatibility accepts commerce cart metadata customer_type=consumer | business.

alter table public.commerce_checkout_sessions
  add column if not exists account_type text,
  add column if not exists chamber_of_commerce text,
  add column if not exists vat_number text;

do $$ begin
  alter table public.commerce_checkout_sessions
    add constraint commerce_checkout_sessions_account_type_check
    check (account_type is null or account_type in ('private','business'));
exception when duplicate_object then null; end $$;

create or replace function public.commerce_sanitize_checkout_cart_customer()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_type text := lower(coalesce(new.metadata->>'customer_type', new.metadata->>'account_type', 'private'));
begin
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  if v_type = 'business' then
    new.metadata := new.metadata || jsonb_build_object(
      'customer_type','business',
      'account_type','business',
      'company_name',nullif(trim(coalesce(new.metadata->>'company_name','')),''),
      'kvk_number',nullif(regexp_replace(coalesce(new.metadata->>'kvk_number',''),'\D','','g'),''),
      'vat_number',nullif(upper(regexp_replace(coalesce(new.metadata->>'vat_number',''),'[\s.-]','','g')),'')
    );
  else
    new.metadata := (new.metadata - 'company_name' - 'kvk_number' - 'vat_number')
      || jsonb_build_object('customer_type','consumer','account_type','private');
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_sanitize_checkout_cart_customer_trg on public.commerce_carts;
create trigger commerce_sanitize_checkout_cart_customer_trg
before insert or update of metadata on public.commerce_carts
for each row execute function public.commerce_sanitize_checkout_cart_customer();

create or replace function public.commerce_apply_checkout_account_type()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_metadata jsonb := '{}'::jsonb;
  v_type text := 'private';
begin
  if new.cart_id is not null then
    select coalesce(metadata,'{}'::jsonb) into v_metadata
    from public.commerce_carts where id=new.cart_id;
  end if;
  v_type := case when lower(coalesce(v_metadata->>'account_type',v_metadata->>'customer_type','private'))='business' then 'business' else 'private' end;
  new.account_type := v_type;
  if v_type='business' then
    new.company_name := nullif(trim(coalesce(v_metadata->>'company_name',new.company_name,'')),'');
    new.chamber_of_commerce := nullif(regexp_replace(coalesce(v_metadata->>'kvk_number',''),'\D','','g'),'');
    new.vat_number := nullif(upper(regexp_replace(coalesce(v_metadata->>'vat_number',''),'[\s.-]','','g')),'');
  else
    new.company_name := null;
    new.chamber_of_commerce := null;
    new.vat_number := null;
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_apply_checkout_account_type_trg on public.commerce_checkout_sessions;
create trigger commerce_apply_checkout_account_type_trg
before insert or update of cart_id,company_name on public.commerce_checkout_sessions
for each row execute function public.commerce_apply_checkout_account_type();

create or replace function public.commerce_checkout_sync_profile_account_type()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.user_id is not null then
    update public.profiles
       set account_type = coalesce(new.account_type,'private'),
           company_name = case when new.account_type='business' then new.company_name else null end,
           chamber_of_commerce = case when new.account_type='business' then new.chamber_of_commerce else null end,
           vat_number = case when new.account_type='business' then new.vat_number else null end,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_checkout_sync_profile_account_type_trg on public.commerce_checkout_sessions;
create trigger commerce_checkout_sync_profile_account_type_trg
after insert or update of account_type,company_name,chamber_of_commerce,vat_number on public.commerce_checkout_sessions
for each row execute function public.commerce_checkout_sync_profile_account_type();

create or replace function public.commerce_invoice_customer_account_type()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_business boolean := nullif(trim(coalesce(new.customer_snapshot->>'company','')),'') is not null;
begin
  new.customer_snapshot := coalesce(new.customer_snapshot,'{}'::jsonb);
  if v_business then
    new.customer_snapshot := new.customer_snapshot || jsonb_build_object('account_type','business');
  else
    new.customer_snapshot := (new.customer_snapshot - 'company' - 'kvk_number' - 'vat_number')
      || jsonb_build_object('account_type','private');
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_invoice_customer_account_type_trg on public.commerce_invoices;
create trigger commerce_invoice_customer_account_type_trg
before insert or update of customer_snapshot on public.commerce_invoices
for each row execute function public.commerce_invoice_customer_account_type();

-- Backfill existing canonical records without changing payment/order ownership.
update public.commerce_carts
set metadata=metadata
where metadata is not null;

update public.commerce_checkout_sessions
set cart_id=cart_id
where cart_id is not null;

update public.commerce_invoices
set customer_snapshot=customer_snapshot
where customer_snapshot is not null;

notify pgrst,'reload schema';
