# Commerce FDMP Foundation Design

## Objective
Migrate Brands, Suppliers, Categories and Inventory without introducing direct cross-store dependencies.

## Architecture

```text
BrandRepository → BrandService → BrandStore → BrandRenderer
SupplierRepository → SupplierService → SupplierStore → SupplierRenderer
CategoryRepository → CategoryService → CategoryStore → CategoryRenderer
InventoryRepository → InventoryService → InventoryStore → InventoryRenderer
                                   ↓
                                EventBus
                                   ↓
                    ProductStore / Storefront consumers
```

## Mandatory boundaries
1. Only Repositories access Supabase tables.
2. Stores never read another Store directly.
3. Renderers exclusively own their DOM zones.
4. ComponentFactories own markup and form serialization.
5. Public storefront Repositories use explicit allow-listed columns.
6. New FDMP ownership may not coexist indefinitely with active legacy ownership.

## Migration order

### Phase A — Brands
Brands is first because it already has a database table and clear admin/storefront consumers. The migration must also define how product brand strings transition toward stable brand identity.

### Phase B — Suppliers
Suppliers follows Brands. The design must decide whether Products receives `supplier_id`, a product-supplier relation table, or both. The purchase-price RPC contract must be audited server-side before supplier-aware cost records are introduced.

### Phase C — Categories
Categories requires an explicit canonical model before code migration. Proposed minimum fields:
- `id`
- `key`
- `name`
- `slug`
- `parent_id`
- `status`
- `display_order`
- storefront visibility

Existing product category and subcategory strings require a controlled backfill/mapping migration.

### Phase D — Inventory
Inventory should not remain a simple UI refactor. Proposed minimum model:
- stock location / warehouse
- on-hand quantity
- reserved quantity
- available quantity
- inventory mutation ledger
- reservation expiry
- order/payment reference

`available = on_hand - reserved` must be calculated in a single authoritative service or database function.

## Proposed implementation PRs
- PR 105: Commerce audit dossier
- PR 106: Brand FDMP Foundation and storefront Brand Read Model
- PR 107: Supplier FDMP Foundation and product-supplier relation decision
- PR 108: Category schema, migration and FDMP implementation
- PR 109: Inventory schema and reservation lifecycle
- PR 110: Legacy Commerce removal
- PR 111: Commerce release and cache harmonization

## Blocking decisions before implementation
1. Whether existing products receive `brand_id` while temporarily retaining `brand` for compatibility.
2. Supplier relationship cardinality: one preferred supplier versus multiple suppliers per product.
3. Whether purchase price belongs to the product or to a product-supplier offer.
4. Category hierarchy and multilingual naming strategy.
5. Inventory reservation timing: add-to-cart, checkout creation or payment initiation.

No production implementation should begin until these five decisions are approved.