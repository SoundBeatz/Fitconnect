begin;

create table if not exists public.commerce_invoice_issuers (
  organization_id uuid primary key,
  supplier_snapshot jsonb not null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_invoice_issuers_snapshot_object check (jsonb_typeof(supplier_snapshot) = 'object')
);

alter table public.commerce_invoice_issuers enable row level security;
revoke all on public.commerce_invoice_issuers from anon;
grant select on public.commerce_invoice_issuers to authenticated;
grant all on public.commerce_invoice_issuers to service_role;

drop policy if exists commerce_invoice_issuers_admin_all on public.commerce_invoice_issuers;
create policy commerce_invoice_issuers_admin_all on public.commerce_invoice_issuers
for all to authenticated
using (public.command_center_is_admin())
with check (public.command_center_is_admin());

-- Bootstrap each organization from its latest known valid fiscal snapshot.
insert into public.commerce_invoice_issuers(organization_id, supplier_snapshot)
select distinct on (organization_id) organization_id, supplier_snapshot
from public.commerce_invoices
where supplier_snapshot <> '{}'::jsonb
order by organization_id, created_at desc
on conflict (organization_id) do nothing;

create or replace function public.commerce_current_supplier_snapshot(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_snapshot jsonb;
begin
  select supplier_snapshot into v_snapshot
  from public.commerce_invoice_issuers
  where organization_id = p_organization_id;
  if v_snapshot is null or v_snapshot = '{}'::jsonb then
    raise exception 'Invoice issuer profile is not configured';
  end if;
  return v_snapshot;
end;
$$;

revoke all on function public.commerce_current_supplier_snapshot(uuid) from public, anon;
grant execute on function public.commerce_current_supplier_snapshot(uuid) to authenticated, service_role;

create or replace function public.commerce_admin_update_invoice_issuer(p_supplier_snapshot jsonb)
returns public.commerce_invoice_issuers
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid; v_row public.commerce_invoice_issuers%rowtype;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  if jsonb_typeof(p_supplier_snapshot) <> 'object' or p_supplier_snapshot = '{}'::jsonb then raise exception 'Supplier snapshot is required'; end if;
  v_org := public.commerce_current_organization();
  if v_org is null then raise exception 'Organization context required'; end if;
  insert into public.commerce_invoice_issuers(organization_id,supplier_snapshot,updated_by,updated_at)
  values(v_org,p_supplier_snapshot,auth.uid(),now())
  on conflict(organization_id) do update set supplier_snapshot=excluded.supplier_snapshot,updated_by=auth.uid(),updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.commerce_admin_update_invoice_issuer(jsonb) from public, anon;
grant execute on function public.commerce_admin_update_invoice_issuer(jsonb) to authenticated;

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
  v_year integer := extract(year from now())::integer;
  v_next integer;
  v_invoice_number text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_quote from public.commerce_quotes
  where id = p_quote_id and portal_user_id = auth.uid()
  for update;
  if not found then raise exception 'Quote not found'; end if;

  if v_quote.invoice_id is not null then
    select * into v_invoice from public.commerce_invoices where id = v_quote.invoice_id;
    if found then return v_invoice; end if;
  end if;

  if v_quote.status <> 'approved' then raise exception 'Quote is not available for acceptance'; end if;
  if v_quote.valid_until is not null and v_quote.valid_until < now() then
    update public.commerce_quotes set status='expired', updated_by=auth.uid(), updated_at=now() where id=v_quote.id;
    raise exception 'Quote has expired';
  end if;

  v_supplier := public.commerce_current_supplier_snapshot(v_quote.organization_id);

  insert into public.commerce_invoice_number_sequences(organization_id,fiscal_year,last_number)
  values(v_quote.organization_id,v_year,1)
  on conflict(organization_id,fiscal_year)
  do update set last_number=public.commerce_invoice_number_sequences.last_number+1,updated_at=now()
  returning last_number into v_next;
  v_invoice_number := 'FC-' || v_year || '-' || lpad(v_next::text,6,'0');

  insert into public.commerce_invoices(
    organization_id, invoice_customer_id, invoice_number, status, issued_at,
    currency, subtotal, tax_total, grand_total, supplier_snapshot, customer_snapshot,
    line_snapshot, source_channel, payment_method, payment_status, delivery_method,
    notes, due_at, created_by
  ) values (
    v_quote.organization_id, v_quote.invoice_customer_id, v_invoice_number, 'issued', now(),
    v_quote.currency, v_quote.subtotal, v_quote.tax_total, v_quote.grand_total,
    v_supplier, v_quote.customer_snapshot, v_quote.line_snapshot, 'quote',
    'payment_link', 'unpaid', null, v_quote.customer_note, now() + interval '14 days', auth.uid()
  ) returning * into v_invoice;

  update public.commerce_quotes set
    status='converted_to_invoice', accepted_at=now(), converted_at=now(), invoice_id=v_invoice.id,
    updated_by=auth.uid(), updated_at=now()
  where id=v_quote.id;

  return v_invoice;
end;
$$;

revoke all on function public.commerce_customer_accept_quote(uuid) from public, anon;
grant execute on function public.commerce_customer_accept_quote(uuid) to authenticated;

commit;
