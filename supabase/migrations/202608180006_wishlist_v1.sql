-- Wishlist v1
-- Personal customer wishlist ownership. No cart/order/payment ownership changes.

create table if not exists public.commerce_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists commerce_wishlist_items_user_created_idx
  on public.commerce_wishlist_items(user_id, created_at desc);

alter table public.commerce_wishlist_items enable row level security;

revoke all on table public.commerce_wishlist_items from public;
revoke all on table public.commerce_wishlist_items from anon;
grant select, insert, delete on table public.commerce_wishlist_items to authenticated;

drop policy if exists commerce_wishlist_items_select_own on public.commerce_wishlist_items;
create policy commerce_wishlist_items_select_own
on public.commerce_wishlist_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists commerce_wishlist_items_insert_own on public.commerce_wishlist_items;
create policy commerce_wishlist_items_insert_own
on public.commerce_wishlist_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists commerce_wishlist_items_delete_own on public.commerce_wishlist_items;
create policy commerce_wishlist_items_delete_own
on public.commerce_wishlist_items
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
