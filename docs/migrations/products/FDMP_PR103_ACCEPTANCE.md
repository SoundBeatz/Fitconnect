# Definition of Done — PR #103 Storefront Read Model

## Security boundary
- [x] Publieke productqueries lopen uitsluitend via `shop/storefront-product-repository.js`.
- [x] De repository gebruikt een expliciete kolommenlijst en een harde `status = active`-filter.
- [x] `purchase_price`, kostprijs- en margevelden bestaan niet in het storefront-DTO.
- [x] Gevoelige financiële sleutels worden ook uit `specifications` verwijderd.
- [x] Draft- en archived-producten kunnen niet in de Storefront Store belanden.

## Runtime
- [x] `shop/shop.js` gebruikt de Storefront Store voor de catalogus.
- [x] `shop/product/product.js` gebruikt dezelfde Storefront Store voor details op slug.
- [x] Bestaande productkaarten, filters, winkelmand, bundels, galerij, SEO en deelacties blijven intact.
- [x] `window.storefrontProductStore` is beschikbaar voor gecontroleerde runtime-inspectie.

## Governance
- [x] Permanente GitHub Actions-guard valideert query-eigenaarschap, DTO-isolatie en scriptvolgorde.
