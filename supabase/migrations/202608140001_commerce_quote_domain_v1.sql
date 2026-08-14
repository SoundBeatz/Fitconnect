begin;

create table if not exists public.commerce_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  portal_user_id uuid null references public.profiles(id) on delete set null,
  invoice_customer_id uuid null references public.invoice_customers(id) on delete set null,
  invoice_id uuid null unique references public.commerce_invoices(id) on delete set null,
  quote_number text null,
  status text not null default 'requested' check (status in ('draft','requested','in_review','approved','accepted','rejected','expired','converted_to_invoice','cancelled')),
  source_channel text not null default 'webshop' check (source_channel in ('webshop','portal','showroom','manual','mobile')),
  currency character(3) not null default 'EUR',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12,2) not null default 0 check (grand_total >= 0),
  customer_snapshot jsonb not null default '{}'::jsonb,
  line_snapshot jsonb not null default '[]'::jsonb,
  customer_note text null,
  internal_note text null,
  valid_until timestamptz null,
  approved_at timestamptz null,
  accepted_at timestamptz null,
  rejected_at timestamptz null,
  converted_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_quotes_lines_array check (jsonb_typeof(line_snapshot) = 'array'),
  constraint commerce_quotes_customer_object check (jsonb_typeof(customer_snapshot) = 'object'),
  constraint commerce_quotes_number_state check ((status in ('draft','requested','in_review') and quote_number is null) or (status not in ('draft','requested','in_review') and quote_number is not null))
);

create unique index if not exists commerce_quotes_org_number_uq on public.commerce_quotes(organization_id, quote_number) where quote_number is not null;
create index if not exists commerce_quotes_org_status_idx on public.commerce_quotes(organization_id, status, updated_at desc);
create index if not exists commerce_quotes_portal_user_idx on public.commerce_quotes(portal_user_id, updated_at desc) where portal_user_id is not null;
create index if not exists commerce_quotes_invoice_customer_idx on public.commerce_quotes(invoice_customer_id) where invoice_customer_id is not null;

create table if not exists public.commerce_quote_number_sequences (
  organization_id uuid not null,
  fiscal_year integer not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, fiscal_year)
);

create table if not exists public.commerce_quote_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.commerce_quotes(id) on delete cascade,
  organization_id uuid not null,
  from_status text null,
  to_status text not null,
  note text null,
  changed_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists commerce_quote_status_history_quote_idx on public.commerce_quote_status_history(quote_id, created_at desc);

alter table public.commerce_quotes enable row level security;
alter table public.commerce_quote_number_sequences enable row level security;
alter table public.commerce_quote_status_history enable row level security;

revoke all on public.commerce_quotes from anon;
revoke all on public.commerce_quote_number_sequences from anon, authenticated;
revoke all on public.commerce_quote_status_history from anon;

grant select on public.commerce_quotes to authenticated;
grant select on public.commerce_quote_status_history to authenticated;
grant all on public.commerce_quotes, public.commerce_quote_number_sequences, public.commerce_quote_status_history to service_role;

drop policy if exists commerce_quotes_admin_all on public.commerce_quotes;
create policy commerce_quotes_admin_all on public.commerce_quotes
for all to authenticated
using (public.command_center_is_admin())
with check (public.command_center_is_admin());

drop policy if exists commerce_quotes_customer_read on public.commerce_quotes;
create policy commerce_quotes_customer_read on public.commerce_quotes
for select to authenticated
using (portal_user_id = auth.uid());

drop policy if exists commerce_quote_history_admin_read on public.commerce_quote_status_history;
create policy commerce_quote_history_admin_read on public.commerce_quote_status_history
for select to authenticated
using (public.command_center_is_admin());

drop policy if exists commerce_quote_history_customer_read on public.commerce_quote_status_history;
create policy commerce_quote_history_customer_read on public.commerce_quote_status_history
for select to authenticated
using (exists (
  select 1 from public.commerce_quotes q
  where q.id = quote_id and q.portal_user_id = auth.uid()
));

