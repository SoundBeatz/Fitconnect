# Product Event and State Matrix

## Current state owners

| State | Current owner |
|---|---|
| `products[]` admin catalogue | `admin/admin.js` global state |
| `brands[]`, `suppliers[]` for product editor | `admin/admin.js` global state |
| `currentImages[]` | `admin/admin.js` global state |
| Purchase-price load/save state | `admin/product-purchase-price.js` |
| Public catalogue `products[]` | `shop/shop.js` local closure |
| Public filters and active subcategory | `shop/shop.js` local closure |
| Product-detail record and gallery state | `shop/product/product.js` local closure |
| Bundle product-selection state | Combination Deals runtimes |

## Current implicit events

| Trigger | Current mechanism | Problem |
|---|---|---|
| Product selected | Row click and DOM population | No canonical event payload |
| Product saved | Form submit | Purchase-price extension waits and polls for form ID |
| Purchase price saved | `fitconnect:purchase-price-updated` CustomEvent | Only one field has an explicit event |
| Product list refreshed | Direct `loadProducts()` followed by render calls | Consumers cannot subscribe safely |
| Product media changed | Mutation of `currentImages[]` and DOM redraw | State and presentation coupled |
| Filters changed | Direct event listeners call renderer | No store or reusable selector state |

## Target ProductStore state

```text
products
selectedProductId
editorMode
filters
sort
pagination
loading
savingIds
uploadingMedia
validationErrors
dirtyProductIds
lastRefresh
error
```

## Target events

```text
products.loading
products.loaded
product.selected
product.editing
product.saving
product.saved
product.rollback
product.deleted
product.media-uploading
product.media-updated
product.purchase-price-updated
product.inventory-updated
product.filters-changed
```

All events must carry a stable product ID and immutable payload. DOM mutation, timers and polling are not accepted as inter-module communication.