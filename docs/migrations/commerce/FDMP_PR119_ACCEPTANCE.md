# FDMP PR119 Acceptance — Commerce Release & Cache Harmonization

## Release

- Tag: `20260802-commerce-release-v1.0`
- Target branch: `hostinger-static`
- Scope: Brands, Suppliers, Categories, Inventory and public Commerce read models

## Public shells

`shop/index.html` loads the Category and Commerce storefront layers with the final release tag.

`shop/product/index.html` loads the Commerce repositories, Inventory service, stores and product runtime with the final release tag.

## Command Center

`admin/index.html` loads the Commerce domains in linear FDMP order:

1. Deep Freeze
2. Brand Repository → Service → Store → Renderer
3. Supplier Repository → Service → Store → Renderer
4. Category Repository → Service → Store → Renderer
5. Inventory Persistence Adapter → Repository → Service → Store → Renderer
6. Interface runtime

The obsolete dynamic Inventory bootstrap in `product-purchase-price.js` is removed.

## Governance

- `Validate Commerce Release Cache Harmonization` is permanent.
- Earlier domain guards accept the final Commerce release tag without weakening ownership checks.
- Temporary migrate, finalize and trigger files are removed from `main`, `hostinger-static` and the feature branch.

## Runtime validation still required

- Confirm Hostinger serves the final cache tag.
- Confirm the Supabase storefront views are deployed.
- Open and save Brands, Suppliers, Categories and Inventory in the live Command Center.
- Validate storefront brand filters, category filters and availability labels.
- Confirm the browser console remains error-free.
