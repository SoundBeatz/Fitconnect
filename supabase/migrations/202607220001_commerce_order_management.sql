-- Auditable Commerce order management for Command Center administrators.

create table if not exists public.commerce_order_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  checkout_session_id uuid not null references public.commerce_checkout_sessions(id) on delete cascade,
  from_status text,
  to_status text not null,
  tracking_carrier text,
  tracking_code text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists commerce_order_status_history_order_idx
  on public.commerce_order_status_history (checkout_session_id, created_at desc);

alter table public.commerce_order_status_history enable row level security;

drop policy if exists commerce_order_history_admin_read on public.commerce_order_status_history;
create policy commerce_order_history_admin_read
on public.commerce_order_status_history for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant select on public.commerce_order_status_history to authenticated;
grant select, insert, update, delete on public.commerce_order_status_history to service_role;

notify pgrst, 'reload schema';