create or replace function public.commerce_quote_calculate(p_lines jsonb)
returns table(subtotal numeric, tax_total numeric, grand_total numeric)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_line jsonb;
  v_qty numeric;
  v_price numeric;
  v_tax_rate numeric;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one quote line is required';
  end if;
  if jsonb_array_length(p_lines) > 200 then
    raise exception 'Too many quote lines';
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_qty := nullif(v_line->>'quantity','')::numeric;
    v_price := nullif(v_line->>'unit_price','')::numeric;
    v_tax_rate := coalesce(nullif(v_line->>'tax_rate','')::numeric, 21);
    if v_qty is null or v_price is null or v_qty <= 0 or v_qty > 999 or v_price < 0 or v_price > 1000000 or v_tax_rate < 0 or v_tax_rate > 100 then
      raise exception 'Invalid quote line';
    end if;
    v_subtotal := v_subtotal + (v_qty * v_price);
    v_tax := v_tax + (v_qty * v_price * v_tax_rate / 100);
  end loop;

  subtotal := round(v_subtotal, 2);
  tax_total := round(v_tax, 2);
  grand_total := round(v_subtotal + v_tax, 2);
  return next;
end;
$$;

revoke all on function public.commerce_quote_calculate(jsonb) from public, anon;
grant execute on function public.commerce_quote_calculate(jsonb) to authenticated, service_role;

