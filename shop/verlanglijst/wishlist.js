(()=>{
  const client=window.getFitConnectSupabase?.();
  const store=new window.FitConnectWishlistStore(client);
  const productStore=new window.StorefrontProductStore(new window.StorefrontProductRepository(client));
  const grid=document.getElementById('wishlistGrid'),status=document.getElementById('wishlistStatus');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  function readCart(){try{const parsed=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');return Array.isArray(parsed)?parsed:[]}catch{return []}}
  function addToCart(productId){const cart=readCart();const existing=cart.find(item=>item?.productId===productId);if(existing)existing.quantity=Number(existing.quantity||0)+1;else cart.push({productId,quantity:1});localStorage.setItem('fitconnect-cart',JSON.stringify(cart));location.href='../?cart=open'}
  async function render(){
    const ids=store.snapshot();
    status.textContent=store.user?'Gesynchroniseerd met uw FitConnect-account.':'Deze selectie staat op dit apparaat. Log in om hem aan uw account te koppelen.';
    if(!ids.length){grid.innerHTML='<div class="wishlist-empty"><h2>Nog niets bewaard</h2><p>Bewaar producten vanuit de shop om ze hier later snel terug te vinden.</p><a class="button primary" href="../">Bekijk producten</a></div>';return}
    const catalog=await productStore.loadStorefrontCatalog();
    const products=ids.map(id=>catalog.find(product=>product.id===id)).filter(Boolean);
    if(!products.length){grid.innerHTML='<div class="wishlist-empty"><h2>Uw bewaarde producten zijn niet meer beschikbaar</h2><p>Verwijder verouderde items of kies opnieuw uit de actuele shop.</p></div>';return}
    grid.innerHTML=products.map(product=>{
      const image=Array.isArray(product.images)?product.images.find(item=>typeof item==='string'&&!/(?:youtube|youtu\.be|vimeo|loom|dailymotion|wistia)/i.test(item)):'';
      return `<article class="wishlist-card"><div class="wishlist-image"${image?` data-image="${escapeHtml(image)}"`:''}></div><div class="wishlist-copy"><p class="product-brand">${escapeHtml(product.brand||'FitConnect')}</p><h2><a href="../product/?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a></h2><p>${escapeHtml(product.short_description||'Professioneel geselecteerd door FitConnect.')}</p><strong>${euro(product.price)}</strong><div class="wishlist-actions"><button class="button primary" type="button" data-cart="${product.id}">In winkelmand</button><button class="wishlist-button active" type="button" data-remove="${product.id}">Verwijderen</button></div></div></article>`;
    }).join('');
    document.querySelectorAll('[data-image]').forEach(node=>node.style.backgroundImage=`url(${JSON.stringify(node.dataset.image)})`);
    document.querySelectorAll('[data-cart]').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.cart)));
    document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{await store.remove(button.dataset.remove);await render()}finally{button.disabled=false}}));
  }
  document.getElementById('year').textContent=new Date().getFullYear();
  store.init().then(render).catch(error=>{console.error(error);status.textContent='De verlanglijst kon niet worden geladen.';grid.innerHTML='<div class="wishlist-empty">Probeer de pagina opnieuw te openen.</div>'});
})();
