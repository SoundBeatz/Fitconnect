(()=>{
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const depth=path.split('/').filter(Boolean).length;
  const root=depth===0?'./':depth===1?'../':'../../';

  function addStylesheet(href,id){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;link.rel='stylesheet';link.href=href;
    document.head.appendChild(link);
  }
  function addScript(src,id){
    return new Promise((resolve,reject)=>{
      const existing=document.getElementById(id);
      if(existing){
        if(existing.dataset.loaded==='true'||existing.readyState==='complete')resolve();
        else existing.addEventListener('load',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.id=id;script.src=src;script.async=false;
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve()},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.head.appendChild(script);
    });
  }

  addStylesheet(`${root}shared/theme.css?v=20260714-5`,'fc-theme-css');
  (async()=>{
    try{
      if(!window.FITCONNECT_SUPABASE)await addScript(`${root}shared/supabase-config.js?v=20260714-8`,'fc-supabase-config');
      await addScript(`${root}shared/theme.js?v=20260714-4`,'fc-theme-js');
    }catch(error){console.error('FitConnect publiek thema kon niet laden',error)}
  })();

  const active=path==='/home'||path==='/'?'home':path.startsWith('/shop')?'shop':path.startsWith('/configurator')?'configurator':'home';
  const header=document.querySelector('header.nav-wrap,header.shop-nav,header.product-nav,header[data-fc-public-nav]');
  if(!header)return;
  const isShopCatalog=path==='/shop';
  const cartTile=isShopCatalog?'<button class="fc-nav-tile fc-cart-tile" id="cartButton" type="button">Winkelmand <span class="fc-cart-count" id="cartCount">0</span></button>':'';
  header.className='fc-public-nav';
  header.setAttribute('data-fc-public-nav','');
  header.innerHTML=`<a class="fc-brand" href="${root}"><span class="fc-brand-mark">FC</span><span>FitConnect</span></a><button class="fc-nav-mobile-toggle" type="button" aria-expanded="false" aria-label="Menu openen">☰</button><nav class="fc-nav-grid is-collapsed" aria-label="Hoofdnavigatie"><a class="fc-nav-tile ${active==='home'?'active':''}" href="${root}">Home</a><a class="fc-nav-tile ${active==='shop'?'active':''}" href="${root}shop/">Shop</a><a class="fc-nav-tile ${active==='configurator'?'active':''}" href="${root}configurator/">Gym ontwerp</a><a class="fc-nav-tile fc-nav-muted" href="${root}#expertise">Over FitConnect</a>${cartTile}</nav>`;
  const toggle=header.querySelector('.fc-nav-mobile-toggle'),nav=header.querySelector('.fc-nav-grid');
  const sync=()=>{if(innerWidth>1180){nav.classList.remove('is-collapsed');toggle.setAttribute('aria-expanded','true')}else if(toggle.getAttribute('aria-expanded')!=='true'){nav.classList.add('is-collapsed')}};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));nav.classList.toggle('is-collapsed',open)});
  addEventListener('resize',sync);sync();
})();