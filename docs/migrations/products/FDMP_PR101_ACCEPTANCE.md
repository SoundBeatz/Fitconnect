# Definition of Done — Product FDMP PR #101 Renderer Modernization

## Presenter ownership
- [x] `admin/product-v1-bridge.js` is verwijderd.
- [x] `admin/product-renderer.js` initialiseert Repository, Service en Store.
- [x] `ProductCardFactory` beheert productrijen.
- [x] `ProductFormFactory` beheert formulier-serialisatie en populatie.
- [x] De hoofdrenderer kent geen database- of Supabase-query's.

## Granulaire synchronisatie
- [x] Initiële productlijst wordt eenmaal gemount.
- [x] `product.saving` wijzigt alleen de betrokken productrij.
- [x] `product.saved` vervangt alleen de betrokken rij via een keyed update.
- [x] Rollback komt uit `ProductStore.getSnapshot()`.

## Inkoopprijs
- [x] Geen `MutationObserver`.
- [x] Geen polling of `setInterval`.
- [x] Editorintegratie loopt via `fitconnect:product-editor-opened`.
- [x] Beveiligde RPC-write loopt na `fitconnect:product-saved`.

## Scope
De resterende legacy productfuncties in `admin/admin.js` worden in PR #102 chirurgisch verwijderd. Deze PR activeert de nieuwe presenter en blokkeert het oude submitpad via capture-phase formulierownership, zonder media-, SEO- of editorvelden te verwijderen.
