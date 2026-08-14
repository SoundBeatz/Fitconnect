begin;

drop policy if exists commerce_invoices_quote_customer_read on public.commerce_invoices;
create policy commerce_invoices_quote_customer_read on public.commerce_invoices
for select to authenticated
using (
  exists (
    select 1
    from public.commerce_quotes q
    where q.invoice_id = commerce_invoices.id
      and q.portal_user_id = auth.uid()
      and q.organization_id = commerce_invoices.organization_id
  )
);

commit;
