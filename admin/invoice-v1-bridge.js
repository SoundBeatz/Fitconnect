(()=>{'use strict';
const cfg=window.InvoiceConfig;
const client=window.getFitConnectSupabase?.();
if(!cfg||!client||!window.InvoiceRepository||!window.InvoiceService||!window.InvoiceStore)return;
const store=window.invoiceStore=window.invoiceStore||new window.InvoiceStore(new window.InvoiceService(new window.InvoiceRepository(client)));
function passiveSync(state=store.getSnapshot()){const rows=document.getElementById('invoiceRows');if(rows)rows.dataset.fdmpInvoiceCount=String(state.invoices.length);const totals=document.getElementById('invoiceTotals');if(totals&&state.calculation){totals.dataset.fdmpSubtotal=String(state.calculation.subtotal);totals.dataset.fdmpTaxTotal=String(state.calculation.taxTotal);totals.dataset.fdmpGrandTotal=String(state.calculation.grandTotal)}}
window.addEventListener(cfg.events.loaded,event=>passiveSync({...store.getSnapshot(),invoices:event.detail?.invoices||store.getSnapshot().invoices}));
window.addEventListener(cfg.events.changed,event=>passiveSync(event.detail?.state||store.getSnapshot()));
document.addEventListener('submit',event=>{if(event.target?.id!=='invoiceForm')return;const transaction=new CustomEvent('fitconnect:invoice-submit',{cancelable:true,detail:Object.freeze({form:event.target,store})});const handled=!window.dispatchEvent(transaction);if(window.__fitConnectInvoiceFdmpSubmitEnabled===true&&handled){event.preventDefault();event.stopImmediatePropagation()}},true);
document.addEventListener('click',event=>{const issueButton=event.target.closest?.('[data-issue]');if(!issueButton)return;window.dispatchEvent(new CustomEvent('fitconnect:invoice-issue-requested',{detail:Object.freeze({button:issueButton,store})}))},true);
window.FitConnectInvoiceV1Bridge=Object.freeze({store,passiveSync});
})();
