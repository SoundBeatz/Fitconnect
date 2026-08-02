# Definition of Done: Commerce Inventory Foundation PR #115

## Functionaliteit
- [ ] Voorraad laadt via InventoryPersistenceAdapter → InventoryRepository → InventoryService → InventoryStore.
- [ ] De bestaande producteditor en voorraadweergave wijzigen visueel niet.
- [ ] De tijdelijke InventoryV1Bridge koppelt product-editor events aan InventoryStore.
- [ ] Negatieve en ongeldige voorraadwaarden worden door InventoryService geblokkeerd.

## Architectuur
- [ ] Alleen `inventory-persistence-adapter.js` kent `products.stock` als fysieke backing.
- [ ] InventoryRepository bevat geen Supabase- of tabelkennis.
- [ ] InventoryStore gebruikt private `#state` en immutable snapshots.
- [ ] InventoryStore bevat geen ProductStore-, CategoryStore-, BrandStore- of SupplierStore-koppeling.
- [ ] Multi-warehouse statussen zijn gereserveerd: available, reserved, incoming, damaged, quarantine en allocated.

## Overgang
- [ ] De bridge is tijdelijk en wordt in PR #116 vervangen door InventoryRenderer.
- [ ] Checkoutreserveringen en mutatielogboek zijn expliciet gereserveerd maar nog niet geïmplementeerd.
