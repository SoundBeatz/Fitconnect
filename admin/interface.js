(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const defaults={headingSize:36,accent:'#f36f21',density:'comfortable',drawerSide:'right',contentWidth:1440};
  function readSettings(){try{return {...defaults,...JSON.parse(localStorage.getItem('fitconnect-os-interface')||'{}')}}catch{return {...defaults}}}
  let settings=readSettings();
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
  $('#saveInterface')?.addEventListener('click',()=>{localStorage.setItem('fitconnect-os-interface',JSON.stringify(settings));window.fitConnectToast?.('Interface-instellingen bewaard');close()});
  $('#resetInterface')?.addEventListener('click',()=>{settings={...defaults};localStorage.removeItem('fitconnect-os-interface');apply();window.fitConnectToast?.('Standaardinterface hersteld')});
  apply();
})();