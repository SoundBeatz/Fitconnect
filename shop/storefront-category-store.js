class StorefrontCategoryStore{
  #state={categories:[],loading:false,error:null};
  constructor(repository){if(!repository)throw new TypeError('StorefrontCategoryRepository is verplicht.');this.repository=repository;this.listeners=new Set()}
  getState(){return window.FitConnectDeepFreeze({categories:[...this.#state.categories],loading:this.#state.loading,error:this.#state.error})}
  subscribe(callback){this.listeners.add(callback);return()=>this.listeners.delete(callback)}
  emit(){const state=this.getState();this.listeners.forEach(callback=>callback(state))}
  async loadStorefrontCategories(){this.#state.loading=true;this.#state.error=null;this.emit();try{this.#state.categories=await this.repository.listCategories()}catch(error){this.#state.error=error;throw error}finally{this.#state.loading=false;this.emit()}}
}
window.StorefrontCategoryStore=StorefrontCategoryStore;