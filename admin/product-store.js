(()=>{
  'use strict';
  class ProductStore{
    #state;
    constructor(service,config){if(!service)throw new TypeError('ProductService is verplicht.');this.service=service;this.config=config;this.listeners=new Set();this.eventListeners=new Map();this.#state={products:[],selectedProduct:null,loading:false,savingIds:new Set(),lastRefresh:null,version:config.version||'1.0',error:null}}
    getState(){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({products:[...this.#state.products],selectedProduct:this.#state.selectedProduct,loading:this.#state.loading,savingIds:new Set(this.#state.savingIds),lastRefresh:this.#state.lastRefresh,version:this.#state.version,error:this.#state.error})}
    subscribe(callback){if(typeof callback!=='function')throw new TypeError('Store-listener moet een functie zijn.');this.listeners.add(callback);return()=>this.listeners.delete(callback)}
    subscribeEvent(type,callback){if(typeof callback!=='function')throw new TypeError('Event-listener moet een functie zijn.');if(!this.eventListeners.has(type))this.eventListeners.set(type,new Set());this.eventListeners.get(type).add(callback);return()=>this.eventListeners.get(type)?.delete(callback)}
    emit(event={type:'state.changed'}){const snapshot=this.getState();this.listeners.forEach(callback=>callback(snapshot,event));this.eventListeners.get(event.type)?.forEach(callback=>callback(event,snapshot))}
    emitEvent(type,detail={}){this.emit({type,...detail})}
    async loadProducts(){this.#state.loading=true;this.#state.error=null;this.emit({type:'products.loading'});try{this.#state.products=await this.service.fetchAll();this.#state.lastRefresh=new Date().toISOString();this.emit({type:'products.loaded',products:this.#state.products});return this.#state.products}catch(error){this.#state.error=error;this.emit({type:'products.error',error});throw error}finally{this.#state.loading=false;this.emit({type:'products.loading-complete'})}}
    selectProduct(id){this.#state.selectedProduct=this.#state.products.find(product=>product.id===id)||null;this.emit({type:'product.selected',id,product:this.#state.selectedProduct});return this.#state.selectedProduct}
    async updateProduct(id,changes){const key=id||'__new__';if(this.#state.savingIds.has(key))throw new Error('Dit product wordt al opgeslagen.');this.#state.savingIds.add(key);this.#state.error=null;this.emit({type:'product.saving',id});try{const current=id?this.#state.products.find(product=>product.id===id)||{}:{};const saved=await this.service.save(id,{...current,...changes});this.#state.products=id?this.#state.products.map(product=>product.id===id?saved:product):[saved,...this.#state.products];if(this.#state.selectedProduct?.id===id||!id)this.#state.selectedProduct=saved;this.emit({type:'product.saved',id:saved.id,product:saved});return saved}catch(error){this.#state.error=error;this.emit({type:'product.rollback',id,error,product:this.getSnapshot(id)});throw error}finally{this.#state.savingIds.delete(key);this.emit({type:'product.saving-complete',id})}}
    getSnapshot(id){return this.#state.products.find(product=>product.id===id)||null}
  }
  window.ProductStore=ProductStore;
})();
