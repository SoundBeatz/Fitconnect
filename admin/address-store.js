(()=>{'use strict';
const cfg=window.AddressConfig;
const freeze=value=>(window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class AddressStore{
  #state=freeze({status:'idle',addresses:freeze([]),byCustomer:freeze({}),error:null});
  #service;
  constructor(service=new window.AddressService()){this.#service=service}
  getSnapshot(customerId=null){if(!customerId)return this.#state;return this.#state.byCustomer[customerId]||freeze([])}
  #group(addresses){const grouped={};for(const address of addresses){const key=address.customerId||'unassigned';(grouped[key]||(grouped[key]=[])).push(address)}for(const key of Object.keys(grouped))grouped[key]=freeze(grouped[key].slice());return freeze(grouped)}
  hydrate(records=[],context={}){window.dispatchEvent(new CustomEvent(cfg.events.loading,{detail:{count:records.length}}));try{const addresses=freeze(records.map(record=>this.#service.normalize(record,context)));this.#state=freeze({status:'ready',addresses,byCustomer:this.#group(addresses),error:null});window.dispatchEvent(new CustomEvent(cfg.events.loaded,{detail:this.#state}));window.dispatchEvent(new CustomEvent(cfg.events.changed,{detail:this.#state}));return this.#state}catch(error){this.#state=freeze({...this.#state,status:'error',error});window.dispatchEvent(new CustomEvent(cfg.events.failed,{detail:{error}}));throw error}}
  updateAddress(record,context={}){const model=this.#service.normalize(record,context),customerId=model.customerId,snapshot=this.getSnapshot(customerId)[0]||null;window.dispatchEvent(new CustomEvent(cfg.events.saving,{detail:freeze({customerId,snapshot})}));try{const addresses=this.#state.addresses.filter(item=>!(item.customerId===customerId&&item.type===model.type));addresses.push(model);this.#state=freeze({status:'ready',addresses:freeze(addresses),byCustomer:this.#group(addresses),error:null});window.dispatchEvent(new CustomEvent(cfg.events.saved,{detail:freeze({customerId,entity:model,snapshot})}));window.dispatchEvent(new CustomEvent(cfg.events.changed,{detail:this.#state}));return model}catch(error){window.dispatchEvent(new CustomEvent(cfg.events.rollback,{detail:freeze({customerId,snapshot,error})}));throw error}}
  createSnapshot(address,context={}){return this.#service.createSnapshot(address,context)}
}
window.AddressStore=AddressStore;
window.addressStore=window.addressStore||new AddressStore();
})();