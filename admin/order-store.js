(()=>{'use strict';
const cfg=window.OrderConfig;const freeze=value=>(window.FitConnectDeepFreeze||window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class OrderStore{
  #service;#state;#inflight=null;
  constructor(service){if(!service)throw new TypeError('OrderService is verplicht.');this.#service=service;this.#state=freeze({orders:freeze([]),selectedOrder:null,fulfillment:freeze({}),loading:false,saving:false,error:null})}
  getSnapshot(id=null){if(id)return this.#state.orders.find(order=>order.id===id)||null;return this.#state}
  #publish(name,detail){window.dispatchEvent(new CustomEvent(name,{detail:freeze(detail)}))}
  #set(patch,event=null,detail=null){this.#state=freeze({...this.#state,...patch});if(event)this.#publish(event,detail||this.#state);this.#publish(cfg.events.changed,{state:this.#state});return this.#state}
  #emitPaid(orders,previous=[]){const before=new Map(previous.map(order=>[order.id,order.paymentStatus]));for(const order of orders){if(order.paymentStatus==='paid'&&before.get(order.id)!=='paid')this.#publish(cfg.events.fulfillmentPaid,{orderId:order.id,organizationId:order.organizationId,items:order.items,paidAt:new Date().toISOString()})}}
  async load(){if(this.#inflight)return this.#inflight;const previous=this.#state.orders;this.#set({loading:true,error:null},cfg.events.loading);this.#inflight=(async()=>{try{const orders=await this.#service.list();this.#emitPaid(orders,previous);return this.#set({orders,loading:false},cfg.events.loaded,{orders})}catch(error){this.#set({loading:false,error:error.message},cfg.events.failed,{error});throw error}finally{this.#inflight=null}})();return this.#inflight}
  select(id){const selectedOrder=this.getSnapshot(id);return this.#set({selectedOrder},null)}
  async update(id,changes){const current=this.getSnapshot(id);if(!current)throw new Error('Order niet gevonden.');const snapshot=this.#state;this.#set({saving:true,error:null},cfg.events.saving,{id,snapshot});try{const result=await this.#service.update(current,changes);const next=result.order;const orders=freeze(this.#state.orders.map(order=>order.id===id?next:order));this.#emitPaid([next],[current]);this.#set({orders,selectedOrder:next,saving:false},cfg.events.saved,{id,order:next,emailSent:result.emailSent,emailWarning:result.emailWarning});return next}catch(error){this.#state=snapshot;this.#publish(cfg.events.rollback,{id,snapshot,error});throw error}}
}
window.OrderStore=OrderStore;
})();