# Domain Memory — Commerce

## Scope
Catalog, products, brands, categories, wishlist, carts, checkout, quotes and storefront commerce contracts.

## Current rules
- Product identity, price, tax, inventory and organization are server-authoritative for payment flows.
- Product invariants are database-enforced for required identity/category/brand/price/stock/tax fields.
- `brands` and `commerce_categories` are central catalog entities; storefront category visibility remains product-driven so empty categories stay hidden.
- Wishlist: guest persistence in localStorage; authenticated persistence in `commerce_wishlist_items` under RLS.
- Checkout Particulier/Zakelijk is propagated through checkout -> order -> customer profile -> invoice, with database enforcement preventing business fields on private checkout.
- New authenticated checkout profiles bind to checkout organization and may not silently migrate tenants.
- Quote sequence storage is internal-only; quote/customer actions must enforce server-side role/ownership/tenant checks.

## Do not reintroduce
- Free-form category/admin logic as the only source of taxonomy truth.
- Client-trusted payment totals.
- Direct privileged access to internal sequence/helper tables.
