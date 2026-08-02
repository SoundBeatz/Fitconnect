from pathlib import Path

TAG='20260802-storefront-commerce-v1'

def one(text, old, new, label):
    if old not in text: raise SystemExit(f'{label}: source not found')
    return text.replace(old,new,1)

# Shop HTML bootstrap
p=Path('shop/index.html'); s=p.read_text()
needle='<script src="storefront-product-store.js?v=20260802-products-release-v1.0"></script>'
insert=needle+f'\n<script src="storefront-commerce-repositories.js?v={TAG}"></script>\n<script src="storefront-inventory-service.js?v={TAG}"></script>\n<script src="storefront-commerce-stores.js?v={TAG}"></script>'
s=one(s,needle,insert,'shop bootstrap')
s=s.replace('shop.js?v=20260802-products-release-v1.0',f'shop.js?v={TAG}')
p.write_text(s)

# Detail HTML bootstrap
p=Path('shop/product/index.html'); s=p.read_text()
needle='<script src="../storefront-product-store.js?v=20260802-products-release-v1.0"></script>'
insert=needle+f'\n<script src="../storefront-commerce-repositories.js?v={TAG}"></script>\n<script src="../storefront-inventory-service.js?v={TAG}"></script>\n<script src="../storefront-commerce-stores.js?v={TAG}"></script>'
s=one(s,needle,insert,'detail bootstrap')
s=s.replace('product.js?v=20260802-products-release-v1.0',f'product.js?v={TAG}')
p.write_text(s)

# Shop runtime
p=Path('shop/shop.js'); s=p.read_text()
needle='window.storefrontProductStore=storefrontProductStore;'
insert=needle+"\n  const storefrontBrandStore=new window.StorefrontBrandStore(new window.StorefrontBrandRepository(client));\n  const storefrontInventoryStore=new window.StorefrontInventoryStore(new window.StorefrontInventoryService(new window.StorefrontInventoryRepository(client)));\n  window.storefrontBrandStore=storefrontBrandStore;window.storefrontInventoryStore=storefrontInventoryStore;"
s=one(s,needle,insert,'shop stores')
s=one(s,"const stockText=product=>Number(product.stock)>0?`${product.stock} op voorraad`:'Op aanvraag';","const stockText=product=>{const state=storefrontInventoryStore.getState(product.id);return state?.availability==='IN_STOCK'?'Op voorraad':state?.availability==='LOW_STOCK'?'Beperkte voorraad':'Op aanvraag'};",'stock text')
s=s.replace("fetch('https://lwpiqshyqzsgwejvmbyo.supabase.co/rest/v1/brands?select=*&status=eq.active&order=featured.desc,display_order.asc,name.asc',{headers}),","storefrontBrandStore.loadPublicBrands(),")
s=s.replace('products=[...catalog];\n      brands=brandResponse.ok?await brandResponse.json():[];','products=[...catalog];\n      brands=[...(brandResponse||[])];')
s=s.replace('products(id,name,brand,price,vat,stock,status)','products(id,name,brand,price,vat,status)')
s=s.replace("const available=bundles.filter(bundle=>(bundle.commerce_bundle_items||[]).length>=2&&(bundle.commerce_bundle_items||[]).every(item=>item.products?.status==='active'&&Number(item.products.stock)>=Number(item.quantity)));","const available=bundles.filter(bundle=>(bundle.commerce_bundle_items||[]).length>=2&&(bundle.commerce_bundle_items||[]).every(item=>item.products?.status==='active'&&storefrontInventoryStore.getState(item.product_id)?.canOrder));")
s=s.replace('renderBrands();renderBundles();renderPricingNotice();renderProducts();renderCart();','await storefrontInventoryStore.loadMany([...products.map(product=>product.id),...bundles.flatMap(bundle=>(bundle.commerce_bundle_items||[]).map(item=>item.product_id))]);\n      renderBrands();renderBundles();renderPricingNotice();renderProducts();renderCart();')
s=s.replace('brand.logo_url','brand.logoUrl').replace('brandMeta?.logo_url','brandMeta?.logoUrl')
p.write_text(s)

# Detail runtime
p=Path('shop/product/product.js'); s=p.read_text()
needle='window.storefrontProductStore=storefrontProductStore;'
insert=needle+"\n  const storefrontInventoryStore=new window.StorefrontInventoryStore(new window.StorefrontInventoryService(new window.StorefrontInventoryRepository(client)));\n  window.storefrontInventoryStore=storefrontInventoryStore;"
s=one(s,needle,insert,'detail store')
s=one(s,'renderProduct();','await storefrontInventoryStore.loadPublicStock(product.id);\n      renderProduct();','detail inventory load')
s=s.replace("el('stock').textContent=Number(p.stock)>0?`${p.stock} op voorraad`:'Op aanvraag';","const inventory=storefrontInventoryStore.getState(p.id);el('stock').textContent=inventory?.availability==='IN_STOCK'?'Op voorraad':inventory?.availability==='LOW_STOCK'?'Beperkte voorraad':'Op aanvraag';if(el('addToCart'))el('addToCart').disabled=!inventory?.canOrder;")
s=s.replace("availability:Number(p.stock)>0?'https://schema.org/InStock':'https://schema.org/PreOrder'","availability:inventory?.canOrder?'https://schema.org/InStock':'https://schema.org/PreOrder'")
p.write_text(s)

# Guard against exact inventory quantities in product DTO/runtime
for path in ['shop/storefront-product-repository.js','shop/shop.js','shop/product/product.js']:
    text=Path(path).read_text()
    if 'product.stock' in text or 'p.stock' in text: raise SystemExit(f'legacy stock leak remains in {path}')
