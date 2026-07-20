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
  addStylesheet(`${root}shared/typography.css?v=20260717-2`,'fc-typography-css');

  const active=path==='/home'||path==='/'?'home':path.startsWith('/nutrition')?'nutrition':path.startsWith('/shop')?'shop':path.startsWith('/configurator')?'configurator':path.startsWith('/login')?'login':'home';
  const header=document.querySelector('header.nav-wrap,header.shop-nav,header.product-nav,header[data-fc-public-nav]');
  if(!header)return;

  const isShopCatalog=path==='/shop';
  const cartTile=isShopCatalog?'<button class="fc-nav-tile fc-cart-tile" id="cartButton" type="button">Winkelmand <span class="fc-cart-count" id="cartCount">0</span></button>':'';
  const accountTile=`<div class="fc-account-wrap" id="fcAccountWrap"><a id="fcAccountTile" class="fc-nav-tile ${active==='login'?'active':''}" href="${root}login/">Inloggen</a></div>`;

  header.className='fc-public-nav';
  header.setAttribute('data-fc-public-nav','');
  header.innerHTML=`<a class="fc-brand" href="${root}"><span class="fc-brand-mark">FC</span><span>FitConnect</span></a><button class="fc-nav-mobile-toggle" type="button" aria-expanded="false" aria-label="Menu openen">☰</button><nav class="fc-nav-grid is-collapsed" aria-label="Hoofdnavigatie"><a class="fc-nav-tile ${active==='home'?'active':''}" href="${root}">Home</a><a class="fc-nav-tile ${active==='shop'?'active':''}" href="${root}shop/">Gymshop</a><a class="fc-nav-tile ${active==='nutrition'?'active':''}" href="${root}nutrition/">Voedingsshop</a><a class="fc-nav-tile ${active==='configurator'?'active':''}" href="${root}configurator/">Gym ontwerp</a><a class="fc-nav-tile fc-nav-muted" href="${root}#expertise">Over FitConnect</a>${cartTile}${accountTile}</nav>`;

  const toggle=header.querySelector('.fc-nav-mobile-toggle');
  const nav=header.querySelector('.fc-nav-grid');
  const sync=()=>{
    if(innerWidth>1180){
      nav.classList.remove('is-collapsed');
      toggle.setAttribute('aria-expanded','true');
    }else if(toggle.getAttribute('aria-expanded')!=='true'){
      nav.classList.add('is-collapsed');
    }
  };
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')==='true';
    toggle.setAttribute('aria-expanded',String(!open));
    nav.classList.toggle('is-collapsed',open);
  });
  addEventListener('resize',sync);
  sync();

  function closeAccountMenu(){
    const button=document.getElementById('fcAccountButton');
    const menu=document.getElementById('fcAccountMenu');
    if(!button||!menu)return;
    button.setAttribute('aria-expanded','false');
    menu.hidden=true;
  }

  (async()=>{
    try{
      if(!window.supabase)await addScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','fc-supabase-js');
      if(!window.FITCONNECT_SUPABASE)await addScript(`${root}shared/supabase-config.js?v=20260715-2`,'fc-supabase-config');
      await addScript(`${root}shared/theme.js?v=20260714-4`,'fc-theme-js');
      await addScript(`${root}shared/typography.js?v=20260717-2`,'fc-typography-js');

      const client=window.getFitConnectSupabase?.();
      if(!client)return;

      const {data:{session}}=await client.auth.getSession();
      if(!session?.user)return;

      const {data:profile,error}=await client
        .from('profiles')
        .select('role,full_name,account_type,customer_tier')
        .eq('id',session.user.id)
        .maybeSingle();
      if(error)throw error;

      const wrap=document.getElementById('fcAccountWrap');
      if(!wrap)return;

      const isAdmin=profile?.role==='admin';
      const destination=isAdmin?`${root}admin/`:`${root}portal/`;
      const label=isAdmin?'Command Center':'Mijn FitConnect';
      const fullName=profile?.full_name||session.user.user_metadata?.full_name||session.user.email||'Account';
      const firstName=String(fullName).trim().split(/\s+/)[0]||'Account';
      const tier=profile?.customer_tier==='gold'?'Gold Member':profile?.customer_tier==='silver'?'Silver Member':profile?.account_type==='business'?'Zakelijk account':'Particulier account';

      wrap.innerHTML=`<button id="fcAccountButton" class="fc-nav-tile fc-account-button ${(isAdmin&&path.startsWith('/admin'))||(!isAdmin&&path.startsWith('/portal'))?'active':''}" type="button" aria-expanded="false" aria-controls="fcAccountMenu"><span class="fc-account-icon">👤</span><span>${label}</span><span class="fc-account-chevron">⌄</span></button><div class="fc-account-menu" id="fcAccountMenu" hidden><div class="fc-account-summary"><strong>${firstName}</strong><span>${isAdmin?'Beheerder':tier}</span></div><a href="${destination}">${isAdmin?'Open Command Center':'Dashboard'}</a>${isAdmin?`<a href="${root}admin/#products">Producten</a><a href="${root}admin/#customers">Klanten</a>`:`<a href="${root}portal/">Mijn account</a><a href="${root}shop/">Mijn prijzen</a>`}<button id="fcAccountLogout" type="button">Uitloggen</button></div>`;

      const button=document.getElementById('fcAccountButton');
      const menu=document.getElementById('fcAccountMenu');
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const open=button.getAttribute('aria-expanded')==='true';
        button.setAttribute('aria-expanded',String(!open));
        menu.hidden=open;
      });
      menu.addEventListener('click',event=>event.stopPropagation());
      document.addEventListener('click',closeAccountMenu);
      document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAccountMenu()});
      document.getElementById('fcAccountLogout').addEventListener('click',async()=>{
        const logout=document.getElementById('fcAccountLogout');
        logout.disabled=true;logout.textContent='Uitloggen…';
        try{await client.auth.signOut({scope:'local'});}finally{location.replace(`${root}login/?logout=1`)}
      });
    }catch(error){
      console.error('FitConnect slimme navigatie kon niet laden',error);
    }
  })();
})();
