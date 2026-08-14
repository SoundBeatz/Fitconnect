begin;

create table if not exists public.commerce_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  type text not null,
  entity_type text not null,
  entity_id uuid null,
  title text not null,
  message text null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'unread' check (status in ('unread','read','archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  read_by uuid null
);
create index if not exists commerce_notifications_org_status_idx on public.commerce_notifications(organization_id,status,created_at desc);
create index if not exists commerce_notifications_entity_idx on public.commerce_notifications(entity_type,entity_id) where entity_id is not null;

alter table public.commerce_notifications enable row level security;
revoke all on public.commerce_notifications from anon;
grant select,update on public.commerce_notifications to authenticated;
grant all on public.commerce_notifications to service_role;

drop policy if exists commerce_notifications_admin_read on public.commerce_notifications;
create policy commerce_notifications_admin_read on public.commerce_notifications
for select to authenticated
using (public.command_center_is_admin());

drop policy if exists commerce_notifications_admin_update on public.commerce_notifications;
create policy commerce_notifications_admin_update on public.commerce_notifications
for update to authenticated
using (public.command_center_is_admin())
with check (public.command_center_is_admin());

create or replace function public.commerce_admin_mark_notification(p_notification_id uuid, p_status text default 'read')
returns public.commerce_notifications
language plpgsql
security definer
set search_path=public
as $$
declare v_org uuid; v_row public.commerce_notifications%rowtype;
begin
  if not public.command_center_is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('read','archived') then raise exception 'Invalid notification status'; end if;
  v_org:=public.commerce_current_organization();
  update public.commerce_notifications set status=p_status,read_at=case when p_status='read' then coalesce(read_at,now()) else read_at end,read_by=auth.uid()
  where id=p_notification_id and organization_id=v_org returning * into v_row;
  if not found then raise exception 'Notification not found'; end if;
  return v_row;
end;
$$;
revoke all on function public.commerce_admin_mark_notification(uuid,text) from public,anon;
grant execute on function public.commerce_admin_mark_notification(uuid,text) to authenticated;

-- Approved quotes are immutable. Any commercial edit must occur before approval.
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
    status = 'in_review',
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_quote_id and organization_id = v_org and status in ('draft','requested','in_review')
  returning * into v_quote;

  if not found then raise exception 'Only a draft or in-review quote can be edited'; end if;
  return v_quote;
end;
$$;
revoke all on function public.commerce_admin_update_quote(uuid,jsonb,jsonb,text,text,timestamptz) from public,anon;
grant execute on function public.commerce_admin_update_quote(uuid,jsonb,jsonb,text,text,timestamptz) to authenticated;

commit;
