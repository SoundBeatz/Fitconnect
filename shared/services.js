(()=>{
  'use strict';

  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Services vereist FitConnectRegistry');return}

  const services=new Map();

  function register(name,service,{replace=false,meta={}}={}){
    if(typeof name!=='string'||!name.trim())throw new TypeError('Servicenaam is verplicht');
    if(!service||typeof service!=='object')throw new TypeError('Service-object is verplicht');
    const key=name.trim();
    if(services.has(key)&&!replace)throw new Error(`Service bestaat al: ${key}`);
    const normalized=Object.freeze({...service,name:key});
    services.set(key,normalized);
    registry.register(`service.${key}`,normalized,{replace,meta:{type:'application-service',...meta}});
    registry.emit('service:registered',{name:key,service:normalized});
    return normalized;
  }

  function get(name){return services.get(name)||null}
  function has(name){return services.has(name)}
  function list(){return [...services.values()]}

  async function execute(name,method,...args){
    const service=get(name);
    if(!service)throw new Error(`Onbekende service: ${name}`);
    if(typeof service[method]!=='function')throw new Error(`Onbekende servicemethode: ${name}.${method}`);
    const started=performance.now();
    registry.emit('service:request',{name,method,args});
    try{
      const result=await service[method](...args);
      registry.emit('service:success',{name,method,duration:performance.now()-started});
      return result;
    }catch(error){
      registry.emit('service:error',{name,method,error,duration:performance.now()-started});
      throw error;
    }
  }

  const api=Object.freeze({register,get,has,list,execute,version:'1.0.0'});
  registry.register('core.services',api,{meta:{type:'core-service',version:api.version}});
  window.FitConnectServices=api;

  register('configuration',{
    getCore(){return window.FitConnectCore||null},
    getBuild(){return window.FitConnectCore?.build||null},
    getAsset(path){return window.FitConnectCore?.asset?.(path)||path}
  },{meta:{scope:'core'}});
})();
