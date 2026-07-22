-- Unified FitConnect invoicing for webshop, showroom, warehouse and manual sales.
-- Drafts deliberately have no fiscal number; issuance allocates one atomically.

alter table public.commerce_invoices alter column checkout_session_id drop not null;
alter table public.commerce_invoices alter column payment_id drop not null;
alter table public.commerce_invoices alter column invoice_number drop not null;
alter table public.commerce_invoices drop constraint if exists commerce_invoices_status_check;
alter table public.commerce_invoices add constraint commerce_invoices_status_check
  check (status in ('draft','issued','sent','paid','overdue','credited','void'));
alter table public.commerce_invoices add column if not exists source_channel text not null default 'webshop'
  check (source_channel in ('webshop','showroom','warehouse','manual'));
alter table public.commerce_invoices add column if not exists payment_method text
  check (payment_method is null or payment_method in ('mollie','ideal','pin','qr','payment_link','bank_transfer','cash','invoice'));
alter table public.commerce_invoices add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','pending','paid','partially_paid','refunded'));
alter table public.commerce_invoices add column if not exists due_at timestamptz;
alter table public.commerce_invoices add column if not exists delivery_method text
  check (delivery_method is null or delivery_method in ('pickup_showroom','pickup_warehouse','parcel','freight','own_delivery','installation'));
alter table public.commerce_invoices add column if not exists notes text;
alter table public.commerce_invoices add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.commerce_invoices add constraint commerce_invoice_fiscal_state_check
  check ((status='draft' and invoice_number is null) or (status<>'draft' and invoice_number is not null)) not valid;

create table if not exists public.commerce_invoice_number_sequences (
  organization_id uuid not null,
  fiscal_year integer not null,
  last_number integer not null default 0 check(last_number>=0),
  updated_at timestamptz not null default now(),
  primary key(organization_id,fiscal_year)
);

alter table public.commerce_invoices drop constraint if exists commerce_invoices_invoice_number_key;
drop index if exists commerce_invoice_number_uq;
create unique index commerce_invoice_number_uq
  on public.commerce_invoices(organization_id,invoice_number) where invoice_number is not null;
create index if not exists commerce_invoice_channel_idx
  on public.commerce_invoices(organization_id,source_channel,created_at desc);
create index if not exists commerce_invoice_payment_status_idx
  on public.commerce_invoices(organization_id,payment_status,due_at);

create or replace function public.commerce_create_invoice_draft(
  p_organization_id uuid,
  p_source_channel text,
  p_payment_method text,
  p_delivery_method text,
  p_currency char(3),
  p_supplier_snapshot jsonb,
  p_customer_snapshot jsonb,
  p_line_snapshot jsonb,
  p_notes text default null,
  p_due_at timestamptz default null
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $draft$
declare v_invoice public.commerce_invoices%rowtype; v_subtotal numeric; v_tax numeric;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_line_snapshot)<>'array' or jsonb_array_length(p_line_snapshot)=0 then raise exception 'At least one invoice line is required'; end if;
  select round(coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric),0),2),
         round(coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric*(x->>'tax_rate')::numeric/100),0),2)
    into v_subtotal,v_tax from jsonb_array_elements(p_line_snapshot) x;
  insert into public.commerce_invoices(organization_id,invoice_number,status,currency,subtotal,tax_total,grand_total,
    supplier_snapshot,customer_snapshot,line_snapshot,source_channel,payment_method,payment_status,delivery_method,notes,due_at,created_by)
  values(p_organization_id,null,'draft',coalesce(p_currency,'EUR'),v_subtotal,v_tax,v_subtotal+v_tax,
    p_supplier_snapshot,p_customer_snapshot,p_line_snapshot,p_source_channel,p_payment_method,'unpaid',p_delivery_method,p_notes,p_due_at,auth.uid())
  returning * into v_invoice;
  return v_invoice;
end $draft$;

create or replace function public.commerce_update_invoice_draft(
  p_invoice_id uuid,
  p_organization_id uuid,
  p_source_channel text,
  p_payment_method text,
  p_delivery_method text,
  p_currency char(3),
  p_supplier_snapshot jsonb,
  p_customer_snapshot jsonb,
  p_line_snapshot jsonb,
  p_notes text default null,
  p_due_at timestamptz default null
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $update_draft$
declare v_invoice public.commerce_invoices%rowtype; v_subtotal numeric; v_tax numeric;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_line_snapshot)<>'array' or jsonb_array_length(p_line_snapshot)=0 then raise exception 'At least one invoice line is required'; end if;
  select * into v_invoice from public.commerce_invoices where id=p_invoice_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status<>'draft' then raise exception 'Issued invoices are immutable'; end if;
  select round(coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric),0),2),
         round(coalesce(sum((x->>'quantity')::numeric*(x->>'unit_price')::numeric*(x->>'tax_rate')::numeric/100),0),2)
    into v_subtotal,v_tax from jsonb_array_elements(p_line_snapshot) x;
  update public.commerce_invoices set source_channel=p_source_channel,payment_method=p_payment_method,
    delivery_method=p_delivery_method,currency=coalesce(p_currency,'EUR'),supplier_snapshot=p_supplier_snapshot,
    customer_snapshot=p_customer_snapshot,line_snapshot=p_line_snapshot,subtotal=v_subtotal,tax_total=v_tax,
    grand_total=v_subtotal+v_tax,notes=p_notes,due_at=p_due_at,updated_at=now()
    where id=p_invoice_id returning * into v_invoice;
  return v_invoice;
end $update_draft$;

