create table if not exists public.invoice_customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  portal_user_id uuid references auth.users(id) on delete set null, company_name text not null, contact_name text, email text, phone text,
  address text, postal_code text, city text, country_code text not null default 'NL', kvk_number text, vat_number text,
  source text not null default 'manual' check (source in ('manual','portal','qr','business_card','import')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Mobile invoicing is a sales channel. Keep the legacy warehouse value valid so
-- existing invoices remain readable; new invoices use `mobile`.
alter table public.commerce_invoices drop constraint if exists commerce_invoices_source_channel_check;
alter table public.commerce_invoices add constraint commerce_invoices_source_channel_check
  check (source_channel in ('webshop','showroom','mobile','warehouse','manual'));
create index if not exists invoice_customers_org_name_idx on public.invoice_customers (organization_id,lower(company_name));
create index if not exists invoice_customers_org_email_idx on public.invoice_customers (organization_id,lower(email)) where email is not null;
create unique index if not exists invoice_customers_org_portal_user_uq on public.invoice_customers (organization_id,portal_user_id);
alter table public.commerce_invoices add column if not exists invoice_customer_id uuid references public.invoice_customers(id) on delete set null;
create index if not exists commerce_invoices_customer_idx on public.commerce_invoices (organization_id,invoice_customer_id,created_at desc);
alter table public.invoice_customers enable row level security;
drop policy if exists invoice_customers_org_access on public.invoice_customers;
create policy invoice_customers_org_access on public.invoice_customers for all to authenticated
using (public.command_center_is_admin() or public.commerce_is_member(organization_id))
with check (public.command_center_is_admin() or public.commerce_is_member(organization_id));
grant select,insert,update on public.invoice_customers to authenticated;
notify pgrst, 'reload schema';
