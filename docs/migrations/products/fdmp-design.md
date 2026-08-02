# Product FDMP Target Design

## Target chain

```text
ProductRepository
→ ProductService
→ ProductStore
→ ProductRenderer
→ ProductRouter
```

Supporting boundaries:

```text
ProductMediaRepository
StorefrontProductRepository
ProductCardFactory
ProductFormFactory
ProductMediaFactory
ProductSeoMapper
```

## PR sequence

### PR 1A — Product Foundation
- Add ProductRepository.
- Add ProductMediaRepository interface.
- Add ProductService validation and normalization.
- Add ProductStore with immutable snapshots and typed events.
- Bridge the existing admin product renderer without visual change.

### PR 1B — Product Renderer Modernization
- Introduce ProductCardFactory and ProductFormFactory.
- Replace full table and editor redraws with keyed updates.
- Move form serialization out of the renderer.
- Replace DOM snapshots with Store-driven rollback.

### PR 2 — Legacy Product Removal
- Remove product queries, global product state, product save path, media ownership and renderers from `admin/admin.js`.
- Remove polling and MutationObserver-based selection from `admin/product-purchase-price.js`.
- Route purchase-price updates through ProductService.

### PR 3 — Storefront Read Model
- Centralize public product REST queries and mapping.
- Migrate `shop/shop.js` and `shop/product/product.js` to read-only storefront services/stores.
- Preserve cart and URL contracts.

### PR 4 — Release and Cache Harmonization
- Harmonize asset versions.
- Add permanent ownership and datasource CI guards.

## Non-negotiable rules

- Only ProductRepository may access `products`.
- Only ProductMediaRepository may access product media storage.
- No direct `.from('products')`, REST `/products`, or product RPC from renderers.
- ProductStore is the only admin runtime state owner.
- ProductRenderer is the only admin product DOM owner.
- Product selection and save completion use explicit events, never polling.
- Legacy and FDMP write paths may not remain active together after certification.