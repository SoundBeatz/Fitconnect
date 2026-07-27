(()=>{
  'use strict';
  const key='commerce.combination_deals';
  const defaults={module_key:key,name:'Combination Deals',description:'Professionele productbundels met pakketprijs, planning en Bundle Intelligence.',enabled:true,route:'/admin/#combination-deals',accent_color:'#f36f21',surface_style:'premium'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function markup(module){return `<article class="module-config-card ${module.enabled?'enabled':''}" data-module-card="${key}"><div class="module-config-head"><div><h2>${esc(module.name)}</h2><p>${esc(module.description||defaults.description)}</p></div><label class="module-switch"><input type="checkbox" data-module-enabled ${module.enabled?'checked':''}><span></span></label></div><div class="module-config-fields"><label>Modulenaam<input data-module-name value="${esc(module.name)}"></label><label>Accentkleur<input data-module-accent type="color" value="${esc(module.accent_color||defaults.accent_color)}"></label><label>Materiaal / stijl<select data-module-surface><option value="light" ${module.surface_style==='light'?'selected':''}>Licht</option><option value="dark" ${module.surface_style==='dark'?'selected':''}>Donker</option><option value="natural" ${module.surface_style==='natural'?'selected':''}>Natuurlijk</option><option value="premium" ${module.surface_style==='premium'?'selected':''}>Premium</option></select></label><label>Route<input data-module-route value="${esc(module.route||defaults.route)}" readonly></label></div><button class="module-save" type="button" data-module-save>Module-instellingen opslaan</button></article>`}
  async function ensure(){
    const registry=document.querySelector('#moduleRegistry');
    if(!registry||registry.querySelector(`[data-module-card="${key}"]`))return;
    let module={...defaults};
    const client=window.getFitConnectSupabase?.();
    if(client){
      const {data}=await client.from('platform_modules').select('*').eq('module_key',key).maybeSingle();
      if(data)module={...defaults,...data};
    }
    const wrapper=document.createElement('div');wrapper.innerHTML=markup(module);const node=wrapper.firstElementChild;
    const commerce=registry.querySelector('[data-module-card="commerce"]');
    if(commerce?.nextSibling)registry.insertBefore(node,commerce.nextSibling);else registry.appendChild(node);
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="modules"]'))setTimeout(ensure,100)});
  const observer=new MutationObserver(()=>ensure());
  const start=()=>{const registry=document.querySelector('#moduleRegistry');if(registry)observer.observe(registry,{childList:true});ensure();setTimeout(ensure,500);setTimeout(ensure,1500)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();