(()=>{
  'use strict';

  const registrySelector='#moduleRegistryCanonical';
  const combinationDealsKey='combination_deals';
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const escapeSelector=value=>window.CSS?.escape?CSS.escape(String(value)):String(value).replace(/["\\]/g,'\\$&');

  let registryStore=null;
  let rendering=false;

  const ModuleCardFactory={
    create(module,onSave){
      const wrapper=document.createElement('div');
      wrapper.innerHTML=`<article class="module-config-card ${module.enabled?'enabled':''}" data-module-card="${escapeHtml(module.moduleKey)}">
        <div class="module-config-head">
          <div><h2 data-module-title>${escapeHtml(module.name)}</h2><p>${escapeHtml(module.description)}</p></div>
          <label class="module-switch"><input type="checkbox" data-module-enabled ${module.enabled?'checked':''}><span></span></label>
        </div>
        <div class="module-config-fields">
          <label>Modulenaam<input data-module-name value="${escapeHtml(module.name)}" maxlength="120"></label>
          <label>Accentkleur<input data-module-accent type="color" value="${escapeHtml(module.accentColor||'#f36f21')}"></label>
          <label>Materiaal / stijl<select data-module-surface>
            <option value="light" ${module.surfaceStyle==='light'?'selected':''}>Licht</option>
            <option value="dark" ${module.surfaceStyle==='dark'?'selected':''}>Donker</option>
            <option value="natural" ${module.surfaceStyle==='natural'?'selected':''}>Natuurlijk</option>
            <option value="premium" ${module.surfaceStyle==='premium'?'selected':''}>Premium</option>
          </select></label>
          <label>Route<input data-module-route value="${escapeHtml(module.route||'')}" ${module.moduleKey===combinationDealsKey?'readonly':''}></label>
        </div>
        <button class="module-save" type="button" data-module-save>Module-instellingen opslaan</button>
      </article>`;
      const card=wrapper.firstElementChild;
      card.querySelector('[data-module-save]').addEventListener('click',()=>onSave(module.moduleKey,card));
      return card;
    },

    serialize(card){
      return {
        name:card.querySelector('[data-module-name]').value.trim(),
        enabled:card.querySelector('[data-module-enabled]').checked,
        accentColor:card.querySelector('[data-module-accent]').value,
        surfaceStyle:card.querySelector('[data-module-surface]').value,
        route:card.querySelector('[data-module-route]').value.trim()
      };
    },

    update(card,module){
      if(!card||!module)return;
      card.classList.toggle('enabled',Boolean(module.enabled));
      const title=card.querySelector('[data-module-title]');
      if(title)title.textContent=module.name;
      card.querySelector('[data-module-name]').value=module.name;
      card.querySelector('[data-module-enabled]').checked=Boolean(module.enabled);
      card.querySelector('[data-module-accent]').value=module.accentColor||'#f36f21';
      card.querySelector('[data-module-surface]').value=module.surfaceStyle;
      card.querySelector('[data-module-route]').value=module.route||'';
    },

    setSaving(card,isSaving){
      const button=card?.querySelector('[data-module-save]');
      if(!button)return;
      button.disabled=isSaving;
      button.textContent=isSaving?'Opslaan…':'Module-instellingen opslaan';
    },

    rollback(card,snapshot){
      this.update(card,snapshot);
    }
  };

  function claimRegistry(){
    const current=document.querySelector(registrySelector);
    if(!current)return null;
    current.dataset.registryOwner='module-registry-v6';
    current.dataset.registryVersion='6.5-fdmp-renderer';
    return current;
  }

  function findCard(moduleKey){
    return claimRegistry()?.querySelector(`[data-module-card="${escapeSelector(moduleKey)}"]`)||null;
  }

  function initialRender(modules,container){
    container.innerHTML='';
    const fragment=document.createDocumentFragment();
    modules.forEach(module=>fragment.appendChild(ModuleCardFactory.create(module,triggerSaveProcess)));
    container.appendChild(fragment);
  }

  function handleStoreEvent(state,event){
    const registry=claimRegistry();
    if(!registry)return;

    switch(event.type){
      case 'modules.loading':
        if(!registry.querySelector('[data-module-card]'))registry.innerHTML='<p class="module-registry-loading">Modules laden…</p>';
        break;
      case 'modules.loaded':
        initialRender(state.modules,registry);
        break;
      case 'modules.error':
        if(!registry.querySelector('[data-module-card]'))registry.innerHTML=`<p class="module-registry-error">${escapeHtml(event.error?.message||'Modules konden niet worden geladen.')}</p>`;
        break;
      case 'module.saving':
        ModuleCardFactory.setSaving(findCard(event.moduleKey),true);
        break;
      case 'module.saved':
        ModuleCardFactory.update(findCard(event.moduleKey),event.module);
        break;
      case 'module.rollback':
        ModuleCardFactory.rollback(findCard(event.moduleKey),event.module);
        break;
      case 'module.saving-complete':
        ModuleCardFactory.setSaving(findCard(event.moduleKey),false);
        break;
      default:
        break;
    }
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
    registryStore.subscribe(handleStoreEvent);
    return registryStore;
  }

  async function triggerSaveProcess(moduleKey,card){
    const store=initRegistry();
    try{
      const updated=await store.updateModule(moduleKey,ModuleCardFactory.serialize(card));
      window.fitConnectToast?.(`${updated.name} ${updated.enabled?'ingeschakeld':'uitgeschakeld'}`);
    }catch(error){
      console.error('Module Registry save:',error);
      ModuleCardFactory.rollback(card,store.getSnapshot(moduleKey));
      window.fitConnectToast?.(error.message||'Module-instellingen opslaan mislukt.');
    }
  }

  async function render(reason='manual'){
    const registry=claimRegistry();
    if(!registry||rendering)return;
    rendering=true;
    registry.dataset.registryLastRender=reason;
    try{
      await initRegistry().loadModules();
    }catch(error){
      console.error('Module Registry FDMP Renderer:',error);
    }finally{
      rendering=false;
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="modules"]'))setTimeout(()=>render('modules-open'),0);
  },true);

  window.FitConnectModuleRegistry={render,version:'6.5-fdmp-renderer',owner:'module-registry-v6'};
  const start=()=>render('bootstrap');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
