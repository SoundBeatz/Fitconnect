-- FitConnect customer order journey and strict ownership.

alter table public.commerce_checkout_sessions
  add column if not exists order_status text not null default 'processing'
    check (order_status in ('processing','confirmed','picking','packed','shipped','delivered','cancelled','returned')),
  add column if not exists tracking_carrier text,
  add column if not exists tracking_code text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

create index if not exists commerce_checkout_user_created_idx
  on public.commerce_checkout_sessions (user_id, created_at desc)
  where user_id is not null;

-- Correct the dedicated end-to-end test identity. This changes no other user.
update public.profiles p
set role = 'customer'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'service@fit360.nl'
  and p.role is distinct from 'customer';

-- Attach historical guest checkouts to the verified account with the same email.
update public.commerce_checkout_sessions s
set user_id = u.id, updated_at = now()
from auth.users u
where s.user_id is null
  and lower(s.email) = lower(u.email);

update public.commerce_carts c
set user_id = s.user_id, updated_at = now()
from public.commerce_checkout_sessions s
where c.id = s.cart_id
  and c.user_id is null
  and s.user_id is not null;

drop policy if exists commerce_checkout_tenant on public.commerce_checkout_sessions;
drop policy if exists commerce_checkout_customer_read on public.commerce_checkout_sessions;
create policy commerce_checkout_customer_read
on public.commerce_checkout_sessions for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists commerce_payments_tenant_read on public.commerce_payments;
drop policy if exists commerce_payments_customer_read on public.commerce_payments;
create policy commerce_payments_customer_read
on public.commerce_payments for select to authenticated
using (
  exists (
    select 1 from public.commerce_checkout_sessions s
    where s.id = checkout_session_id
      and (
        s.user_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
  )
);

drop policy if exists commerce_cart_items_tenant on public.commerce_cart_items;
drop policy if exists commerce_cart_items_customer_read on public.commerce_cart_items;
create policy commerce_cart_items_customer_read
on public.commerce_cart_items for select to authenticated
using (
  exists (
    select 1 from public.commerce_carts c
    where c.id = cart_id
      and (
        c.user_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
  )
);

grant select on public.commerce_checkout_sessions,
  public.commerce_payments, public.commerce_cart_items to authenticated;

notify pgrst, 'reload schema';
