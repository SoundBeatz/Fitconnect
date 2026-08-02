(()=>{'use strict';
const cfg=window.InvoiceConfig;
const freeze=value=>(window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class InvoiceStore{
  #service;#state;#inflight=null;
  constructor(service){if(!service)throw new TypeError('InvoiceService is verplicht.');this.#service=service;this.#state=freeze({invoices:freeze([]),activeInvoice:null,lines:freeze([]),calculation:null,loading:false,saving:false,error:null})}
  getSnapshot(){return this.#state}
  #publish(name,detail){window.dispatchEvent(new CustomEvent(name,{detail:freeze(detail)}))}
  #set(patch,event=null,detail=null){this.#state=freeze({...this.#state,...patch});if(event)this.#publish(event,detail||this.#state);this.#publish(cfg.events.changed,{state:this.#state});return this.#state}
  async load(organizationId){if(this.#inflight)return this.#inflight;this.#set({loading:true,error:null},cfg.events.loading);this.#inflight=(async()=>{try{const invoices=await this.#service.list(organizationId);return this.#set({invoices,loading:false},cfg.events.loaded,{invoices})}catch(error){this.#set({loading:false,error:error.message},cfg.events.failed,{error});throw error}finally{this.#inflight=null}})();return this.#inflight}
  setDraft(payload={}){const calculation=this.#service.calculate(payload.lines||[]);return this.#set({activeInvoice:freeze({...payload}),lines:calculation.lines,calculation},null)}
  async saveDraft(payload){const snapshot=this.#state;this.#set({saving:true,error:null},cfg.events.saving,{snapshot});try{const saved=await this.#service.saveDraft(payload);const invoices=freeze([...this.#state.invoices.filter(invoice=>invoice.id!==saved.id),saved]);this.#set({invoices,activeInvoice:saved,lines:saved.line_snapshot||freeze([]),saving:false},cfg.events.saved,{invoice:saved});return saved}catch(error){this.#state=snapshot;this.#publish(cfg.events.rollback,{snapshot,error});throw error}}
  async issue(payload){const snapshot=this.#state;this.#set({saving:true,error:null},cfg.events.saving,{snapshot});try{const issued=await this.#service.issue(payload);const invoices=freeze([...this.#state.invoices.filter(invoice=>invoice.id!==issued.id),issued]);this.#set({invoices,activeInvoice:issued,saving:false},cfg.events.saved,{invoice:issued});return issued}catch(error){this.#state=snapshot;this.#publish(cfg.events.rollback,{snapshot,error});throw error}}
}
window.InvoiceStore=InvoiceStore;
})();
