(()=>{
  'use strict';

  class ModuleRegistryStore{
    #state;

    constructor(service,config){
      if(!service)throw new TypeError('Service is verplicht.');
      this.service=service;
      this.config=config;
      this.#state={
        modules:[],selectedModule:null,loading:false,savingKeys:new Set(),validationErrors:{},
        lastRefresh:null,version:config.version||'1.0',dirtyModules:new Set(),error:null
      };
      this.listeners=new Set();
    }

    getState(){
      const freeze=window.FitConnectDeepFreeze||Object.freeze;
      return freeze({
        modules:[...this.#state.modules],
        selectedModule:this.#state.selectedModule,
        loading:this.#state.loading,
        savingKeys:new Set(this.#state.savingKeys),
        validationErrors:{...this.#state.validationErrors},
        lastRefresh:this.#state.lastRefresh,
        version:this.#state.version,
        dirtyModules:new Set(this.#state.dirtyModules),
        error:this.#state.error
      });
    }

    subscribe(callback){
      this.listeners.add(callback);
      return ()=>this.listeners.delete(callback);
    }

    emit(type='state.changed',detail={}){
      const freeze=window.FitConnectDeepFreeze||Object.freeze;
      const event=freeze({type,...detail});
      const snapshot=this.getState();
      this.listeners.forEach(callback=>callback(snapshot,event));
    }

    async loadModules(){
      this.#state.loading=true;
      this.#state.error=null;
      this.emit('modules.loading');
      try{
        this.#state.modules=await this.service.fetchAll();
        this.#state.lastRefresh=new Date();
        this.#state.dirtyModules.clear();
        this.emit('modules.loaded',{moduleKeys:this.#state.modules.map(module=>module.moduleKey)});
        return this.#state.modules;
      }catch(error){
        this.#state.error=error;
        this.emit('modules.error',{error});
        throw error;
      }finally{
        this.#state.loading=false;
        this.emit('modules.loading-complete');
      }
    }

    async updateModule(moduleKey,changes){
      if(this.#state.savingKeys.has(moduleKey)){
        throw new window.ModuleRegistryError({code:'MODULE_SAVE_IN_FLIGHT',operation:'save',moduleKey,message:'Er is al een opslagactie actief voor deze module.'});
      }
      const current=this.#state.modules.find(module=>module.moduleKey===moduleKey);
      if(!current)throw new window.ModuleRegistryError({code:'MODULE_NOT_FOUND',operation:'save',moduleKey,message:'De module bestaat niet in de lokale Registry-state.'});
      this.#state.savingKeys.add(moduleKey);
      this.#state.error=null;
      this.emit('module.saving',{moduleKey});
      try{
        const updated=await this.service.save(moduleKey,{...current,...changes});
        this.#state.modules=this.#state.modules.map(module=>module.moduleKey===moduleKey?updated:module);
        this.#state.dirtyModules.delete(moduleKey);
        this.emit('module.saved',{moduleKey,module:updated});
        return updated;
      }catch(error){
        this.#state.error=error;
        this.emit('module.rollback',{moduleKey,module:current,error});
        throw error;
      }finally{
        this.#state.savingKeys.delete(moduleKey);
        this.emit('module.saving-complete',{moduleKey});
      }
    }

    getSnapshot(moduleKey){
      return this.#state.modules.find(module=>module.moduleKey===moduleKey)||null;
    }
  }

  window.ModuleRegistryStore=ModuleRegistryStore;
})();
