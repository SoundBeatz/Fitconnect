(()=>{
  'use strict';
  const money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const invoiceEvents=['fitconnect:invoice-loaded','fitconnect:invoice-saved','fitconnect:invoice-payment-registered'];

  function invoices(){return window.invoiceStore?.getSnapshot?.().invoices||[]}
  function calculate(rows=invoices()){
    const now=new Date(),cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-30);
    const collectible=rows.filter(invoice=>!['draft','credited','void'].includes(invoice.status)&&!['paid','refunded'].includes(invoice.payment_status));
    const overdue=collectible.filter(invoice=>invoice.due_at&&new Date(invoice.due_at)<now);
    const paid30=rows.filter(invoice=>invoice.payment_status==='paid'&&invoice.paid_at&&new Date(invoice.paid_at)>=cutoff);
    const integrity=rows.filter(invoice=>(invoice.payment_status==='paid'&&!invoice.paid_at)||(invoice.payment_status!=='paid'&&invoice.status==='paid'));
    return Object.freeze({
      invoiceCount:rows.length,
      paid30Count:paid30.length,
      paid30Total:paid30.reduce((sum,invoice)=>sum+Number(invoice.grand_total||0),0),
      openCount:collectible.length,
      openTotal:collectible.reduce((sum,invoice)=>sum+Number(invoice.grand_total||0),0),
      overdueCount:overdue.length,
      overdueTotal:overdue.reduce((sum,invoice)=>sum+Number(invoice.grand_total||0),0),
      integrityCount:integrity.length
    })
  }
  function panel(){
    let node=document.getElementById('financeIntelligencePanel');
    if(node)return node;
    const dashboard=document.getElementById('dashboard');if(!dashboard)return null;
    node=document.createElement('section');node.id='financeIntelligencePanel';node.className='panel finance-intelligence-panel';
    const anchor=dashboard.querySelector('.catalogue-summary');anchor?.before(node);if(!anchor)dashboard.appendChild(node);
    return node;
  }
  function style(){
    if(document.getElementById('financeIntelligenceStyles'))return;
    const css=document.createElement('style');css.id='financeIntelligenceStyles';css.textContent='.finance-intelligence-panel{margin:0 0 24px}.finance-intelligence-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}.finance-intelligence-head h2{margin:3px 0 0}.finance-intelligence-head small{color:var(--muted)}.finance-intelligence-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.finance-intelligence-grid article{padding:16px;border:1px solid var(--line);border-radius:14px;background:#faf9f6}.finance-intelligence-grid span,.finance-intelligence-grid small{display:block;color:var(--muted)}.finance-intelligence-grid strong{display:block;margin:6px 0 4px;font-size:22px}.finance-intelligence-grid article.warning strong{color:#9a6700}.finance-intelligence-grid article.alert strong{color:#b42318}@media(max-width:900px){.finance-intelligence-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.finance-intelligence-grid{grid-template-columns:1fr}}';document.head.appendChild(css)
  }
  function render(){
    const node=panel();if(!node)return;style();const stats=calculate();
    node.innerHTML=`<div class="finance-intelligence-head"><div><p class="eyebrow">Finance Intelligence</p><h2>Facturen en cashflow</h2></div><small>${stats.invoiceCount} facturen in canonieke InvoiceStore</small></div><div class="finance-intelligence-grid"><article><span>Betaald · 30 dagen</span><strong>${money(stats.paid30Total)}</strong><small>${stats.paid30Count} facturen</small></article><article class="${stats.openCount?'warning':''}"><span>Openstaand</span><strong>${money(stats.openTotal)}</strong><small>${stats.openCount} open facturen</small></article><article class="${stats.overdueCount?'alert':''}"><span>Achterstallig</span><strong>${money(stats.overdueTotal)}</strong><small>${stats.overdueCount} over tijd</small></article><article class="${stats.integrityCount?'alert':''}"><span>Financiële integriteit</span><strong>${stats.integrityCount===0?'100%':`${stats.integrityCount} fout${stats.integrityCount===1?'':'en'}`}</strong><small>payment_status ↔ paid_at</small></article></div>`;
  }
  function init(){render();invoiceEvents.forEach(name=>window.addEventListener(name,render));document.getElementById('refreshIntelligence')?.addEventListener('click',()=>window.setTimeout(render,0))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.FitConnectFinanceRenderer=Object.freeze({render,calculate});
})();
