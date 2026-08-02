(()=>{'use strict';
const cfg=window.AddressConfig;
const freeze=value=>(window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class AddressStore{
  #state=freeze({status:'idle',addresses:freeze([]),byCustomer:freeze({}),error:null});
  #service;
  constructor(service=new window.AddressService()){this.#service=service}
  getSnapshot(customerId=null){if(!customerId)return this.#state;return this.#state.byCustomer[customerId]||freeze([])}
  hydrate(records=[],context={}){window.dispatchEvent(new CustomEvent(cfg.events.loading,{detail:{count:records.length}}));try{const addresses=freeze(records.map(record=>this.#service.normalize(record,context)));const grouped={};for(const address of addresses){const key=address.customerId||'unassigned';(grouped[key]||(grouped[key]=[])).push(address)}for(const key of Object.keys(grouped))grouped[key]=freeze(grouped[key].slice());this.#state=freeze({status:'ready',addresses,byCustomer:freeze(grouped),error:null});window.dispatchEvent(new CustomEvent(cfg.events.loaded,{detail:this.#state}));window.dispatchEvent(new CustomEvent(cfg.events.changed,{detail:this.#state}));return this.#state}catch(error){this.#state=freeze({...this.#state,status:'error',error});window.dispatchEvent(new CustomEvent(cfg.events.failed,{detail:{error}}));throw error}}
  createSnapshot(address,context={}){return this.#service.createSnapshot(address,context)}
}
window.AddressStore=AddressStore;
window.addressStore=window.addressStore||new AddressStore();
})();