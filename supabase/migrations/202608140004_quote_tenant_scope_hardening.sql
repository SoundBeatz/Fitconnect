begin;

drop policy if exists commerce_quotes_admin_all on public.commerce_quotes;
create policy commerce_quotes_admin_all on public.commerce_quotes
for all to authenticated
using (public.command_center_is_admin() and organization_id = public.commerce_current_organization())
with check (public.command_center_is_admin() and organization_id = public.commerce_current_organization());

drop policy if exists commerce_quote_history_admin_read on public.commerce_quote_status_history;
create policy commerce_quote_history_admin_read on public.commerce_quote_status_history
for select to authenticated
using (
  public.command_center_is_admin()
  and organization_id = public.commerce_current_organization()
  and exists (
    select 1 from public.commerce_quotes q
    where q.id = quote_id and q.organization_id = public.commerce_current_organization()
  )
);

drop policy if exists commerce_notifications_admin_read on public.commerce_notifications;
create policy commerce_notifications_admin_read on public.commerce_notifications
for select to authenticated
using (public.command_center_is_admin() and organization_id = public.commerce_current_organization());

drop policy if exists commerce_notifications_admin_update on public.commerce_notifications;
create policy commerce_notifications_admin_update on public.commerce_notifications
for update to authenticated
using (public.command_center_is_admin() and organization_id = public.commerce_current_organization())
with check (public.command_center_is_admin() and organization_id = public.commerce_current_organization());

drop policy if exists commerce_invoice_issuers_admin_all on public.commerce_invoice_issuers;
create policy commerce_invoice_issuers_admin_all on public.commerce_invoice_issuers
for all to authenticated
using (public.command_center_is_admin() and organization_id = public.commerce_current_organization())
with check (public.command_center_is_admin() and organization_id = public.commerce_current_organization());

commit;
