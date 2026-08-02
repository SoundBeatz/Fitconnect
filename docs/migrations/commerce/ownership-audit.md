# FitConnect Commerce Domain Ownership Audit

## Status
Read-only audit. Geen productiecode gewijzigd.

## Scope
- Brands
- Suppliers
- Categories
- Inventory

## Executive finding
Het Commerce Domain kent nog geen uniforme FDMP-eigendomslijnen. Brands en Suppliers worden monolithisch beheerd vanuit `admin/admin.js`; Brands heeft daarnaast een tweede publieke reader in `shop/shop.js`. Categories bestaat hoofdzakelijk uit verspreide strings en statische UI-definities. Inventory is momenteel een plat voorraadgetal in `products.stock`, zonder aantoonbare reserverings- of magazijnlifecycle.

## Brands
### Huidige data owners
- `admin/admin.js`
  - globale state `brands=[]`
  - `client.from('brands').select('*')` in `loadAll()`
  - directe `insert` en `update` vanuit `#brandForm`
  - volledige re-fetch na save
- `shop/shop.js`
  - zelfstandige publieke REST-call naar `/rest/v1/brands`
  - eigen globale `brands=[]`

### Huidige DOM owners
- `admin/admin.js`
  - `#brandAdminGrid`
  - `#productBrandSelect`
  - `#productBrandFilter`
  - `#brandLogoPreview`
- `shop/shop.js`
  - `#brandDisplay`
  - `#brandFilter`
  - productkaart-logo's

### Relatie met Products
Products bewaart `brand` als naam/string. De audit vond geen duurzame `brand_id`-relatie in de actieve ProductRepository. Een merknaamwijziging kan daardoor bestaande productstrings en storefrontmatching ontkoppelen.

## Suppliers
### Huidige data owner
- `admin/admin.js`
  - globale state `suppliers=[]`
  - `client.from('suppliers').select('*')` in `loadAll()`
  - directe `insert` en `update` vanuit `#supplierForm`
  - volledige re-fetch na save

### Huidige DOM owner
- `#supplierGrid`
- `#supplierForm`
- `#productSupplierSelect`

### Relatie met Products en inkoopprijs
De producteditor vult de leveranciersselectie met leveranciersnamen. In de actieve ProductRepository is geen `supplier_id` zichtbaar. `product-purchase-price.js` roept `commerce_set_product_purchase_price` aan met uitsluitend `p_product_id` en `p_purchase_price`; er is geen leverancierparameter in deze clientflow.

## Categories
### Huidige modelvorm
De audit vond geen bewezen actieve `categories`- of `product_categories`-repositoryflow. Categoriegegevens bestaan verspreid als:
- `products.category` string;
- `specifications.Subcategorie`;
- hardcoded opties in de admin producteditor;
- hardcoded categorie- en subcategorieknoppen in `shop/index.html`;
- filters in `shop/shop.js`.

### Ownership-risico
Er is geen centrale key, parent-child lifecycle of migratiepad. Labels zijn daarmee de identiteit. Een tekstwijziging kan filtering, navigatie en bestaande producten uit elkaar trekken.

## Inventory
### Huidige modelvorm
Voorraad is een numeriek veld op het productmodel:
- `products.stock`
- gemapt door `ProductRepository`
- publiek gelezen door het Storefront Read Model

### Huidige consumers
- productbeheer en productformulier;
- storefront voorraadlabel;
- Combination Deals beschikbaarheidscontrole;
- winkelmandweergave.

### Niet aangetroffen
Binnen de onderzochte actieve runtimes is geen bewijs gevonden voor:
- `inventory` / `inventory_levels` / `warehouses` als actieve bron;
- `reserved_quantity`;
- winkelmandreserveringen;
- checkout-reserveringen;
- automatische voorraadmutatie bij betaling;
- voorraadlocaties of mutatieboek.

De winkelmand wordt lokaal opgeslagen in `localStorage` en reserveert geen voorraad.

## Target ownership
- `BrandRepository → BrandService → BrandStore → BrandRenderer`
- `SupplierRepository → SupplierService → SupplierStore → SupplierRenderer`
- `CategoryRepository → CategoryService → CategoryStore → CategoryRenderer`
- `InventoryRepository → InventoryService → InventoryStore → InventoryRenderer`

Cross-domain communicatie verloopt uitsluitend via expliciete EventBus-events conform ADR-006.