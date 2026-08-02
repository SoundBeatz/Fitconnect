# Definition of Done: Commerce Brands Renderer PR #107

## Renderer
- [x] `admin/brand-v1-bridge.js` is verwijderd.
- [x] `BrandCardFactory` behoudt de bestaande `brand-admin-card` markup.
- [x] `BrandFormFactory` bezit populate, serialize en rollback.
- [x] De hoofdrenderer leest geen afzonderlijke formuliervelden.
- [x] Een opgeslagen merk vervangt uitsluitend zijn eigen keyed kaart.
- [x] Productdropdowns worden passief vanuit de BrandStore gesynchroniseerd.

## Architectuur
- [x] Geen Supabase-query in de Renderer.
- [x] Geen directe ProductStore- of ProductRenderer-afhankelijkheid.
- [x] Rollback komt uitsluitend uit de Store-snapshot.
- [x] De bestaande HTML- en CSS-structuur blijft intact.
