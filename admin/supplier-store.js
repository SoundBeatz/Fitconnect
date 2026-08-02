(()=>{
  'use strict';
  class SupplierStore{
    #state;
    constructor(service){if(!service)throw new TypeError('SupplierService is verplicht in de SupplierStore.');this.service=service;this.#state={suppliers:[],loading:false,savingIds:new Set(),error:null};this.listeners=new Map()}
    subscribeEvent(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);return()=>this.listeners.get(type)?.delete(callback)}
    emitEvent(type,payload){this.listeners.get(type)?.forEach(callback=>callback(payload))}
    getState(){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({suppliers:[...this.#state.suppliers],loading:this.#state.loading,savingIds:new Set(this.#state.savingIds),error:this.#state.error})}
    getSnapshot(id){const found=this.#state.suppliers.find(item=>String(item.id)===String(id));return found?(window.FitConnectDeepFreeze||Object.freeze)({...found}):null}
    async loadSuppliers(){this.#state.loading=true;this.#state.error=null;this.emitEvent('suppliers.loading',{state:this.getState()});try{this.#state.suppliers=await this.service.fetchAll();this.emitEvent('suppliers.loaded',{suppliers:[...this.#state.suppliers],state:this.getState()});return this.#state.suppliers}catch(error){this.#state.error=error;this.emitEvent('suppliers.error',{error,state:this.getState()});throw error}finally{this.#state.loading=false;this.emitEvent('suppliers.loading-complete',{state:this.getState()})}}
    async updateSupplier(id,changes){const key=id||'__new__';if(this.#state.savingIds.has(key))throw new Error('Deze leverancier wordt al opgeslagen.');const previous=id?this.getSnapshot(id):null;this.#state.savingIds.add(key);this.emitEvent('supplier.saving',{id:key});try{const saved=await this.service.save(id,{...(previous||{}),...changes});const exists=this.#state.suppliers.some(item=>String(item.id)===String(saved.id));this.#state.suppliers=exists?this.#state.suppliers.map(item=>String(item.id)===String(saved.id)?saved:item):[saved,...this.#state.suppliers];this.#state.suppliers.sort((a,b)=>a.name.localeCompare(b.name,'nl'));this.emitEvent('supplier.saved',{id:saved.id,entity:saved,state:this.getState()});return saved}catch(error){this.#state.error=error;this.emitEvent('supplier.rollback',{id:key,snapshot:previous,error,state:this.getState()});throw error}finally{this.#state.savingIds.delete(key);this.emitEvent('supplier.saving-complete',{id:key,state:this.getState()})}}
  }
  window.SupplierStore=SupplierStore;
})();
