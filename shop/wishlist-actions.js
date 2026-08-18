(()=>{
  const client=window.getFitConnectSupabase?.();
  if(!window.FitConnectWishlistStore)return;
  const store=new window.FitConnectWishlistStore(client);
  window.fitConnectWishlist=store;

  function ensureButton(card){
    const add=card.querySelector('.add-button');
    if(!add||card.querySelector('.wishlist-button'))return;
    const productId=add.dataset.id;if(!productId)return;
    const button=document.createElement('button');
    button.type='button';button.className='wishlist-button';button.dataset.wishlistId=productId;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',async()=>{
      button.disabled=true;
      try{await store.toggle(productId);syncButtons()}catch(error){console.error('Verlanglijst wijzigen mislukt',error)}finally{button.disabled=false}
    });
    add.parentElement?.insertBefore(button,add);
  }
  function syncButtons(){
    document.querySelectorAll('[data-wishlist-id]').forEach(button=>{
      const active=store.has(button.dataset.wishlistId);
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?'Bewaard':'Bewaar';
    });
    let link=document.getElementById('wishlistLink');
    if(!link){
      const tools=document.querySelector('.shop-tools');
      if(tools){link=document.createElement('a');link.id='wishlistLink';link.className='wishlist-link';link.href='verlanglijst/';tools.appendChild(link)}
    }
    if(link)link.textContent=`Verlanglijst (${store.snapshot().length})`;
  }
  function hydrate(){document.querySelectorAll('.product-card').forEach(ensureButton);syncButtons()}
  const grid=document.getElementById('productGrid');
  if(grid)new MutationObserver(hydrate).observe(grid,{childList:true,subtree:true});
  window.addEventListener('fitconnect:wishlist-changed',syncButtons);
  store.init().finally(hydrate);
})();
