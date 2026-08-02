(()=>{'use strict';
const cfg=window.InvoiceConfig,client=window.getFitConnectSupabase?.();
if(!cfg||!client||!window.InvoiceRepository||!window.InvoiceService||!window.InvoiceStore||!window.InvoiceFormFactory||!window.InvoiceCardFactory)return;
const repository=new window.InvoiceRepository(client);const store=window.invoiceStore=window.invoiceStore||new window.InvoiceStore(new window.InvoiceService(repository));
window.__fitConnectInvoiceFdmpSubmitEnabled=true;
const form=()=>document.getElementById('invoiceForm');
function replaceRows(invoices=[]){const body=document.getElementById('invoiceRows');if(!body)return;const fragment=document.createDocumentFragment();for(const invoice of invoices)fragment.appendChild(window.InvoiceCardFactory.createRow(invoice,openInvoice));body.replaceChildren(fragment)}
function replaceLines(lines=[]){const body=document.getElementById('invoiceLineRows');if(!body)return;const fragment=document.createDocumentFragment();lines.forEach((line,index)=>fragment.appendChild(window.InvoiceCardFactory.createLine(line,index,false)));body.replaceChildren(fragment)}
function replaceTotals(calculation){const totals=document.getElementById('invoiceTotals');if(!totals)return;totals.replaceChildren(window.InvoiceCardFactory.renderTotals(calculation))}
function openInvoice(id){const invoice=store.getSnapshot().invoices.find(item=>item.id===id);if(!invoice)return;window.InvoiceFormFactory.populate(form(),invoice);replaceLines(invoice.line_snapshot||[]);store.setDraft({...invoice,lines:invoice.line_snapshot||[]})}
async function serializeWithContext(target){const payload=window.InvoiceFormFactory.serialize(target);const organization_id=await repository.resolveOrganizationId();return Object.freeze({...payload,organization_id})}
async function save(target,issue=false){const payload=await serializeWithContext(target);return issue?store.issue(payload):store.saveDraft(payload)}
function handleSubmit(event){if(event.target?.id!=='invoiceForm'||window.__fitConnectInvoiceFdmpSubmitEnabled!==true)return;event.preventDefault();event.stopImmediatePropagation();save(event.target,false).catch(error=>window.fitConnectToast?.(error.message||'Concept opslaan mislukt.'))}
function handleIssue(event){const button=event.target.closest?.('[data-issue]');if(!button||window.__fitConnectInvoiceFdmpSubmitEnabled!==true)return;const target=form();if(!target)return;event.preventDefault();event.stopImmediatePropagation();save(target,true).catch(error=>window.fitConnectToast?.(error.message||'Factuur uitgeven mislukt.'))}
function recalculate(){const target=form();if(!target)return;try{store.setDraft(window.InvoiceFormFactory.serialize(target))}catch(_){} }
document.addEventListener('submit',handleSubmit,true);document.addEventListener('click',handleIssue,true);document.addEventListener('input',event=>{if(event.target.closest?.('#invoiceLineRows'))recalculate()},true);
window.addEventListener(cfg.events.loaded,event=>replaceRows(event.detail?.invoices||store.getSnapshot().invoices));
window.addEventListener(cfg.events.changed,event=>{const state=event.detail?.state||store.getSnapshot();replaceLines(state.lines||[]);replaceTotals(state.calculation)});
window.addEventListener(cfg.events.saved,event=>{const invoice=event.detail?.invoice;if(invoice){replaceRows(store.getSnapshot().invoices);window.InvoiceFormFactory.populate(form(),invoice);window.fitConnectToast?.(`Factuur ${invoice.invoice_number||'concept'} opgeslagen.`)}});
window.addEventListener(cfg.events.rollback,event=>{window.InvoiceFormFactory.rollback(form(),event.detail?.snapshot);const state=event.detail?.snapshot;replaceLines(state?.lines||[]);replaceTotals(state?.calculation);window.fitConnectToast?.(event.detail?.error?.message||'Factuur hersteld na fout.')});
window.FitConnectInvoiceRenderer=Object.freeze({store,openInvoice,replaceRows,replaceLines,replaceTotals});
})();