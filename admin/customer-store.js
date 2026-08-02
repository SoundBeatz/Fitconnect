(()=>{'use strict';
const cfg=window.CustomerConfig;
const deepFreeze=value=>(window.deepFreeze||window.DeepFreeze||((input)=>Object.freeze(input)))(value);
class CustomerStore{
  #service;#state;#inflight=null;
  constructor(service){
    if(!service)throw new Error('CustomerStore requires service');
    this.#service=service;
    this.#state=deepFreeze({customers:[],loading:false,error:null,loadedAt:null,selectedId:null});
  }
  getSnapshot(){return this.#state}
  #publish(eventName,detail){
    const frozen=deepFreeze(detail);
    window.dispatchEvent(new CustomEvent(eventName,{detail:frozen}));
    window.dispatchEvent(new CustomEvent(cfg.events.changed,{detail:deepFreeze({event:eventName,state:this.#state})}));
  }
  #set(patch,eventName){this.#state=deepFreeze({...this.#state,...patch});if(eventName)this.#publish(eventName,this.#state);return this.#state}
  async load(context={}){
    if(this.#inflight)return this.#inflight;
    this.#set({loading:true,error:null},cfg.events.loading);
    this.#inflight=(async()=>{try{const customers=await this.#service.list(context);this.#set({customers:[...customers],loading:false,error:null,loadedAt:new Date().toISOString()},cfg.events.loaded);return this.#state}catch(error){this.#set({loading:false,error:error?.message||String(error)},cfg.events.failed);throw error}finally{this.#inflight=null}})();
    return this.#inflight;
  }
  async saveInvoiceCustomer(customer,context){
    try{const saved=await this.#service.saveInvoiceCustomer(customer,context);const next=this.#state.customers.filter(item=>item.id!==saved.id);next.push(saved);this.#set({customers:next,error:null},cfg.events.saved);return saved}catch(error){this.#set({error:error?.message||String(error)},cfg.events.failed);throw error}
  }
  select(id){this.#set({selectedId:id||null},null);return this.#state}
  find(id){return this.#state.customers.find(customer=>customer.id===id)||null}
  createFiscalSnapshot(idOrCustomer){const customer=typeof idOrCustomer==='string'?this.find(idOrCustomer):idOrCustomer;if(!customer)throw new Error('Customer not found');return this.#service.createFiscalSnapshot(customer)}
}
window.CustomerStore=CustomerStore;
})();