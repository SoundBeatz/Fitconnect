(()=>{'use strict';
const cfg=window.CustomerConfig;
const deepFreeze=value=>(window.deepFreeze||window.DeepFreeze||((input)=>Object.freeze(input)))(value);
class CustomerStore{
  #service;#state;#inflight=null;
  constructor(service){if(!service)throw new Error('CustomerStore requires service');this.#service=service;this.#state=deepFreeze({customers:[],loading:false,error:null,loadedAt:null,selectedId:null})}
  getSnapshot(id=null){return id?this.find(id):this.#state}
  subscribeEvent(name,handler){const eventName=cfg.events[name?.split('.').pop()]||name;window.addEventListener(eventName,handler);return()=>window.removeEventListener(eventName,handler)}
  #publish(eventName,detail){const frozen=deepFreeze(detail);window.dispatchEvent(new CustomEvent(eventName,{detail:frozen}));window.dispatchEvent(new CustomEvent(cfg.events.changed,{detail:deepFreeze({event:eventName,state:this.#state})}))}
  #set(patch,eventName,detail=null){this.#state=deepFreeze({...this.#state,...patch});if(eventName)this.#publish(eventName,detail||this.#state);return this.#state}
  async load(context={}){if(this.#inflight)return this.#inflight;this.#set({loading:true,error:null},cfg.events.loading);this.#inflight=(async()=>{try{const customers=await this.#service.list(context);this.#set({customers:[...customers],loading:false,error:null,loadedAt:new Date().toISOString()},cfg.events.loaded,{customers:this.#state.customers});return this.#state}catch(error){this.#set({loading:false,error:error?.message||String(error)},cfg.events.failed,{error});throw error}finally{this.#inflight=null}})();return this.#inflight}
  async updateCustomer(customer,context={}){const id=customer.id||null,snapshot=id?this.find(id):null;this.#publish(cfg.events.saving,{id,snapshot});try{const saved=await this.#service.save(customer,context);const customers=this.#state.customers.filter(item=>item.id!==saved.id);customers.push(saved);this.#set({customers,error:null},cfg.events.saved,{id:saved.id,entity:saved,snapshot});return saved}catch(error){this.#set({error:error?.message||String(error)},cfg.events.rollback,{id,snapshot,error});throw error}}
  async saveInvoiceCustomer(customer,context){return this.updateCustomer(customer,context)}
  select(id){this.#set({selectedId:id||null},null);return this.#state}
  find(id){return this.#state.customers.find(customer=>customer.id===id)||null}
  createFiscalSnapshot(idOrCustomer){const customer=typeof idOrCustomer==='string'?this.find(idOrCustomer):idOrCustomer;if(!customer)throw new Error('Customer not found');return this.#service.createFiscalSnapshot(customer)}
}
window.CustomerStore=CustomerStore;
})();