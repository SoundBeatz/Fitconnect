# Product Data Source Matrix

| Source | Reader/writer | Operation | Current mapping | Target owner |
|---|---|---|---|---|
| `products` | `admin/admin.js` | SELECT, save/update, media-related state | Raw database record mixed with form/view state | `ProductRepository` |
| `products` | `shop/shop.js` | REST SELECT active catalogue subset | Public card DTO assembled in page runtime | Read-only storefront repository |
| `products` | `shop/product/product.js` | REST SELECT by slug | Detail DTO, SEO and structured data assembled in page runtime | Read-only storefront repository + service |
| `products.purchase_price` | `admin/product-purchase-price.js` | SELECT | Separate polling-based extension state | Product repository/service |
| `commerce_set_product_purchase_price` | `admin/product-purchase-price.js` | RPC write | Second save transaction after product submit | Product service transaction |
| `brands` | `admin/admin.js`, `shop/shop.js` | SELECT | Separate admin and shop mappings | BrandRepository / referenced Product DTO |
| `suppliers` | `admin/admin.js` | SELECT | Global supplier array for editor | SupplierRepository / ProductStore dependency |
| `product-media` bucket | `admin/admin.js` | Upload/delete through media manager | URLs stored in product `images` | ProductMediaRepository |
| `specifications` JSON | admin and storefront runtimes | Read/write embedded fields | SKU, EAN, shipping, SEO and technical fields mixed together | Typed Product domain model and migration plan |
| `commerce_bundle_items.products` | shop and Dealstudio | Relational SELECT | Product availability and pricing embedded in bundle query | BundleRepository consuming Product projections |

## Current product flow

```text
admin/admin.js
  SELECT products
  → global products[]
  → renderProducts()
  → populate #productForm
  → save product

admin/product-purchase-price.js
  observe same form
  → SELECT purchase_price
  → delayed RPC write after submit

shop/shop.js
  direct REST SELECT
  → local products[]
  → #productGrid

shop/product/product.js
  direct REST SELECT by slug
  → local product
  → complete detail DOM
```

## Required split

- `ProductRepository`: canonical database adapter and CRUD.
- `ProductMediaRepository`: storage operations.
- `ProductService`: validation, normalization, product/media transaction orchestration.
- `ProductStore`: canonical admin runtime state.
- `StorefrontProductRepository`: restricted read projection for public pages.
- No renderer may call Supabase, REST endpoints or RPC directly.