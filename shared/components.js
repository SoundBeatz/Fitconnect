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
      const candidates=[];
      if(root.nodeType===Node.ELEMENT_NODE&&root.matches?.(component.selector))candidates.push(root);
      root.querySelectorAll?.(component.selector).forEach(element=>candidates.push(element));
      candidates.forEach(element=>{
        const marker=`fcMounted${component.name.replace(/[^a-z0-9]/gi,'')}`;
        if(element.dataset[marker]==='true')return;
        try{
          component.mount(element,{registry,components:api});
          element.dataset[marker]='true';
        }catch(error){console.error(`Component kon niet mounten: ${component.name}`,error)}
      });
    });
  }

  const api={register,get:name=>components.get(name)||null,has:name=>components.has(name),list:()=>[...components.values()],mount,version:'1.1.0'};
  registry.register('core.components',api,{meta:{type:'core-service',version:api.version}});
  window.FitConnectComponents=api;

  register('button',{
    selector:'.button,.fc-button,[data-fc-component="button"]',
    mount(element){
      element.classList.add('fc-focusable');
      if(element.matches('button')&&!element.getAttribute('type'))element.type='button';
      if(element.dataset.loading==='true')element.setAttribute('aria-busy','true');
    }
  });

  register('form-field',{
    selector:'.fc-field,[data-fc-component="field"]',
    mount(element){
      const control=element.querySelector('input,select,textarea');
      const label=element.querySelector('label');
      const help=element.querySelector('.fc-help,.fc-error');
      if(control){
        control.classList.add(control.tagName==='SELECT'?'fc-select':control.tagName==='TEXTAREA'?'fc-textarea':'fc-input');
        if(label&&!control.id)control.id=`fc-field-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
        if(label&&control.id)label.htmlFor=control.id;
        if(help){
          if(!help.id)help.id=`${control.id||'fc-control'}-help`;
          control.setAttribute('aria-describedby',help.id);
        }
      }
    }
  });

  register('card',{
    selector:'.service-card,.quote-card,.compact-card,.fc-card,[data-fc-component="card"]',
    mount(element){element.classList.add('fc-surface')}
  });

  register('alert',{
    selector:'.fc-alert,[data-fc-component="alert"]',
    mount(element){if(!element.hasAttribute('role'))element.setAttribute('role','status')}
  });

  register('badge',{selector:'.fc-badge,[data-fc-component="badge"]'});
  register('empty-state',{selector:'.fc-empty,[data-fc-component="empty-state"]'});
  register('container',{selector:'[data-fc-component="container"]',mount(element){element.classList.add('fc-container')}});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();

  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===Node.ELEMENT_NODE)mount(node);
    }));
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  registry.register('core.componentObserver',observer,{meta:{type:'runtime-service'}});
})();
