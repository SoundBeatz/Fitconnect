from pathlib import Path

shop=Path('shop/shop.js')
s=shop.read_text()
s=s.replace("  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';\n  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';\n",'')
s=s.replace("  const client=window.getFitConnectSupabase?.();\n", "  const client=window.getFitConnectSupabase?.();\n  const storefrontRepo=new window.StorefrontProductRepository(client);\n  const storefrontProductStore=new window.StorefrontProductStore(storefrontRepo);\n  window.storefrontProductStore=storefrontProductStore;\n")
start=s.index('  async function loadProducts(){')
end=s.index('\n  function renderBundles(){',start)
replacement="""  async function loadProducts(){
    grid.innerHTML='<div class=\"empty-state\">Producten laden…</div>';
    try{
      await loadProfile();
      const headers={apikey:'sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj',Authorization:'Bearer sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj'};
      const [catalog,brandResponse,bundleResponse]=await Promise.all([
        storefrontProductStore.loadStorefrontCatalog(),
        fetch('https://lwpiqshyqzsgwejvmbyo.supabase.co/rest/v1/brands?select=*&status=eq.active&order=featured.desc,display_order.asc,name.asc',{headers}),
        fetch('https://lwpiqshyqzsgwejvmbyo.supabase.co/rest/v1/commerce_bundles?select=id,name,slug,short_description,image_url,bundle_price,featured,allow_discount_codes,commerce_bundle_items(product_id,quantity,position,products(id,name,brand,price,vat,stock,status))&status=eq.active&order=featured.desc,display_order.asc,created_at.desc',{headers})
      ]);
      products=[...catalog];
      brands=brandResponse.ok?await brandResponse.json():[];
      bundles=bundleResponse.ok?await bundleResponse.json():[];
      renderBrands();renderBundles();renderPricingNotice();renderProducts();renderCart();
      if(new URLSearchParams(location.search).get('cart')==='open')openCart();
    }catch(error){
      console.error('FitConnect shop kon producten niet laden',error);
      grid.innerHTML='<div class=\"empty-state\">De producten konden niet worden geladen. Probeer de pagina opnieuw te openen.</div>';
    }
  }
"""
s=s[:start]+replacement+s[end:]
shop.write_text(s)

product=Path('shop/product/product.js')
p=product.read_text()
p=p.replace("  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';\n  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';\n", "  const client=window.getFitConnectSupabase?.();\n  const storefrontRepo=new window.StorefrontProductRepository(client);\n  const storefrontProductStore=new window.StorefrontProductStore(storefrontRepo);\n  window.storefrontProductStore=storefrontProductStore;\n")
start=p.index('  async function loadProduct(){')
end=p.index('\n  function showError(message){',start)
replacement="""  async function loadProduct(){
    if(!slug){showError('Geen product geselecteerd.');return}
    try{
      product=await storefrontProductStore.loadStorefrontDetail(slug);
      if(!product){showError('Dit product is niet beschikbaar.');return}
      renderProduct();
    }catch(error){
      console.error('FitConnect product kon niet laden',error);
      showError('De productgegevens konden niet worden geladen.');
    }
  }
"""
p=p[:start]+replacement+p[end:]
product.write_text(p)

index=Path('shop/index.html')
h=index.read_text()
h=h.replace('<script src="shop.js?v=20260724-2"></script>', '<script src="../shared/deep-freeze.js?v=20260802-recovery-release-v1.1"></script>\n<script src="storefront-product-repository.js?v=20260802-storefront-read-v1"></script>\n<script src="storefront-product-store.js?v=20260802-storefront-read-v1"></script>\n<script src="shop.js?v=20260802-storefront-read-v1"></script>')
index.write_text(h)

pi=Path('shop/product/index.html')
h=pi.read_text()
h=h.replace('<script src="../../shared/public-nav.js?v=20260721-1"></script>\n<script src="product.js?v=20260722-4"></script>', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="../../shared/supabase-config.js?v=20260715-1"></script>\n<script src="../../shared/deep-freeze.js?v=20260802-recovery-release-v1.1"></script>\n<script src="../storefront-product-repository.js?v=20260802-storefront-read-v1"></script>\n<script src="../storefront-product-store.js?v=20260802-storefront-read-v1"></script>\n<script src="../../shared/public-nav.js?v=20260802-recovery-release-v1.1"></script>\n<script src="product.js?v=20260802-storefront-read-v1"></script>')
pi.write_text(h)