create or replace function public.commerce_issue_invoice(p_invoice_id uuid)
returns public.commerce_invoices
language plpgsql security definer set search_path=public as $issue$
declare v_invoice public.commerce_invoices%rowtype; v_year integer; v_next integer;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  select * into v_invoice from public.commerce_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status<>'draft' then return v_invoice; end if;
  v_year:=extract(year from now())::integer;
  insert into public.commerce_invoice_number_sequences(organization_id,fiscal_year,last_number)
    select v_invoice.organization_id,v_year,coalesce(max(nullif(right(invoice_number,6),'')::integer),0)+1
      from public.commerce_invoices where organization_id=v_invoice.organization_id
        and invoice_number like 'FC-'||v_year||'-%'
    on conflict(organization_id,fiscal_year) do update set last_number=commerce_invoice_number_sequences.last_number+1,updated_at=now()
    returning last_number into v_next;
  update public.commerce_invoices set invoice_number='FC-'||v_year||'-'||lpad(v_next::text,6,'0'),status='issued',issued_at=now(),updated_at=now()
    where id=p_invoice_id returning * into v_invoice;
  return v_invoice;
end $issue$;

-- Webshop and manual sales deliberately consume the exact same tenant/year sequence.
create or replace function public.commerce_create_invoice_snapshot(
  p_organization_id uuid,p_checkout_session_id uuid,p_payment_id uuid,p_paid_at timestamptz,
  p_currency char(3),p_subtotal numeric,p_tax_total numeric,p_grand_total numeric,
  p_supplier_snapshot jsonb,p_customer_snapshot jsonb,p_line_snapshot jsonb
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $web_invoice$
declare v_invoice public.commerce_invoices%rowtype; v_year integer:=extract(year from coalesce(p_paid_at,now()))::integer; v_next integer;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'Server access required'; end if;
  select * into v_invoice from public.commerce_invoices where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id order by created_at limit 1;
  if found then return v_invoice; end if;
  insert into public.commerce_invoice_number_sequences(organization_id,fiscal_year,last_number)
    select p_organization_id,v_year,coalesce(max(nullif(right(invoice_number,6),'')::integer),0)+1
      from public.commerce_invoices where organization_id=p_organization_id and invoice_number like 'FC-'||v_year||'-%'
    on conflict(organization_id,fiscal_year) do update set last_number=commerce_invoice_number_sequences.last_number+1,updated_at=now()
    returning last_number into v_next;
  insert into public.commerce_invoices(organization_id,checkout_session_id,payment_id,invoice_number,status,issued_at,paid_at,currency,
    subtotal,tax_total,grand_total,supplier_snapshot,customer_snapshot,line_snapshot,source_channel,payment_method,payment_status)
  values(p_organization_id,p_checkout_session_id,p_payment_id,'FC-'||v_year||'-'||lpad(v_next::text,6,'0'),'paid',
    coalesce(p_paid_at,now()),p_paid_at,p_currency,p_subtotal,p_tax_total,p_grand_total,p_supplier_snapshot,p_customer_snapshot,
    p_line_snapshot,'webshop','mollie','paid') returning * into v_invoice;
  return v_invoice;
exception when unique_violation then
  select * into v_invoice from public.commerce_invoices where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id order by created_at limit 1;
  return v_invoice;
end $web_invoice$;

create or replace function public.commerce_register_invoice_payment(
  p_invoice_id uuid,
  p_payment_method text,
  p_paid_at timestamptz default now()
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $paid$
declare v_invoice public.commerce_invoices%rowtype;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  update public.commerce_invoices set payment_status='paid',payment_method=p_payment_method,status='paid',
    paid_at=coalesce(p_paid_at,now()),updated_at=now()
    where id=p_invoice_id and status in ('issued','sent','overdue','paid') returning * into v_invoice;
  if not found then raise exception 'Only an issued invoice can be paid'; end if;
  return v_invoice;
end $paid$;

alter table public.commerce_invoice_number_sequences enable row level security;
drop policy if exists commerce_invoices_admin_all on public.commerce_invoices;
create policy commerce_invoices_admin_all on public.commerce_invoices for all to authenticated
  using(public.command_center_is_admin()) with check(public.command_center_is_admin());
revoke all on public.commerce_invoice_number_sequences from public,anon,authenticated;
revoke all on function public.commerce_create_invoice_draft(uuid,text,text,text,char,jsonb,jsonb,jsonb,text,timestamptz) from public,anon;
revoke all on function public.commerce_update_invoice_draft(uuid,uuid,text,text,text,char,jsonb,jsonb,jsonb,text,timestamptz) from public,anon;
revoke all on function public.commerce_issue_invoice(uuid) from public,anon;
revoke all on function public.commerce_register_invoice_payment(uuid,text,timestamptz) from public,anon;
grant execute on function public.commerce_create_invoice_draft(uuid,text,text,text,char,jsonb,jsonb,jsonb,text,timestamptz) to authenticated,service_role;
grant execute on function public.commerce_update_invoice_draft(uuid,uuid,text,text,text,char,jsonb,jsonb,jsonb,text,timestamptz) to authenticated,service_role;
grant execute on function public.commerce_issue_invoice(uuid) to authenticated,service_role;
grant execute on function public.commerce_register_invoice_payment(uuid,text,timestamptz) to authenticated,service_role;
grant select,insert,update on public.commerce_invoice_number_sequences to service_role;
grant select,insert,update on public.commerce_invoices to authenticated;

comment on function public.commerce_issue_invoice(uuid) is 'Atomically issues a draft using the tenant-year fiscal sequence; repeated calls are idempotent.';
notify pgrst,'reload schema';
