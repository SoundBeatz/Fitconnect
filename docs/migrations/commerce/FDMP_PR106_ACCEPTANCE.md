# Definition of Done: Commerce Brands Foundation PR #106

## Doel

Introduceer de Brands FDMP-fundering zonder visuele wijziging van het Command Center.

## Functionele criteria

- [ ] Merken laden via `BrandRepository -> BrandService -> BrandStore`.
- [ ] De bestaande markup van `#brandAdminGrid` blijft behouden.
- [ ] Productmerkselectie en merkfilter blijven gevuld met actieve merken.
- [ ] Het bestaande `#brandForm` slaat tijdelijk via `brand-v1-bridge.js` en de BrandStore op.
- [ ] Logo-upload, zoeken, statusfilter en editorvelden blijven functioneel.

## Architectuurcriteria

- [ ] Alleen `admin/brand-repository.js` kent de tabelnaam `brands` binnen de nieuwe FDMP-lagen.
- [ ] BrandService en BrandStore bevatten geen DOM-selectors of directe Supabasequeries.
- [ ] BrandStore importeert of leest geen ProductStore of SupplierStore.
- [ ] Cross-domain notificatie verloopt via `brand.saved` en `fitconnect:brand-saved` events.
- [ ] State snapshots zijn immutable via `FitConnectDeepFreeze`.

## Overgangsregel

`admin/admin.js` bevat in PR #106 nog legacy Brand-code. De bridge neemt het actieve formulier-submitpad in capture phase over. De legacy read-, state- en renderpaden worden pas verwijderd in de geplande Legacy Brands Removal-PR nadat de FDMP-keten live is gevalideerd.

## Niet in scope

- `brand_id` database-migratie op Products.
- Storefront Brands Read Model.
- CardFactory/BrandRenderer-modernisering.
- Verwijdering van legacy code uit `admin/admin.js`.
