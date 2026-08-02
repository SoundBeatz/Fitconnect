# Definition of Done: FDMP PR 1A Foundation

## Scope

PR 1A introduceert de FitConnect Data Module Pattern voor Module Registry zonder visuele wijziging en zonder legacycode uit `admin/admin.js` te verwijderen.

## Functionaliteit

- [ ] Modules laden in `#moduleRegistryCanonical`.
- [ ] De bestaande kaartstructuur, teksten, velden en CSS-klassen blijven gelijk.
- [ ] Combination Deals-aliases worden tot exact één canonieke kaart samengevoegd.
- [ ] Module-instellingen kunnen gericht worden opgeslagen zonder volledige Registry-refresh.
- [ ] Een tweede save voor dezelfde module wordt geblokkeerd door `savingKeys`.
- [ ] Ongeldige naam, kleur, stijl of route stopt vóór de databaseaanroep.
- [ ] Bij een savefout worden de invoervelden hersteld vanuit de Store-snapshot.
- [ ] Offline- en RLS-fouten geven gecontroleerde feedback.

## Architectuur

- [ ] De nieuwe FDMP-keten is `Repository → Service → Store → bestaande Renderer Bridge`.
- [ ] `admin/module-registry-repository.js` is binnen de nieuwe FDMP-keten de enige database-adapter voor `platform_modules`.
- [ ] Repository, Service en Store bevatten geen DOM-manipulatie.
- [ ] Renderer bevat geen directe Supabase-query voor `platform_modules`.
- [ ] Store-state is ingekapseld via `#state` en wordt uitsluitend als snapshot gepubliceerd.
- [ ] Registry-navigatie blijft eigendom van de admin-shell en view-router.
- [ ] `legacySaveBridge` is expliciet tijdelijk en wordt verwijderd in PR 1B.

## Technische kwaliteit

- [ ] Geen uncaught promises tijdens laden of opslaan.
- [ ] Geen dubbele eventhandlers binnen de nieuwe Registry-renderer.
- [ ] Geen console-errors vanuit de FDMP-bootstrap.
- [ ] Diagnostiek rapporteert Repository, Store en admin-shell als eigenaren.

## Bekende overgangssituatie

`admin/admin.js` bevat tijdens PR 1A nog de legacy read-, write- en renderpaden. Deze worden pas verwijderd in PR 2 nadat de FDMP Foundation live is bewezen.
