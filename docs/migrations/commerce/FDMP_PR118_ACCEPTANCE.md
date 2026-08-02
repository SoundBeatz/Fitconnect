# PR #118 — Storefront Commerce Read Models

## Security boundary

- Public brands are read only from `v_storefront_brands`.
- Public availability is read only from `v_storefront_inventory`.
- Exact stock quantities never enter `StorefrontInventoryStore`.
- Public availability DTOs contain only `productId`, `availability`, and `canOrder`.
- Internal logistics, supplier and financial fields are excluded at the database-view boundary.

## Runtime chain

```text
v_storefront_brands
→ StorefrontBrandRepository
→ StorefrontBrandStore
→ fitconnect:storefront-brands-loaded

v_storefront_inventory
→ StorefrontInventoryRepository
→ StorefrontInventoryService
→ StorefrontInventoryStore
→ fitconnect:storefront-stock-updated
```

## Acceptance

- [x] Read-only repositories
- [x] No admin imports
- [x] No direct cross-store dependency
- [x] Product DTO no longer exposes stock
- [x] Catalog and detail pages consume abstract availability enums
- [x] Existing shop markup, filters, cart and product cards retained
- [x] Permanent CI isolation guard added

## Manual validation after deployment

- Open catalog and verify brand cards and filters.
- Verify product cards show `Op voorraad`, `Beperkte voorraad`, or `Op aanvraag` without exact quantities.
- Open a detail page and verify schema availability and add-to-cart state.
- Inspect `window.storefrontInventoryStore.getState(productId)` and confirm no raw quantity or logistics fields are present.
- Inspect Network and confirm reads target only the two public views.
