(()=>{
  'use strict';
  class BrandStore{
    #state;
    constructor(service){if(!service)throw new TypeError('BrandService is verplicht in de BrandStore.');this.service=service;this.#state={brands:[],loading:false,savingIds:new Set(),error:null};this.listeners=new Map()}
    subscribeEvent(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);return()=>this.listeners.get(type)?.delete(callback)}
    emitEvent(type,payload){this.listeners.get(type)?.forEach(callback=>callback(payload))}
    getState(){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({brands:[...this.#state.brands],loading:this.#state.loading,savingIds:new Set(this.#state.savingIds),error:this.#state.error})}
    getSnapshot(id){const found=this.#state.brands.find(brand=>String(brand.id)===String(id));return found?(window.FitConnectDeepFreeze||Object.freeze)({...found}):null}
    async loadBrands(){this.#state.loading=true;this.#state.error=null;this.emitEvent('brands.loading',{state:this.getState()});try{this.#state.brands=await this.service.fetchAll();this.emitEvent('brands.loaded',{brands:[...this.#state.brands],state:this.getState()});return this.#state.brands}catch(error){this.#state.error=error;this.emitEvent('brands.error',{error,state:this.getState()});throw error}finally{this.#state.loading=false;this.emitEvent('brands.loading-complete',{state:this.getState()})}}
    async updateBrand(id,changes){const key=id||'__new__';if(this.#state.savingIds.has(key))throw new Error('Dit merk wordt al opgeslagen.');const previous=id?this.getSnapshot(id):null;this.#state.savingIds.add(key);this.emitEvent('brand.saving',{id:key});try{const saved=await this.service.save(id,{...(previous||{}),...changes});const index=this.#state.brands.findIndex(brand=>String(brand.id)===String(saved.id));if(index>=0)this.#state.brands=this.#state.brands.map(brand=>String(brand.id)===String(saved.id)?saved:brand);else this.#state.brands=[saved,...this.#state.brands];this.#state.brands.sort((a,b)=>a.displayOrder-b.displayOrder||a.name.localeCompare(b.name,'nl'));this.emitEvent('brand.saved',{id:saved.id,entity:saved,state:this.getState()});return saved}catch(error){this.#state.error=error;this.emitEvent('brand.rollback',{id:key,snapshot:previous,error,state:this.getState()});throw error}finally{this.#state.savingIds.delete(key);this.emitEvent('brand.saving-complete',{id:key,state:this.getState()})}}
  }
  window.BrandStore=BrandStore;
})();
