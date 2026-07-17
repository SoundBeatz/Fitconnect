(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry)return;
  const icons={
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warning:'<path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    error:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevronDown:'<path d="m6 9 6 6 6-6"/>',
    arrowRight:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    cart:'<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.4 11h10.8l2-7H6"/>'
  };
  function render(name,{label='',className=''}={}){
    const body=icons[name];
    if(!body)throw new Error(`Onbekend FitConnect-icoon: ${name}`);
    const aria=label?`role="img" aria-label="${String(label).replace(/"/g,'&quot;')}"`:'aria-hidden="true"';
    return `<svg class="fc-icon ${className}" viewBox="0 0 24 24" ${aria}>${body}</svg>`;
  }
  function mount(root=document){root.querySelectorAll?.('[data-fc-icon]').forEach(el=>{if(el.dataset.fcIconMounted)return;el.innerHTML=render(el.dataset.fcIcon,{label:el.dataset.fcIconLabel||''});el.dataset.fcIconMounted='true'})}
  const api=Object.freeze({render,mount,has:name=>Boolean(icons[name]),list:()=>Object.keys(icons),version:'1.0.0'});
  window.FitConnectIcons=api;
  registry.register('design.icons',api,{meta:{type:'design-service',version:api.version}});
})();