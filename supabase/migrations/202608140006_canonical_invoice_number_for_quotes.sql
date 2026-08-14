begin;

create or replace function public.commerce_next_invoice_number(p_organization_id uuid, p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_year integer:=extract(year from coalesce(p_at,now()))::integer;
  v_next integer;
begin
  if p_organization_id is null then raise exception 'Organization is required'; end if;
  insert into public.commerce_invoice_number_sequences(organization_id,fiscal_year,last_number)
    select p_organization_id,v_year,coalesce(max(nullif(right(invoice_number,6),'')::integer),0)+1
    from public.commerce_invoices
    where organization_id=p_organization_id and invoice_number like 'FC-'||v_year||'-%'
  on conflict(organization_id,fiscal_year)
    do update set last_number=greatest(public.commerce_invoice_number_sequences.last_number,
      coalesce((select max(nullif(right(i.invoice_number,6),'')::integer) from public.commerce_invoices i where i.organization_id=p_organization_id and i.invoice_number like 'FC-'||v_year||'-%'),0))+1,
      updated_at=now()
  returning last_number into v_next;
  return 'FC-'||v_year||'-'||lpad(v_next::text,6,'0');
end;
$$;
revoke all on function public.commerce_next_invoice_number(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.commerce_next_invoice_number(uuid,timestamptz) to service_role;

create or replace function public.commerce_customer_accept_quote(p_quote_id uuid)
returns public.commerce_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.commerce_quotes%rowtype;
  v_invoice public.commerce_invoices%rowtype;
  v_supplier jsonb;
  v_invoice_number text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_quote from public.commerce_quotes where id=p_quote_id and portal_user_id=auth.uid() for update;
  if not found then raise exception 'Quote not found'; end if;
  if v_quote.invoice_id is not null then
    select * into v_invoice from public.commerce_invoices where id=v_quote.invoice_id;
    if found then return v_invoice; end if;
  end if;
  if v_quote.status<>'approved' then raise exception 'Quote is not available for acceptance'; end if;
  if v_quote.valid_until is not null and v_quote.valid_until<now() then
    update public.commerce_quotes set status='expired',updated_by=auth.uid(),updated_at=now() where id=v_quote.id;
    raise exception 'Quote has expired';
  end if;
  v_supplier:=public.commerce_current_supplier_snapshot(v_quote.organization_id);
  v_invoice_number:=public.commerce_next_invoice_number(v_quote.organization_id,now());
  insert into public.commerce_invoices(organization_id,invoice_customer_id,invoice_number,status,issued_at,currency,subtotal,tax_total,grand_total,supplier_snapshot,customer_snapshot,line_snapshot,source_channel,payment_method,payment_status,delivery_method,notes,due_at,created_by)
  values(v_quote.organization_id,v_quote.invoice_customer_id,v_invoice_number,'issued',now(),v_quote.currency,v_quote.subtotal,v_quote.tax_total,v_quote.grand_total,v_supplier,v_quote.customer_snapshot,v_quote.line_snapshot,'quote','payment_link','unpaid',null,v_quote.customer_note,now()+interval '14 days',auth.uid())
  returning * into v_invoice;
  update public.commerce_quotes set status='converted_to_invoice',accepted_at=now(),converted_at=now(),invoice_id=v_invoice.id,updated_by=auth.uid(),updated_at=now() where id=v_quote.id;
  return v_invoice;
exception when unique_violation then
  select i.* into v_invoice from public.commerce_invoices i join public.commerce_quotes q on q.invoice_id=i.id where q.id=p_quote_id limit 1;
  if found then return v_invoice; end if;
  raise;
end;
$$;
revoke all on function public.commerce_customer_accept_quote(uuid) from public,anon;
grant execute on function public.commerce_customer_accept_quote(uuid) to authenticated;

commit;
