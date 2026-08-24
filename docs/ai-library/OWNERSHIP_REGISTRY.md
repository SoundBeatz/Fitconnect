# Ownership Registry

## Laws

- FDMP v2 domain, repository, state and DOM ownership are mandatory.
- Security and tenant decisions belong server-side; UI may consume but not replace them.
- A domain may expose events/contracts but must not leak hidden shared mutable state.

## Current ownership map

| Domain | Canonical client path | Canonical backend/data owner |
|---|---|---|
| Customer | CustomerRenderer -> CustomerStore -> CustomerService -> CustomerRepository | `profiles` + Customer360 tables/RPCs under tenant enforcement |
| Address | Address repository/domain snapshot helpers | Address tables/snapshots and validated address contracts |
| Order | OrderRenderer -> OrderStore -> OrderService -> OrderRepository | `commerce_checkout_sessions`, status history, `commerce-update-order` |
| Invoice | InvoiceRenderer -> InvoiceStore -> InvoiceService -> InvoiceRepository | `commerce_invoices` + invoicing RPCs + invoice Edge Functions |
| Payment | Commerce checkout/payment clients | server-authoritative payment tables, tokens, Mollie verification/webhooks |
| Commerce catalog | Product/Brand/Category repositories and stores | products, brands, `commerce_categories`, migrations/RLS |
| Wishlist | Wishlist store/repository contract | `commerce_wishlist_items` for authenticated; localStorage for guests |
| Finance Intelligence | read-only consumer of canonical stores | InvoiceStore/OrderRepository; never a competing finance DB owner |

## Mutation rule

When adding functionality, extend the owner or add an explicit contract. Never bypass an existing owner because direct access is faster.
