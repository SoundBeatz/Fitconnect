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
  addTypographyLink();
  apply();
  loadPublishedTheme();
})();
