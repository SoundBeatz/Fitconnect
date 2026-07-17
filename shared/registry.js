(()=>{
  'use strict';

  const entries=new Map();
  const listeners=new Map();

  function assertName(name){
    if(typeof name!=='string'||!name.trim())throw new TypeError('Registry name is verplicht');
    return name.trim();
  }

  function emit(event,detail){
    (listeners.get(event)||new Set()).forEach(handler=>{
      try{handler(detail)}catch(error){console.error(`FitConnect Registry listener fout: ${event}`,error)}
    });
    window.dispatchEvent(new CustomEvent(`fitconnect:${event}`,{detail}));
  }

  const registry={
    register(name,value,{replace=false,meta={}}={}){
      const key=assertName(name);
      if(entries.has(key)&&!replace)throw new Error(`Registry item bestaat al: ${key}`);
      const record=Object.freeze({name:key,value,meta:Object.freeze({...meta}),registeredAt:new Date().toISOString()});
      entries.set(key,record);
      emit('registry:registered',record);
      return value;
    },
    get(name,fallback=null){return entries.get(assertName(name))?.value??fallback},
    record(name){return entries.get(assertName(name))||null},
    has(name){return entries.has(assertName(name))},
    remove(name){
      const key=assertName(name);
      const record=entries.get(key)||null;
      if(record){entries.delete(key);emit('registry:removed',record)}
      return record?.value??null;
    },
    list(prefix=''){
      return [...entries.values()].filter(item=>!prefix||item.name.startsWith(prefix));
    },
    on(event,handler){
      if(typeof handler!=='function')throw new TypeError('Handler moet een functie zijn');
      if(!listeners.has(event))listeners.set(event,new Set());
      listeners.get(event).add(handler);
      return()=>listeners.get(event)?.delete(handler);
    },
    emit,
    version:'1.0.0'
  };

  Object.defineProperty(window,'FitConnectRegistry',{value:registry,writable:false,configurable:false});
  registry.register('core.registry',registry,{meta:{type:'core-service',version:registry.version}});
})();