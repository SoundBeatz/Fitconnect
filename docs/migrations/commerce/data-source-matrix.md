# Commerce Data Source Matrix

| Domain | Source | Reader(s) | Writer(s) | Current state owner | Risk |
|---|---|---|---|---|---|
| Brands | `brands` | `admin/admin.js`, `shop/shop.js` REST | `admin/admin.js` | `brands=[]` in admin and storefront | Two independent readers, string coupling to products |
| Suppliers | `suppliers` | `admin/admin.js` | `admin/admin.js` | `suppliers=[]` | Supplier identity passed to product UI as name, not proven ID relation |
| Categories | `products.category`, `specifications.Subcategorie`, static HTML | ProductRepository, ProductRenderer, StorefrontProductRepository, shop UI | Product save flow and hardcoded HTML | Distributed strings | No canonical category entity or hierarchy |
| Inventory | `products.stock` | ProductRepository, Storefront Read Model, shop bundles/cart | Product save flow | ProductStore plus storefront product copies | No reservation, location or mutation ledger |
| Purchase price | protected product purchase-price path | ProductRepository domain mapping, `product-purchase-price.js` | RPC `commerce_set_product_purchase_price` | product editor extension | No supplier ID included in visible RPC contract |

## Query inventory

### Brands
- `client.from('brands').select('*').order(...)`
- `client.from('brands').insert(...)`
- `client.from('brands').update(...)`
- public REST `/rest/v1/brands?select=*...`

### Suppliers
- `client.from('suppliers').select('*').order('name')`
- `client.from('suppliers').insert(...)`
- `client.from('suppliers').update(...)`

### Categories
No separate active query path was proven during this audit.

### Inventory
No separate active inventory-table query path was proven. Stock is read and written as part of `products`.

## Required migration boundary
Only the future domain Repositories may know table names and database columns. Public storefront readers require explicit allow-listed DTO fields.