create or replace function public.commerce_quote_status_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.commerce_quote_status_history(quote_id, organization_id, from_status, to_status, changed_by)
    values(new.id, new.organization_id, null, new.status, coalesce(new.updated_by, new.created_by, auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.commerce_quote_status_history(quote_id, organization_id, from_status, to_status, changed_by)
    values(new.id, new.organization_id, old.status, new.status, coalesce(new.updated_by, auth.uid()));
  end if;
  return new;
end;
$$;

revoke all on function public.commerce_quote_status_audit() from public, anon, authenticated;

drop trigger if exists trg_commerce_quote_status_audit on public.commerce_quotes;
create trigger trg_commerce_quote_status_audit
after insert or update of status on public.commerce_quotes
for each row execute function public.commerce_quote_status_audit();

create or replace function public.commerce_admin_create_quote(
  p_portal_user_id uuid,
  p_invoice_customer_id uuid,
  p_customer_snapshot jsonb,
  p_line_snapshot jsonb,
  p_customer_note text default null,
  p_internal_note text default null,
  p_source_channel text default 'manual'
)
returns public.commerce_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_totals record;
  v_quote public.commerce_quotes%rowtype;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  v_org := public.commerce_current_organization();
  if v_org is null then raise exception 'Organization context required'; end if;
  select * into v_totals from public.commerce_quote_calculate(p_line_snapshot);

  insert into public.commerce_quotes(
    organization_id, portal_user_id, invoice_customer_id, status, source_channel, currency,
    subtotal, tax_total, grand_total, customer_snapshot, line_snapshot,
    customer_note, internal_note, created_by, updated_by
  ) values (
    v_org, p_portal_user_id, p_invoice_customer_id, 'in_review', p_source_channel, 'EUR',
    v_totals.subtotal, v_totals.tax_total, v_totals.grand_total,
    coalesce(p_customer_snapshot, '{}'::jsonb), p_line_snapshot,
    nullif(trim(p_customer_note),''), nullif(trim(p_internal_note),''), auth.uid(), auth.uid()
  ) returning * into v_quote;
  return v_quote;
end;
$$;

revoke all on function public.commerce_admin_create_quote(uuid,uuid,jsonb,jsonb,text,text,text) from public, anon;
grant execute on function public.commerce_admin_create_quote(uuid,uuid,jsonb,jsonb,text,text,text) to authenticated;

create or replace function public.commerce_admin_update_quote(
  p_quote_id uuid,
  p_customer_snapshot jsonb,
  p_line_snapshot jsonb,
  p_customer_note text default null,
  p_internal_note text default null,
  p_valid_until timestamptz default null
)
returns public.commerce_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_totals record;
  v_quote public.commerce_quotes%rowtype;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  v_org := public.commerce_current_organization();
  if v_org is null then raise exception 'Organization context required'; end if;
  select * into v_totals from public.commerce_quote_calculate(p_line_snapshot);

  update public.commerce_quotes set
    customer_snapshot = coalesce(p_customer_snapshot, customer_snapshot),
    line_snapshot = p_line_snapshot,
    subtotal = v_totals.subtotal,
    tax_total = v_totals.tax_total,
    grand_total = v_totals.grand_total,
    customer_note = nullif(trim(p_customer_note),''),
    internal_note = nullif(trim(p_internal_note),''),
    valid_until = p_valid_until,
    status = case when status in ('requested','draft') then 'in_review' else status end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_quote_id and organization_id = v_org and status in ('draft','requested','in_review','approved')
  returning * into v_quote;

  if not found then raise exception 'Editable quote not found'; end if;
  return v_quote;
end;
$$;

revoke all on function public.commerce_admin_update_quote(uuid,jsonb,jsonb,text,text,timestamptz) from public, anon;
grant execute on function public.commerce_admin_update_quote(uuid,jsonb,jsonb,text,text,timestamptz) to authenticated;

create or replace function public.commerce_admin_approve_quote(p_quote_id uuid, p_valid_until timestamptz default null)
returns public.commerce_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_quote public.commerce_quotes%rowtype;
  v_year integer := extract(year from now())::integer;
  v_next integer;
  v_number text;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  v_org := public.commerce_current_organization();
  if v_org is null then raise exception 'Organization context required'; end if;

  select * into v_quote from public.commerce_quotes
  where id = p_quote_id and organization_id = v_org
  for update;
  if not found then raise exception 'Quote not found'; end if;
  if v_quote.status not in ('requested','in_review','approved') then raise exception 'Quote cannot be approved from current state'; end if;

  if v_quote.quote_number is null then
    insert into public.commerce_quote_number_sequences(organization_id, fiscal_year, last_number)
    values(v_org, v_year, 1)
    on conflict(organization_id, fiscal_year)
    do update set last_number = public.commerce_quote_number_sequences.last_number + 1, updated_at = now()
    returning last_number into v_next;
    v_number := 'OF-' || v_year || '-' || lpad(v_next::text, 6, '0');
  else
    v_number := v_quote.quote_number;
  end if;

  update public.commerce_quotes set
    quote_number = v_number,
    status = 'approved',
    approved_at = coalesce(approved_at, now()),
    valid_until = coalesce(p_valid_until, valid_until, now() + interval '14 days'),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_quote_id
  returning * into v_quote;
  return v_quote;
end;
$$;

revoke all on function public.commerce_admin_approve_quote(uuid,timestamptz) from public, anon;
grant execute on function public.commerce_admin_approve_quote(uuid,timestamptz) to authenticated;

-- Permit invoices originating from accepted quotes.
alter table public.commerce_invoices drop constraint if exists commerce_invoices_source_channel_check;
alter table public.commerce_invoices add constraint commerce_invoices_source_channel_check
  check (source_channel = any(array['webshop','showroom','mobile','warehouse','manual','quote']::text[]));

create or replace function public.commerce_customer_accept_quote(p_quote_id uuid)
returns public.commerce_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.commerce_quotes%rowtype;
  v_invoice public.commerce_invoices%rowtype;
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
    '{}'::jsonb, v_quote.customer_snapshot, v_quote.line_snapshot, 'quote',
    'online', 'unpaid', 'delivery', v_quote.customer_note, now() + interval '14 days', auth.uid()
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

create or replace function public.commerce_customer_reject_quote(p_quote_id uuid, p_note text default null)
returns public.commerce_quotes
language plpgsql
security definer
set search_path = public
as $$
declare v_quote public.commerce_quotes%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.commerce_quotes set
    status='rejected', rejected_at=now(), customer_note=coalesce(nullif(trim(p_note),''), customer_note),
    updated_by=auth.uid(), updated_at=now()
  where id=p_quote_id and portal_user_id=auth.uid() and status='approved'
  returning * into v_quote;
  if not found then raise exception 'Quote not available for rejection'; end if;
  return v_quote;
end;
$$;

revoke all on function public.commerce_customer_reject_quote(uuid,text) from public, anon;
grant execute on function public.commerce_customer_reject_quote(uuid,text) to authenticated;

commit;
