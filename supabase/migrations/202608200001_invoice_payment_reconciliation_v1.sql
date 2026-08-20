-- Reconcile paid webshop payments with their canonical invoice state.
-- Only exact payment-id + amount matches are backfilled.

update public.commerce_invoices i
set
  payment_status = 'paid',
  status = case when i.status in ('credited','void') then i.status else 'paid' end,
  payment_method = coalesce(i.payment_method, case when p.provider = 'mollie' then 'mollie' else null end),
  paid_at = coalesce(i.paid_at, p.paid_at),
  updated_at = now()
from public.commerce_payments p
where i.payment_id = p.id
  and p.status = 'paid'
  and round(i.grand_total, 2) = round(p.amount, 2)
  and i.payment_status <> 'paid'
  and i.status not in ('credited','void');

create or replace function public.commerce_create_invoice_snapshot(
  p_organization_id uuid,p_checkout_session_id uuid,p_payment_id uuid,p_paid_at timestamptz,
  p_currency char(3),p_subtotal numeric,p_tax_total numeric,p_grand_total numeric,
  p_supplier_snapshot jsonb,p_customer_snapshot jsonb,p_line_snapshot jsonb
) returns public.commerce_invoices
language plpgsql security definer set search_path=public as $web_invoice$
declare
  v_invoice public.commerce_invoices%rowtype;
  v_year integer:=extract(year from coalesce(p_paid_at,now()))::integer;
  v_next integer;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then
    raise exception 'Server access required';
  end if;

  select * into v_invoice
  from public.commerce_invoices
  where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id
  order by created_at
  limit 1
  for update;

  if found then
    if v_invoice.status='draft' or v_invoice.invoice_number is null then
      raise exception 'Existing draft invoice cannot be reconciled as paid';
    end if;
    if round(v_invoice.grand_total,2) <> round(p_grand_total,2) then
      raise exception 'Existing invoice total mismatch';
    end if;
    if v_invoice.status not in ('credited','void') then
      update public.commerce_invoices
      set
        checkout_session_id=coalesce(v_invoice.checkout_session_id,p_checkout_session_id),
        payment_id=coalesce(v_invoice.payment_id,p_payment_id),
        status='paid',
        payment_status='paid',
        payment_method=coalesce(v_invoice.payment_method,'mollie'),
        paid_at=coalesce(v_invoice.paid_at,p_paid_at,now()),
        updated_at=now()
      where id=v_invoice.id
      returning * into v_invoice;
    end if;
    return v_invoice;
  end if;

  insert into public.commerce_invoice_number_sequences(organization_id,fiscal_year,last_number)
    select p_organization_id,v_year,coalesce(max(nullif(right(invoice_number,6),'')::integer),0)+1
      from public.commerce_invoices
      where organization_id=p_organization_id
        and invoice_number like 'FC-'||v_year||'-%'
    on conflict(organization_id,fiscal_year)
    do update set last_number=commerce_invoice_number_sequences.last_number+1,updated_at=now()
    returning last_number into v_next;

  insert into public.commerce_invoices(
    organization_id,checkout_session_id,payment_id,invoice_number,status,issued_at,paid_at,currency,
    subtotal,tax_total,grand_total,supplier_snapshot,customer_snapshot,line_snapshot,
    source_channel,payment_method,payment_status
  ) values(
    p_organization_id,p_checkout_session_id,p_payment_id,
    'FC-'||v_year||'-'||lpad(v_next::text,6,'0'),'paid',
    coalesce(p_paid_at,now()),p_paid_at,p_currency,p_subtotal,p_tax_total,p_grand_total,
    p_supplier_snapshot,p_customer_snapshot,p_line_snapshot,'webshop','mollie','paid'
  ) returning * into v_invoice;
  return v_invoice;
exception when unique_violation then
  select * into v_invoice
  from public.commerce_invoices
  where checkout_session_id=p_checkout_session_id or payment_id=p_payment_id
  order by created_at
  limit 1;
  return v_invoice;
end $web_invoice$;

do $$ begin
  alter table public.commerce_invoices
    add constraint commerce_invoice_paid_timestamp_check
    check (payment_status <> 'paid' or paid_at is not null);
exception when duplicate_object then null; end $$;

notify pgrst,'reload schema';
