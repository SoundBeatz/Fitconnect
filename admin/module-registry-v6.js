(()=>{
  'use strict';

  const registrySelector='#moduleRegistryCanonical';
  const combinationDealsKey='combination_deals';
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  let registryStore=null;
  let rendering=false;

  function cardMarkup(module){
    return `<article class="module-config-card ${module.enabled?'enabled':''}" data-module-card="${escapeHtml(module.moduleKey)}">
      <div class="module-config-head">
        <div><h2>${escapeHtml(module.name)}</h2><p>${escapeHtml(module.description)}</p></div>
        <label class="module-switch"><input type="checkbox" data-module-enabled ${module.enabled?'checked':''}><span></span></label>
      </div>
      <div class="module-config-fields">
        <label>Modulenaam<input data-module-name value="${escapeHtml(module.name)}" maxlength="120"></label>
        <label>Accentkleur<input data-module-accent type="color" value="${escapeHtml(module.accentColor)}"></label>
        <label>Materiaal / stijl<select data-module-surface>
          <option value="light" ${module.surfaceStyle==='light'?'selected':''}>Licht</option>
          <option value="dark" ${module.surfaceStyle==='dark'?'selected':''}>Donker</option>
          <option value="natural" ${module.surfaceStyle==='natural'?'selected':''}>Natuurlijk</option>
          <option value="premium" ${module.surfaceStyle==='premium'?'selected':''}>Premium</option>
        </select></label>
        <label>Route<input data-module-route value="${escapeHtml(module.route)}" ${module.moduleKey===combinationDealsKey?'readonly':''}></label>
      </div>
      <button class="module-save" type="button" data-module-save>Module-instellingen opslaan</button>
    </article>`;
  }

  function claimRegistry(){
    const current=document.querySelector(registrySelector);
    if(!current)return null;
    current.dataset.registryOwner='module-registry-v6';
    current.dataset.registryVersion='6.4-fdmp-foundation';
    return current;
  }

  function initRegistry(){
    if(registryStore)return registryStore;
    const client=window.getFitConnectSupabase?.()||null;
    const config=window.FitConnectRegistryConfig;
    if(!client)throw new Error('Databaseverbinding is nog niet beschikbaar.');
    if(!config||!window.ModuleRegistryRepository||!window.ModuleRegistryService||!window.ModuleRegistryStore){
      throw new Error('FDMP Registry Foundation is niet volledig geladen.');
    }
    const repository=new window.ModuleRegistryRepository(client);
    const service=new window.ModuleRegistryService(repository,config);
    registryStore=new window.ModuleRegistryStore(service,config);
    registryStore.subscribe(state=>{
      const registry=claimRegistry();
      if(!registry||registry.querySelector('.module-registry-loading'))return;
      state.modules.forEach(module=>{
        const card=registry.querySelector(`[data-module-card="${CSS.escape(module.moduleKey)}"]`);
        const button=card?.querySelector('[data-module-save]');
        if(!button)return;
        const saving=state.savingKeys.has(module.moduleKey);
        button.disabled=saving;
        button.textContent=saving?'Opslaan…':'Module-instellingen opslaan';
      });
    });
    return registryStore;
  }

  async function render(reason='manual'){
    const registry=claimRegistry();
    if(!registry||rendering)return;
    rendering=true;
    registry.innerHTML='<p class="module-registry-loading">Modules laden…</p>';
    try{
      const store=initRegistry();
      await store.loadModules();
      const state=store.getState();
      registry.innerHTML=state.modules.map(cardMarkup).join('');
      registry.dataset.registryLastRender=reason;
    }catch(error){
      console.error('Module Registry FDMP Foundation:',error);
      registry.innerHTML=`<p class="module-registry-error">${escapeHtml(error.message||'Modules konden niet worden geladen.')}</p>`;
    }finally{
      rendering=false;
    }
  }

  /**
   * Temporary compatibility bridge.
   * Maps the existing DOM contract to the immutable FDMP store.
   * Remove completely in PR 1B.
   */
  async function legacySaveBridge(card,button){
    const store=initRegistry();
    const moduleKey=card.dataset.moduleCard;
    const snapshot=store.getSnapshot(moduleKey);
    const changes={
      name:card.querySelector('[data-module-name]').value.trim(),
      enabled:card.querySelector('[data-module-enabled]').checked,
      accentColor:card.querySelector('[data-module-accent]').value,
      surfaceStyle:card.querySelector('[data-module-surface]').value,
      route:card.querySelector('[data-module-route]').value.trim()
    };
    try{
      const updated=await store.updateModule(moduleKey,changes);
      card.classList.toggle('enabled',updated.enabled);
      window.fitConnectToast?.(`${updated.name} ${updated.enabled?'ingeschakeld':'uitgeschakeld'}`);
    }catch(error){
      console.error('Module Registry save:',error);
      const stable=store.getSnapshot(moduleKey)||snapshot;
      if(stable){
        card.querySelector('[data-module-name]').value=stable.name;
        card.querySelector('[data-module-enabled]').checked=stable.enabled;
        card.querySelector('[data-module-accent]').value=stable.accentColor;
        card.querySelector('[data-module-surface]').value=stable.surfaceStyle;
        card.querySelector('[data-module-route]').value=stable.route;
        card.classList.toggle('enabled',stable.enabled);
      }
      window.fitConnectToast?.(error.message||'Module-instellingen opslaan mislukt.');
    }finally{
      button.disabled=false;
      button.textContent='Module-instellingen opslaan';
    }
  }

  document.addEventListener('click',event=>{
    const saveButton=event.target.closest(`${registrySelector} [data-module-save]`);
    if(saveButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      legacySaveBridge(saveButton.closest('[data-module-card]'),saveButton);
      return;
    }
    if(event.target.closest('[data-view="modules"]'))setTimeout(()=>render('modules-open'),0);
  },true);

  window.FitConnectModuleRegistry={render,version:'6.4-fdmp-foundation',owner:'module-registry-v6'};
  const start=()=>render('bootstrap');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>setTimeout(()=>render('window-load'),0),{once:true});
})();
