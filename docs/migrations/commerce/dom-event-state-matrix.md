# Commerce DOM, Event and State Matrix

## Brands

### DOM
- Admin writers: `#brandAdminGrid`, `#brandForm`, `#brandLogoPreview`, `#productBrandSelect`, `#productBrandFilter`
- Storefront writers: `#brandDisplay`, `#brandFilter`, product brand logos

### State
- Admin: global `brands=[]`
- Storefront: local `brands=[]`

### Events
No dedicated Brand EventBus lifecycle was found. UI is refreshed through direct function calls such as `syncBrandOptions()` and `renderBrands()` after database re-fetch.

## Suppliers

### DOM
- `#supplierGrid`
- `#supplierForm`
- `#productSupplierSelect`

### State
- global `suppliers=[]` in `admin/admin.js`

### Events
No dedicated Supplier EventBus lifecycle was found. Save performs direct database mutation, full re-fetch and direct DOM refresh.

## Categories

### DOM
- hardcoded category buttons in `shop/index.html`
- hardcoded subcategory buttons in `shop/index.html`
- `#categoryFilter`
- product form category/subcategory controls

### State
- `activeSubcategory` in `shop/shop.js`
- selected category values in DOM controls
- category/subcategory strings in ProductStore records

### Events
Category filtering is handled by direct click/change handlers. No canonical `category.updated`, `category.selected` or hierarchy event lifecycle was found.

## Inventory

### DOM
- product form stock input
- storefront stock labels
- bundle availability rendering
- cart quantity controls

### State
- `stock` inside ProductStore records
- copied `stock` inside StorefrontProductStore records
- cart quantity in `localStorage`

### Events
No inventory-specific events were found. Product save events may refresh product records, but no explicit `inventory.adjusted`, `inventory.reserved`, `inventory.released` or `inventory.committed` lifecycle is present.

## Target EventBus contract

### Brands
- `brand.loaded`
- `brand.created`
- `brand.updated`
- `brand.archived`

### Suppliers
- `supplier.loaded`
- `supplier.created`
- `supplier.updated`
- `supplier.archived`

### Categories
- `category.loaded`
- `category.created`
- `category.updated`
- `category.moved`
- `category.archived`

### Inventory
- `inventory.loaded`
- `inventory.adjusted`
- `inventory.reserved`
- `inventory.released`
- `inventory.committed`
- `inventory.low-stock`

Stores may subscribe to domain events but may not read or mutate another Store directly.