(()=>{
  'use strict';
  const freeze=value=>(window.FitConnectDeepFreeze||Object.freeze)(value);
  class StorefrontBrandStore{
    #state={brands:[],loading:false,error:null};
    constructor(repository){if(!repository)throw new TypeError('Brand repository is verplicht.');this.repository=repository;}
    getState(){return freeze({brands:[...this.#state.brands],loading:this.#state.loading,error:this.#state.error});}
    async loadPublicBrands(){this.#state.loading=true;this.#state.error=null;try{this.#state.brands=await this.repository.listPublicBrands();document.dispatchEvent(new CustomEvent('fitconnect:storefront-brands-loaded',{detail:this.getState()}));return this.#state.brands;}catch(error){this.#state.error=error;document.dispatchEvent(new CustomEvent('fitconnect:storefront-brands-error',{detail:{error}}));throw error;}finally{this.#state.loading=false;}}
  }
  class StorefrontInventoryStore{
    #state={availabilities:new Map(),loadingIds:new Set(),error:null};
    constructor(service){if(!service)throw new TypeError('Inventory service is verplicht.');this.service=service;}
    getState(productId){return this.#state.availabilities.get(String(productId))||null;}
    async loadPublicStock(productId){const key=String(productId);if(this.#state.loadingIds.has(key))return this.getState(key);this.#state.loadingIds.add(key);try{const snapshot=await this.service.getAvailability(key);this.#state.availabilities.set(key,snapshot);document.dispatchEvent(new CustomEvent('fitconnect:storefront-stock-updated',{detail:{productId:key,snapshot}}));return snapshot;}catch(error){this.#state.error=error;document.dispatchEvent(new CustomEvent('fitconnect:storefront-stock-error',{detail:{productId:key,error}}));throw error;}finally{this.#state.loadingIds.delete(key);}}
    async loadMany(productIds){return Promise.all([...new Set((productIds||[]).filter(Boolean).map(String))].map(id=>this.loadPublicStock(id)));}
  }
  window.StorefrontBrandStore=StorefrontBrandStore;
  window.StorefrontInventoryStore=StorefrontInventoryStore;
})();
