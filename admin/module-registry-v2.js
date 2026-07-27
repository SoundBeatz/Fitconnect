(()=>{
  'use strict';

  const registrySelector='#moduleRegistry';
  const fallbackModules=[
    {module_key:'commerce',name:'Commerce Shop',description:'Productcatalogus, winkelmand en checkout.',enabled:true,route:'/shop/',accent_color:'#f36f21',surface_style:'light',display_order:10,settings:{}},
    {module_key:'commerce.combination_deals',name:'Combination Deals',description:'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',enabled:true,route:'/admin/#combination-deals',accent_color:'#f36f21',surface_style:'premium',display_order:15,settings:{}},
    {module_key:'nutrition',name:'Nutrition Shop',description:'Gezonde voeding en supplementen als aparte winkelmodule.',enabled:false,route:'/nutrition/',accent_color:'#236451',surface_style:'natural',display_order:20,settings:{}},
    {module_key:'rewards',name:'FitCoins & FitKado',description:'Beloningen sparen en inwisselen.',enabled:false,route:'/rewards/',accent_color:'#e4a800',surface_style:'premium',display_order:30,settings:{}}
  ];

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const getClient=()=>window.getFitConnectSupabase?.()||null;
  const normalize=module=>({
    module_key:module.module_key,
    name:module.name||module.module_key,
    description:module.description||'',
    enabled:Boolean(module.enabled),
    route:module.route||'',
    accent_color:module.accent_color||'#f36f21',
    surface_style:module.surface_style||'light',
    display_order:Number(module.display_order??100),
    settings:module.settings&&typeof module.settings==='object'?module.settings:{}
  });

  function cardMarkup(module){
    return `<article class="module-config-card ${module.enabled?'enabled':''}" data-module-card="${escapeHtml(module.module_key)}">
      <div class="module-config-head">
        <div><h2>${escapeHtml(module.name)}</h2><p>${escapeHtml(module.description)}</p></div>
        <label class="module-switch"><input type="checkbox" data-module-enabled ${module.enabled?'checked':''}><span></span></label>
      </div>
      <div class="module-config-fields">
        <label>Modulenaam<input data-module-name value="${escapeHtml(module.name)}" maxlength="120"></label>
        <label>Accentkleur<input data-module-accent type="color" value="${escapeHtml(module.accent_color)}"></label>
        <label>Materiaal / stijl<select data-module-surface>
          <option value="light" ${module.surface_style==='light'?'selected':''}>Licht</option>
          <option value="dark" ${module.surface_style==='dark'?'selected':''}>Donker</option>
          <option value="natural" ${module.surface_style==='natural'?'selected':''}>Natuurlijk</option>
          <option value="premium" ${module.surface_style==='premium'?'selected':''}>Premium</option>
        </select></label>
        <label>Route<input data-module-route value="${escapeHtml(module.route)}" ${module.module_key==='commerce.combination_deals'?'readonly':''}></label>
      </div>
      <button class="module-save" type="button" data-module-save>Module-instellingen opslaan</button>
    </article>`;
  }

  function syncNavigation(modules){
    const byKey=new Map(modules.map(module=>[module.module_key,module]));
    const deals=byKey.get('commerce.combination_deals');
    const dealsNav=document.querySelector('[data-view="combination-deals"]');
    if(dealsNav&&deals){
      dealsNav.hidden=!deals.enabled;
      dealsNav.setAttribute('aria-disabled',String(!deals.enabled));
    }
  }

  async function loadModules(){
    const client=getClient();
    if(!client)throw new Error('Databaseverbinding is nog niet beschikbaar.');
    const {data,error}=await client.from('platform_modules').select('*').order('display_order',{ascending:true});
    if(error)throw error;
    const existing=new Map((data||[]).map(module=>[module.module_key,normalize(module)]));
    const missing=fallbackModules.filter(module=>!existing.has(module.module_key));
    if(missing.length){
      const {data:seeded,error:seedError}=await client.from('platform_modules').upsert(missing,{onConflict:'module_key'}).select('*');
      if(seedError)throw seedError;
      (seeded||[]).forEach(module=>existing.set(module.module_key,normalize(module)));
    }
    return [...existing.values()].sort((a,b)=>a.display_order-b.display_order||a.name.localeCompare(b.name,'nl'));
  }

  async function render(){
    const registry=document.querySelector(registrySelector);
    if(!registry)return;
    registry.dataset.registryVersion='2';
    registry.innerHTML='<p class="module-registry-loading">Modules laden…</p>';
    try{
      const modules=await loadModules();
      registry.innerHTML=modules.map(cardMarkup).join('')||'<p>Er zijn nog geen modules geregistreerd.</p>';
      syncNavigation(modules);
    }catch(error){
      console.error('Module Registry v2:',error);
      registry.innerHTML=`<p class="module-registry-error">${escapeHtml(error.message||'Modules konden niet worden geladen.')}</p>`;
    }
  }

  async function save(card,button){
    const client=getClient();
    if(!client)return window.fitConnectToast?.('Databaseverbinding ontbreekt.');
    const moduleKey=card.dataset.moduleCard;
    button.disabled=true;
    button.textContent='Opslaan…';
    try{
      const payload={
        module_key:moduleKey,
        name:card.querySelector('[data-module-name]').value.trim()||moduleKey,
        enabled:card.querySelector('[data-module-enabled]').checked,
        accent_color:card.querySelector('[data-module-accent]').value,
        surface_style:card.querySelector('[data-module-surface]').value,
        route:card.querySelector('[data-module-route]').value.trim(),
        updated_at:new Date().toISOString()
      };
      const {error}=await client.from('platform_modules').upsert(payload,{onConflict:'module_key'});
      if(error)throw error;
      card.classList.toggle('enabled',payload.enabled);
      syncNavigation([payload]);
      window.fitConnectToast?.(`${payload.name} ${payload.enabled?'ingeschakeld':'uitgeschakeld'}`);
    }catch(error){
      console.error(error);
      window.fitConnectToast?.(error.message||'Module-instellingen opslaan mislukt.');
    }finally{
      button.disabled=false;
      button.textContent='Module-instellingen opslaan';
    }
  }

  document.addEventListener('click',event=>{
    const saveButton=event.target.closest('[data-module-save]');
    if(saveButton){
      event.preventDefault();
      save(saveButton.closest('[data-module-card]'),saveButton);
      return;
    }
    if(event.target.closest('[data-view="modules"]'))setTimeout(render,50);
  });

  window.FitConnectModuleRegistry={render,version:2};
  const start=()=>render();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
