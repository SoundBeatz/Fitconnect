(()=>{
  'use strict';
  class StorefrontProductStore{
    #state={products:Object.freeze([]),currentProduct:null,loading:false,error:null};
    constructor(repository){if(!repository)throw new TypeError('Storefront repository is verplicht.');this.repository=repository;this.listeners=new Set()}
    getState(){return Object.freeze({...this.#state})}
    subscribe(listener){if(typeof listener!=='function')throw new TypeError('Listener moet een functie zijn.');this.listeners.add(listener);return()=>this.listeners.delete(listener)}
    emit(event){const state=this.getState();this.listeners.forEach(listener=>listener(state,Object.freeze(event||{})))}
    async loadStorefrontCatalog(){this.#state={...this.#state,loading:true,error:null};this.emit({type:'storefront.catalog.loading'});try{const products=await this.repository.listPublicProducts();this.#state={...this.#state,products:Object.freeze([...products]),loading:false};this.emit({type:'storefront.catalog.loaded',products:this.#state.products});return this.#state.products}catch(error){this.#state={...this.#state,loading:false,error};this.emit({type:'storefront.catalog.error',error});throw error}}
    async loadStorefrontDetail(slug){this.#state={...this.#state,loading:true,error:null,currentProduct:null};this.emit({type:'storefront.detail.loading',slug});try{const product=await this.repository.getPublicProductBySlug(slug);this.#state={...this.#state,currentProduct:product,loading:false};this.emit({type:'storefront.detail.loaded',product});return product}catch(error){this.#state={...this.#state,loading:false,error};this.emit({type:'storefront.detail.error',error});throw error}}
  }
  window.StorefrontProductStore=StorefrontProductStore;
})();
