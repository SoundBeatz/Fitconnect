(()=>{
  'use strict';

  const registrySelector='#moduleRegistry';
  const requiredKeys=['commerce','combination_deals','nutrition','rewards'];
  const combinationDealsKey='combination_deals';
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const getClient=()=>window.getFitConnectSupabase?.()||null;
  let rendering=false;
  let scheduled=false;
  let observer=null;

  const normalize=module=>({
    module_key:String(module.module_key||'').trim(),
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
        <label>Route<input data-module-route value="${escapeHtml(module.route)}" ${module.module_key===combinationDealsKey?'readonly':''}></label>
      </div>
      <button class="module-save" type="button" data-module-save>Module-instellingen opslaan</button>
    </article>`;
  }

  function claimRegistry(){
    const current=document.querySelector(registrySelector);
    if(!current)return null;
    current.dataset.registryOwner='module-registry-v6';
    current.dataset.registryVersion='6';
    return current;
  }

  function currentKeys(registry){
    return [...registry.querySelectorAll('[data-module-card]')]
      .map(card=>String(card.dataset.moduleCard||'').trim())
      .filter(Boolean);
  }

  function isCanonical(registry){
    const keys=new Set(currentKeys(registry));
    return requiredKeys.every(key=>keys.has(key))&&keys.size>=requiredKeys.length;
  }

  function syncNavigation(modules){
    const deals=modules.find(module=>module.module_key===combinationDealsKey);
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
    const byKey=new Map();
    for(const item of data||[]){
      const module=normalize(item);
      if(module.module_key)byKey.set(module.module_key,module);
    }
    const modules=[...byKey.values()].sort((a,b)=>a.display_order-b.display_order||a.name.localeCompare(b.name,'nl'));
    const keys=new Set(modules.map(module=>module.module_key));
    const missing=requiredKeys.filter(key=>!keys.has(key));
    window.__fitConnectModuleRegistryDiagnostics={version:6,loadedKeys:[...keys],missingKeys:missing,loadedCount:modules.length,checkedAt:new Date().toISOString()};
    if(missing.length)throw new Error(`Module Registry onvolledig. Ontbrekend: ${missing.join(', ')}.`);
    return modules;
  }

  function watchRegistry(registry){
    observer?.disconnect();
    observer=new MutationObserver(()=>{
      if(rendering||scheduled||isCanonical(registry))return;
      scheduled=true;
      queueMicrotask(()=>{
        scheduled=false;
        if(!rendering&&!isCanonical(registry))render('legacy-overwrite');
      });
    });
    observer.observe(registry,{childList:true,subtree:true});
  }

  async function render(reason='manual'){
    const registry=claimRegistry();
    if(!registry||rendering)return;
    rendering=true;
    observer?.disconnect();
    registry.innerHTML='<p class="module-registry-loading">Modules laden…</p>';
    try{
      const modules=await loadModules();
      registry.innerHTML=modules.map(cardMarkup).join('');
      syncNavigation(modules);
      registry.dataset.registryLastRender=reason;
    }catch(error){
      console.error('Module Registry v6:',error);
      registry.innerHTML=`<p class="module-registry-error">${escapeHtml(error.message||'Modules konden niet worden geladen.')}</p>`;
    }finally{
      rendering=false;
      watchRegistry(registry);
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
      await render('save');
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
      event.stopImmediatePropagation();
      save(saveButton.closest('[data-module-card]'),saveButton);
      return;
    }
    if(event.target.closest('[data-view="modules"]'))setTimeout(()=>render('modules-open'),0);
  },true);

  window.FitConnectModuleRegistry={render,version:6,owner:'module-registry-v6'};
  window.renderModules=()=>render('external-call');

  const start=()=>render('bootstrap');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>setTimeout(()=>render('window-load'),0),{once:true});
})();
