(()=>{
  const client=window.getFitConnectSupabase?.();
  if(!window.FitConnectWishlistStore||!window.StorefrontProductRepository||!window.StorefrontProductStore)return;
  const slug=new URLSearchParams(location.search).get('slug');
  if(!slug)return;
  const store=new window.FitConnectWishlistStore(client);
  const products=new window.StorefrontProductStore(new window.StorefrontProductRepository(client));
  const actions=document.querySelector('.buy-actions');
  if(!actions)return;
  const button=document.createElement('button');
  button.type='button';button.className='secondary wishlist-button';button.id='wishlistProduct';button.textContent='Bewaar op verlanglijst';
  actions.insertBefore(button,document.getElementById('shareProduct')||null);
  let productId='';
  function sync(){
    const active=productId&&store.has(productId);
    button.classList.toggle('active',Boolean(active));button.setAttribute('aria-pressed',String(Boolean(active)));button.textContent=active?'Bewaard op verlanglijst':'Bewaar op verlanglijst';
  }
  button.addEventListener('click',async()=>{
    if(!productId)return;
    button.disabled=true;
    try{await store.toggle(productId);sync()}catch(error){console.error('Verlanglijst wijzigen mislukt',error)}finally{button.disabled=false}
  });
  Promise.all([store.init(),products.loadStorefrontDetail(slug)]).then(([,product])=>{productId=product?.id||'';sync();button.disabled=!productId}).catch(error=>{console.error('Verlanglijst kon niet worden geladen',error);button.disabled=true});
  window.addEventListener('fitconnect:wishlist-changed',sync);
})();
