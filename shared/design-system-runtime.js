(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Design System Runtime vereist FitConnectRegistry');return}

  function mount(root=document){
    window.FitConnectComponents?.mount(root);
    window.FitConnectAdvancedComponents?.mount(root);
    window.FitConnectDataComponents?.mount(root);
    window.FitConnectIcons?.mount(root);
    window.FitConnectAccessibility?.enhance(root);
    registry.emit('design-system:mounted',{root});
    return root;
  }

  function get(name){return registry.get(`component.${name}`)||registry.get(`design.${name}`)||null}
  function on(event,handler){return registry.on(event,handler)}
  function emit(event,detail){return registry.emit(event,detail)}
  function announce(message,options){return window.FitConnectAccessibility?.announce(message,options)}
  function audit(root=document){return window.FitConnectAccessibility?.audit(root)||[]}

  const api=Object.freeze({
    mount,get,on,emit,announce,audit,
    versions:()=>({
      runtime:'1.0.0',
      core:window.FitConnectCore?.version||null,
      components:window.FitConnectComponents?.version||null,
      advanced:window.FitConnectAdvancedComponents?.version||null,
      data:window.FitConnectDataComponents?.version||null,
      accessibility:window.FitConnectAccessibility?.version||null
    }),
    version:'1.0.0'
  });

  registry.register('design.system',api,{replace:true,meta:{type:'design-service',version:api.version}});
  window.FitConnectDesignSystem=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();
})();