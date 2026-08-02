(()=>{
  'use strict';
  class CategoryStore{
    #state;
    constructor(service){if(!service)throw new TypeError('CategoryService is verplicht in de CategoryStore.');this.service=service;this.#state={categories:[],loading:false,error:null};this.listeners=new Map()}
    subscribeEvent(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);return()=>this.listeners.get(type)?.delete(callback)}
    emitEvent(type,payload){this.listeners.get(type)?.forEach(callback=>callback(payload))}
    getState(){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({categories:[...this.#state.categories],loading:this.#state.loading,error:this.#state.error})}
    getChildren(parentKey){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze(this.#state.categories.filter(item=>item.parentKey===parentKey).map(item=>({...item})))}
    async loadCategories(){this.#state.loading=true;this.#state.error=null;this.emitEvent('categories.loading',{state:this.getState()});try{this.#state.categories=await this.service.fetchAll();this.emitEvent('categories.loaded',{categories:[...this.#state.categories],state:this.getState()});return this.#state.categories}catch(error){this.#state.error=error;this.emitEvent('categories.error',{error,state:this.getState()});throw error}finally{this.#state.loading=false;this.emitEvent('categories.loading-complete',{state:this.getState()})}}
  }
  window.CategoryStore=CategoryStore;
})();