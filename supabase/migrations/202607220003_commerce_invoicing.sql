create table if not exists public.commerce_invoice_sequences (
  fiscal_year integer primary key,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  checkout_session_id uuid not null references public.commerce_checkout_sessions(id),
  payment_id uuid not null references public.commerce_payments(id),
  invoice_number text not null unique,
  status text not null default 'issued' check (status in ('issued','credited','void')),
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  currency char(3) not null default 'EUR',
  subtotal numeric(14,2) not null,
  tax_total numeric(14,2) not null,
  grand_total numeric(14,2) not null,
  supplier_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  line_snapshot jsonb not null,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(checkout_session_id),
  unique(payment_id)
);

create index if not exists commerce_invoices_org_issued_idx on public.commerce_invoices(organization_id, issued_at desc);

create or replace function public.commerce_create_invoice_snapshot(
  p_organization_id uuid,
  p_checkout_session_id uuid,
  p_payment_id uuid,
  p_paid_at timestamptz,
  p_currency char(3),
  p_subtotal numeric,
  p_tax_total numeric,
  p_grand_total numeric,
  p_supplier_snapshot jsonb,
  p_customer_snapshot jsonb,
  p_line_snapshot jsonb
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $invoice$
declare
  v_existing public.commerce_invoices%rowtype;
  v_year integer := extract(year from coalesce(p_paid_at, now()))::integer;
  v_sequence integer;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then
    raise exception 'Server access required';
  end if;

  select * into v_existing from public.commerce_invoices
    where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id
    order by created_at limit 1;
  if found then return v_existing; end if;

  insert into public.commerce_invoice_sequences(fiscal_year,last_number)
    values(v_year,1)
    on conflict(fiscal_year) do update
      set last_number=public.commerce_invoice_sequences.last_number+1,updated_at=now()
    returning last_number into v_sequence;

  insert into public.commerce_invoices(
    organization_id,checkout_session_id,payment_id,invoice_number,issued_at,paid_at,currency,
    subtotal,tax_total,grand_total,supplier_snapshot,customer_snapshot,line_snapshot
  ) values(
    p_organization_id,p_checkout_session_id,p_payment_id,
    'FC-'||v_year::text||'-'||lpad(v_sequence::text,6,'0'),
    coalesce(p_paid_at,now()),p_paid_at,p_currency,p_subtotal,p_tax_total,p_grand_total,
    p_supplier_snapshot,p_customer_snapshot,p_line_snapshot
  ) returning * into v_existing;
  return v_existing;
exception when unique_violation then
  select * into v_existing from public.commerce_invoices
    where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id
    order by created_at limit 1;
  return v_existing;
end
$invoice$;

alter table public.commerce_invoice_sequences enable row level security;
alter table public.commerce_invoices enable row level security;

drop policy if exists commerce_invoices_customer_read on public.commerce_invoices;
create policy commerce_invoices_customer_read on public.commerce_invoices for select to authenticated
using(exists(
  select 1 from public.commerce_checkout_sessions checkout
  where checkout.id=checkout_session_id and checkout.user_id=auth.uid()
));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('commerce-invoices','commerce-invoices',false,5242880,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf'];

revoke all on public.commerce_invoice_sequences from public,anon,authenticated;
revoke all on function public.commerce_create_invoice_snapshot(uuid,uuid,uuid,timestamptz,char,numeric,numeric,numeric,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_create_invoice_snapshot(uuid,uuid,uuid,timestamptz,char,numeric,numeric,numeric,jsonb,jsonb,jsonb) to service_role;
grant select,insert,update on public.commerce_invoice_sequences,public.commerce_invoices to service_role;
grant select on public.commerce_invoices to authenticated;

comment on table public.commerce_invoices is 'Immutable fiscal invoice snapshots created once after verified payment.';
comment on function public.commerce_create_invoice_snapshot(uuid,uuid,uuid,timestamptz,char,numeric,numeric,numeric,jsonb,jsonb,jsonb) is 'Atomically allocates an annual FitConnect invoice number and immutable snapshot.';
