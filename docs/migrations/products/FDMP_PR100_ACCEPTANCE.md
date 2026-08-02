# Definition of Done — Product FDMP PR #100 Foundation

## Functionele garantie

- [ ] Geen visuele wijziging in de producttabel, editor, media-omgeving of SEO-studio.
- [ ] De bestaande beheeromgeving blijft producten laden en opslaan zoals vóór PR #100.
- [ ] De nieuwe ProductStore kan na een geldige adminsessie dezelfde productdataset laden.
- [ ] Nieuwe FDMP-lagen veroorzaken geen console-errors of uncaught promises.

## Architectuur

- [ ] `ProductRepository` is de enige nieuwe FDMP-laag die de tabelnaam `products` kent.
- [ ] ProductService en ProductStore bevatten geen Supabase-query's en geen DOM-manipulatie.
- [ ] ProductStore is de enige eigenaar van de nieuwe FDMP-state.
- [ ] Productentities worden via `FitConnectDeepFreeze` als immutable domeinmodellen aangeboden.
- [ ] De tijdelijke `product-v1-bridge.js` wordt in PR #101 volledig verwijderd.

## Productiecontracten

- [ ] Supabase wordt verkregen via `window.getFitConnectSupabase()`.
- [ ] Het live schema gebruikt `vat`, `status`, `short_description`, `specifications` en `images`.
- [ ] SKU blijft compatibel met de bestaande `specifications.SKU`-opslag.
- [ ] De bestaande beveiligde inkoopprijsflow wordt in PR #100 niet verwijderd of overschreven.

## Scopebeperking

PR #100 introduceert de FDMP-fundering en een read-only bootstrap naast de bestaande renderer. De legacy write-path wordt pas verwijderd nadat PR #101 de Product Renderer en formuliercontroller heeft overgenomen.
