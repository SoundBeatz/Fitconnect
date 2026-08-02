# FitConnect Products Migration Sprint v1.0

## Product Ownership Audit

**Status:** Audit complete — no production code changed.

## Confirmed current owners

| File | Data ownership | State ownership | DOM ownership | Lifecycle |
|---|---|---|---|---|
| `admin/admin.js` | Reads and writes `products`; reads `brands` and `suppliers`; uploads product media | Global `products[]`, `brands[]`, `suppliers[]`, `currentImages[]` | `#productRows`, `#productEditor`, `#productForm`, media manager, SEO preview, filters and statistics | Admin bootstrap, refresh, form submit, edit/new/duplicate actions |
| `admin/product-purchase-price.js` | Reads `products.purchase_price`; writes through `commerce_set_product_purchase_price` RPC | `loadedProductId`, `saving` | Injects purchase-price field and margin preview into `#productForm` | MutationObserver, interval polling, submit listener and product-selection listeners |
| `shop/shop.js` | Reads active products directly through Supabase REST; also reads brands and bundles | Local `products[]`, `brands[]`, `bundles[]`, filters, profile and cart | `#productGrid`, filters, brand display, cart and bundle display | Page bootstrap and filter/cart events |
| `shop/product/product.js` | Reads one active product directly through Supabase REST | Local `product`, gallery state and zoom state | Complete product-detail page, SEO metadata, structured data, gallery and cart actions | Page bootstrap, gallery, tabs and lightbox events |
| Combination Deals runtimes | Consume products for bundle composition and availability | Independent product-selection and bundle-editor state | Dealstudio product picker and bundle calculations | Dealstudio route lifecycle |
| Orders and invoicing | Consume product snapshots, names, SKU and prices | Order/invoice-local state | Order and invoice line renderers | Order and invoice workflows |

## Primary finding

There is currently no single Product owner. Product responsibility is distributed across the admin monolith, an injected purchase-price extension, the public shop, the product-detail runtime and Combination Deals.

## Highest-risk conflicts

1. `admin/admin.js` owns product loading, form serialization, save, media, SEO and rendering simultaneously.
2. `admin/product-purchase-price.js` independently observes and extends the same form, polls every 800 ms and starts a second save path after the main product submit.
3. Public shop and product-detail pages bypass a shared Product Repository and each perform their own REST queries and mapping.
4. Product fields are split between columns and the untyped `specifications` object.
5. Product consumers depend on different subsets and representations of the same record.

## Target ownership

```text
ProductRepository
→ ProductService
→ ProductStore
→ ProductRenderer / ProductCardFactory
→ ProductRouter
```

Public storefront consumers may use a read-only Storefront Product Repository, but database mapping and normalization must remain centralized.