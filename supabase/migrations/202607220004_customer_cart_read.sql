-- Let an authenticated customer read the cart that belongs to their account.
-- commerce_cart_items ownership is derived through this cart, so this also
-- restores the immutable order lines in the customer portal.

drop policy if exists commerce_carts_customer_read on public.commerce_carts;
create policy commerce_carts_customer_read
on public.commerce_carts for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

grant select on public.commerce_carts to authenticated;

notify pgrst, 'reload schema';
