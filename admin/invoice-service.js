(()=>{'use strict';
const cfg=window.InvoiceConfig;
const round=value=>Math.round((Number(value||0)+Number.EPSILON)*100)/100;
class InvoiceService{
  #repository;#hooks;
  constructor(repository,hooks={}){if(!repository)throw new TypeError('InvoiceRepository is verplicht.');this.#repository=repository;this.#hooks={beforeSave:hooks.beforeSave||null,afterSave:hooks.afterSave||null,beforeIssue:hooks.beforeIssue||null,afterIssue:hooks.afterIssue||null}}
  normalizeLine(line={}){const quantity=Number(line.quantity||0),unitPrice=Number(line.unit_price??line.unitPrice??0),taxRate=Number(line.tax_rate??line.taxRate??21);if(quantity<=0)throw new Error('Aantal moet groter dan nul zijn');if(!cfg.taxRates.includes(taxRate))throw new Error('Ongeldig BTW-tarief');const net=round(quantity*unitPrice),tax=round(net*taxRate/100);return Object.freeze({product_id:line.product_id||line.productId||null,description:String(line.description||'').trim().slice(0,cfg.limits.description),quantity,unit_price:unitPrice,tax_rate:taxRate,net_total:net,tax_total:tax,gross_total:round(net+tax)})}
  calculate(lines=[]){if(!lines.length||lines.length>cfg.limits.lines)throw new Error('Ongeldig aantal factuurregels');const normalized=lines.map(line=>this.normalizeLine(line));return Object.freeze({lines:Object.freeze(normalized),subtotal:round(normalized.reduce((sum,line)=>sum+line.net_total,0)),taxTotal:round(normalized.reduce((sum,line)=>sum+line.tax_total,0)),grandTotal:round(normalized.reduce((sum,line)=>sum+line.gross_total,0))})}
  prepare(payload={}){const calculation=this.calculate(payload.lines||payload.line_snapshot||[]);const billingAddressSnapshot=this.#repository.createBillingSnapshot(payload.billingAddress||payload.billing_address_snapshot||{},payload.addressContext||{});return Object.freeze({...payload,line_snapshot:calculation.lines,billing_address_snapshot:billingAddressSnapshot,subtotal:calculation.subtotal,tax_total:calculation.taxTotal,grand_total:calculation.grandTotal})}
  async saveDraft(payload){const prepared=this.prepare(payload);this.#hooks.beforeSave?.(prepared);const saved=payload.invoice_id?await this.#repository.updateDraft(prepared):await this.#repository.createDraft(prepared);this.#hooks.afterSave?.(saved);return saved}
  async issue(payload){const prepared=this.prepare(payload);this.#hooks.beforeIssue?.(prepared);const issued=await this.#repository.issue(prepared);this.#hooks.afterIssue?.(issued);return issued}
  list(organizationId){return this.#repository.list(organizationId)}
  registerPayment(payload){return this.#repository.registerPayment(payload)}
}
window.InvoiceService=InvoiceService;
})();
