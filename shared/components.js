(()=>{
  'use strict';

  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Components vereist FitConnectRegistry');return}

  const components=new Map();

  function register(name,definition,{replace=false}={}){
    if(typeof name!=='string'||!name.trim())throw new TypeError('Componentnaam is verplicht');
    if(!definition||typeof definition!=='object')throw new TypeError('Componentdefinitie is verplicht');
    const key=name.trim();
    if(components.has(key)&&!replace)throw new Error(`Component bestaat al: ${key}`);
    const normalized=Object.freeze({
      name:key,
      selector:definition.selector||`[data-fc-component="${key}"]`,
      mount:typeof definition.mount==='function'?definition.mount:()=>{},
      unmount:typeof definition.unmount==='function'?definition.unmount:()=>{},
      version:definition.version||'1.0.0'
    });
    components.set(key,normalized);
    registry.register(`component.${key}`,normalized,{replace,meta:{type:'ui-component',version:normalized.version}});
    return normalized;
  }

  function mount(root=document){
    components.forEach(component=>{
      root.querySelectorAll(component.selector).forEach(element=>{
        const marker=`fcMounted${component.name.replace(/[^a-z0-9]/gi,'')}`;
        if(element.dataset[marker]==='true')return;
        try{
          component.mount(element,{registry,components:api});
          element.dataset[marker]='true';
        }catch(error){console.error(`Component kon niet mounten: ${component.name}`,error)}
      });
    });
  }

  const api={register,get:name=>components.get(name)||null,has:name=>components.has(name),list:()=>[...components.values()],mount,version:'1.0.0'};
  registry.register('core.components',api,{meta:{type:'core-service',version:api.version}});

  register('button',{selector:'.button,[data-fc-component="button"]',mount(element){element.classList.add('fc-focusable')}});
  register('card',{selector:'.service-card,.quote-card,.compact-card,[data-fc-component="card"]',mount(element){element.classList.add('fc-surface')}});
  register('container',{selector:'[data-fc-component="container"]',mount(element){element.classList.add('fc-container')}});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();

  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===Node.ELEMENT_NODE)mount(node.matches?.('[data-fc-component],.button,.service-card,.quote-card,.compact-card')?node.parentNode||document:node);
    }));
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  registry.register('core.componentObserver',observer,{meta:{type:'runtime-service'}});
})();