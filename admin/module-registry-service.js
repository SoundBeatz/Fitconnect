(()=>{
  'use strict';

  class ModuleRegistryError extends Error{
    constructor({code,operation,moduleKey=null,message,retryable=false,cause=null}){
      super(message);
      this.name='ModuleRegistryError';
      this.code=code;
      this.operation=operation;
      this.moduleKey=moduleKey;
      this.retryable=retryable;
      this.cause=cause;
    }
  }

  class ModuleRegistryService{
    constructor(repository,config,{isOnline=()=>typeof navigator==='undefined'?true:navigator.onLine,now=()=>new Date()}={}){
      if(!repository)throw new TypeError('Repository is verplicht.');
      if(!config)throw new TypeError('Registry-configuratie is verplicht.');
      this.repository=repository;
      this.config=config;
      this.isOnline=isOnline;
      this.now=now;
    }

    async validate(moduleKey,domainModel){
      await this.beforeValidate(moduleKey,domainModel);
      if(!moduleKey||typeof moduleKey!=='string'||this.config.reservedKeys.has(moduleKey)){
        throw new ModuleRegistryError({code:'VALIDATION_INVALID_KEY',operation:'validate',moduleKey,message:'Ongeldige of gereserveerde module sleutel.'});
      }
      const cleanName=String(domainModel?.name||'').trim();
      if(!cleanName||cleanName.length>this.config.maxModuleNameLength){
        throw new ModuleRegistryError({code:'VALIDATION_INVALID_NAME',operation:'validate',moduleKey,message:`Modulenaam is verplicht en mag maximaal ${this.config.maxModuleNameLength} tekens bevatten.`});
      }
      if(domainModel.accentColor&&!/^#[0-9A-F]{6}$/i.test(domainModel.accentColor)){
        throw new ModuleRegistryError({code:'VALIDATION_INVALID_COLOR',operation:'validate',moduleKey,message:'Accentkleur moet een geldige HEX-waarde zijn.'});
      }
      if(!this.config.allowedSurfaceStyles.has(String(domainModel.surfaceStyle||'').trim())){
        throw new ModuleRegistryError({code:'VALIDATION_INVALID_SURFACE_STYLE',operation:'validate',moduleKey,message:'Geselecteerde stijl is ongeldig.'});
      }
      if(domainModel.route&&!this.config.routePattern.test(String(domainModel.route).trim())){
        throw new ModuleRegistryError({code:'VALIDATION_INVALID_ROUTE',operation:'validate',moduleKey,message:'Routeformaat is ongeldig.'});
      }
      await this.afterValidate(moduleKey,domainModel);
    }

    async fetchAll(){
      if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'fetchAll');
      await this.beforeLoad();
      try{
        const modules=await this.repository.listModules();
        const processed=await this.deduplicate(modules);
        const keys=new Set(processed.map(module=>module.moduleKey));
        const missing=[...this.config.mandatoryModules].filter(key=>!keys.has(key));
        if(missing.length)throw new ModuleRegistryError({code:'MODULE_REGISTRY_INCOMPLETE',operation:'fetchAll',message:`Module Registry onvolledig. Ontbrekend: ${missing.join(', ')}.`});
        await this.afterLoad(processed);
        return processed;
      }catch(error){
        throw this.normalizeError(error,'fetchAll');
      }
    }

    async save(moduleKey,domainModel){
      await this.validate(moduleKey,domainModel);
      if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'save',moduleKey);
      const mutableModel={...domainModel,updatedAt:this.now().toISOString()};
      await this.beforeSave(moduleKey,mutableModel);
      try{
        const saved=await this.repository.saveModule(moduleKey,mutableModel);
        await this.afterSave(moduleKey,saved);
        return saved;
      }catch(error){
        throw this.normalizeError(error,'save',moduleKey);
      }
    }

    async deduplicate(modules){
      await this.beforeNormalize();
      const byIdentity=new Map();
      const mergedAliases=[];
      for(const module of modules){
        const identity=this.config.functionalAliases[module.moduleKey]||module.moduleKey;
        const canonical={...module,moduleKey:identity};
        const existing=byIdentity.get(identity);
        if(!existing||module.moduleKey===identity){
          if(existing&&existing.sourceKey!==module.moduleKey)mergedAliases.push(existing.sourceKey);
          byIdentity.set(identity,{...canonical,sourceKey:module.moduleKey});
        }else mergedAliases.push(module.moduleKey);
      }
      const result=[...byIdentity.values()]
        .map(({sourceKey,...module})=>(window.FitConnectDeepFreeze||Object.freeze)(module))
        .sort((a,b)=>a.displayOrder-b.displayOrder||a.name.localeCompare(b.name,'nl'));
      await this.afterNormalize(result);
      window.__fitConnectModuleRegistryDiagnostics={
        version:this.config.version,
        loadedKeys:result.map(module=>module.moduleKey),
        mergedAliases:[...new Set(mergedAliases)],
        loadedCount:result.length,
        checkedAt:this.now().toISOString(),
        dataOwner:'module-registry-repository',
        stateOwner:'module-registry-store',
        navigationOwner:'admin-shell'
      };
      return result;
    }

    async beforeLoad(){}
    async afterLoad(){}
    async beforeSave(){}
    async afterSave(){}
    async beforeValidate(){}
    async afterValidate(){}
    async beforeNormalize(){}
    async afterNormalize(){}

    normalizeError(error,operation,moduleKey=null){
      if(error instanceof ModuleRegistryError)return error;
      let code='MODULE_UNKNOWN_ERROR';
      let message=error?.message||'Er is een systeemfout opgetreden.';
      let retryable=true;
      if(error?.message==='Offline'||!this.isOnline()){
        code='NETWORK_OFFLINE';
        message='Geen internetverbinding beschikbaar.';
      }else if(error?.code==='42501'){
        code='MODULE_SAVE_FORBIDDEN';
        message='U heeft onvoldoende database-rechten (RLS).';
        retryable=false;
      }else if(error?.code==='PGRST116'){
        code='MODULE_NOT_FOUND';
        message='De opgevraagde module bestaat niet.';
        retryable=false;
      }
      return new ModuleRegistryError({code,operation,moduleKey,message,retryable,cause:error});
    }
  }

  window.ModuleRegistryError=ModuleRegistryError;
  window.ModuleRegistryService=ModuleRegistryService;
})();
