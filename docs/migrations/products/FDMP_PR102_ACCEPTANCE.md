# Definition of Done — Product FDMP PR #102 Legacy Removal

## Ownership
- [ ] `admin/admin.js` bevat geen directe `.from('products')`-query.
- [ ] `admin/admin.js` bevat geen globale `products=[]`-state.
- [ ] `admin/admin.js` bevat geen `loadProducts()`, `renderProducts()` of legacy product-submit-handler.
- [ ] `#productRows` wordt uitsluitend gerenderd door `admin/product-renderer.js`.
- [ ] Productfilters, statistieken, recente producten en dupliceren blijven via de FDMP Store functioneren.

## Regressiebeveiliging
- [ ] Merken, leveranciers, klanten, trainingen, garantie, service en orders blijven in `admin/admin.js` intact.
- [ ] Media-upload en SEO-hulpfuncties blijven beschikbaar via expliciete productevents.
- [ ] `admin/product-repository.js` blijft de enige adminlaag met directe toegang tot de tabel `products`.

Status: ownership-migratie wordt automatisch gevalideerd.
