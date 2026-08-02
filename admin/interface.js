(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const client=window.getFitConnectSupabase?.();
  const defaults={headingSize:36,accent:'#f36f21',density:'comfortable',drawerSide:'right',contentWidth:1440,radius:18};
  function readLocal(){try{return {...defaults,...JSON.parse(localStorage.getItem('fitconnect-os-interface')||'{}')}}catch{return {...defaults}}}
  let settings=readLocal();
  function addTypographyLink(){
    const nav=document.querySelector('.sidebar nav');
    if(!nav||document.getElementById('typographyControlLink')||nav.querySelector('a[href="typography/"]'))return;
    const link=document.createElement('a');
    link.id='typographyControlLink';
    link.className='nav-item module-live';
    link.href='typography/';
    link.innerHTML='Typografie <span>Control</span>';
    nav.appendChild(link);
  }
  function ensureCombinationDealsNavigation(){
    const button=document.querySelector('[data-view="combination-deals"]');
    if(!button)return;
    button.hidden=false;
    button.removeAttribute('hidden');
    button.style.removeProperty('display');
    button.setAttribute('aria-disabled','false');
  }
  function loadScript(src,datasetKey){
    const existing=document.querySelector(`script[data-${datasetKey}]`);
    if(existing)return Promise.resolve(existing);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.setAttribute(`data-${datasetKey}`,'true');
      script.addEventListener('load',()=>resolve(script),{once:true});
      script.addEventListener('error',()=>reject(new Error(`Script laden mislukt: ${src}`)),{once:true});
      document.head.appendChild(script);
    });
  }
  function loadStyle(href,datasetKey){
    if(document.querySelector(`link[data-${datasetKey}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-${datasetKey}`,'true');
    document.head.appendChild(link);
  }
  async function loadCommerceIntelligenceControls(){
    loadStyle('dealstudio-complete.css?v=20260725-1','fitconnect-dealstudio-complete-css');
    try{
      await loadScript('view-router.js?v=20260802-1','fitconnect-view-router');
      await loadScript('product-purchase-price.js?v=20260725-2','fitconnect-purchase-price');
      await loadScript('bundle-dealstudio-intelligence.js?v=20260725-1','fitconnect-dealstudio-intelligence');
      await loadScript('dealstudio-route-isolation.js?v=20260802-4','fitconnect-dealstudio-route-isolation');
      await loadScript('dealstudio-lazy-loader.js?v=20260802-1','fitconnect-dealstudio-lazy-loader');
      await loadScript('combination-deals-runtime-loader.js?v=20260726-1','fitconnect-combination-runtime-loader');
    }catch(error){
      console.error('Command Center bootstrap:',error);
      window.fitConnectToast?.(error.message||'Command Center-module kon niet worden geladen.');
    }
  }
  function apply(){
    document.documentElement.style.setProperty('--heading-size',`${settings.headingSize}px`);
    document.documentElement.style.setProperty('--accent',settings.accent);
    document.documentElement.style.setProperty('--content-width',`${settings.contentWidth}px`);
    document.body.classList.toggle('density-compact',settings.density==='compact');
    const drawer=$('#settingsDrawer');
    if(drawer)drawer.classList.toggle('left',settings.drawerSide==='left');
    if($('#headingSize'))$('#headingSize').value=settings.headingSize;
    if($('#headingSizeValue'))$('#headingSizeValue').textContent=`${settings.headingSize} px`;
    if($('#customAccent'))$('#customAccent').value=settings.accent;
    if($('#densitySelect'))$('#densitySelect').value=settings.density;
    if($('#drawerSide'))$('#drawerSide').value=settings.drawerSide;
    if($('#contentWidth'))$('#contentWidth').value=settings.contentWidth;
    if($('#contentWidthValue'))$('#contentWidthValue').textContent=`${settings.contentWidth} px`;
    $$('#colorOptions button').forEach(button=>button.classList.toggle('active',button.dataset.color?.toLowerCase()===settings.accent.toLowerCase()));
  }
  async function loadPublishedTheme(){
    if(!client)return;
    const {data,error}=await client.from('site_theme_settings').select('*').eq('id','default').single();
    if(error){console.warn(error.message);return}
    settings={...settings,accent:data.accent,headingSize:data.heading_size,contentWidth:data.content_width,density:data.density,radius:data.radius||18};
    apply();
  }
  function open(){apply();$('#settingsDrawer')?.classList.add('open');$('#drawerBackdrop')?.classList.add('open');$('#settingsDrawer')?.setAttribute('aria-hidden','false');$('#settingsButton')?.setAttribute('aria-expanded','true')}
  function close(){$('#settingsDrawer')?.classList.remove('open');$('#drawerBackdrop')?.classList.remove('open');$('#settingsDrawer')?.setAttribute('aria-hidden','true');$('#settingsButton')?.setAttribute('aria-expanded','false')}
  $('#settingsButton')?.addEventListener('click',open);
  $('#closeSettings')?.addEventListener('click',close);
  $('#drawerBackdrop')?.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
  $('#headingSize')?.addEventListener('input',event=>{settings.headingSize=Number(event.target.value);apply()});
  $('#contentWidth')?.addEventListener('input',event=>{settings.contentWidth=Number(event.target.value);apply()});
  $('#densitySelect')?.addEventListener('change',event=>{settings.density=event.target.value;apply()});
  $('#drawerSide')?.addEventListener('change',event=>{settings.drawerSide=event.target.value;apply()});
  $('#customAccent')?.addEventListener('input',event=>{settings.accent=event.target.value;apply()});
  $$('#colorOptions button').forEach(button=>button.addEventListener('click',()=>{settings.accent=button.dataset.color;apply()}));
  $('#saveInterface')?.addEventListener('click',async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='Publiceren…';
    try{
      localStorage.setItem('fitconnect-os-interface',JSON.stringify(settings));
      if(!client)throw new Error('Databaseverbinding ontbreekt');
      const payload={id:'default',accent:settings.accent,heading_size:Number(settings.headingSize),content_width:Number(settings.contentWidth),density:settings.density,radius:Number(settings.radius||18),updated_at:new Date().toISOString()};
      const {error}=await client.from('site_theme_settings').upsert(payload,{onConflict:'id'});
      if(error)throw error;
      window.fitConnectToast?.('Interface gepubliceerd op de volledige website');
      close();
    }catch(error){window.fitConnectToast?.(error.message||'Publiceren mislukt')}
    finally{button.disabled=false;button.textContent='Instellingen bewaren'}
  });
  $('#resetInterface')?.addEventListener('click',()=>{settings={...defaults,drawerSide:settings.drawerSide};localStorage.removeItem('fitconnect-os-interface');apply();window.fitConnectToast?.('Standaardinterface klaar om te publiceren')});
  ensureCombinationDealsNavigation();
  new MutationObserver(ensureCombinationDealsNavigation).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden','style']});
  addTypographyLink();
  loadCommerceIntelligenceControls();
  apply();
  loadPublishedTheme();
})();
