(()=>{'use strict';
const client=window.getFitConnectSupabase?.();if(!client)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=0,bound=false;
function drawer(){return document.getElementById('fcCustomer360')}
function current(){return window.__fcCustomer360Current||null}
function uid(){const c=current();return c?.portalUserId||c?.id||null}
function fmt(v){if(!v)return'';try{return new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v)}}
function ensure(){const d=drawer();if(!d||d.querySelector('[data-c360-activity-safe]'))return !!d;const overview=d.querySelector('[data-c360-overview-safe]'),tabs=d.querySelector('.fc-c360-tabs');if(!tabs)return false;(overview||tabs).insertAdjacentHTML(overview?'afterend':'beforebegin','<section class="fc-c360-activity-safe" data-c360-activity-safe hidden><div class="fc-c360-activity-head"><div><small>DOSSIER ACTIVITY</small><strong>Recente klantactiviteit</strong></div><div><button type="button" data-c360-open-activity>Activiteit / notitie</button></div></div><div class="fc-c360-activity-list" data-c360-activity-list></div></section>');return true}
function bindActions(){const d=drawer();if(!d||d.dataset.c360ActivityBound)return;d.dataset.c360ActivityBound='1';d.addEventListener('click',e=>{if(!e.target.closest('[data-c360-open-activity]'))return;d.querySelector('[data-c360-tab="communication"]')?.click()})}
function render(items){if(!ensure())return;bindActions();const p=drawer().querySelector('[data-c360-activity-safe]'),list=p?.querySelector('[data-c360-activity-list]');if(!p||!list)return;p.hidden=false;const rows=items.sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,8);list.innerHTML=rows.length?rows.map(x=>`<article><span>${esc(x.type)}</span><div><strong>${esc(x.title)}</strong>${x.detail?`<small>${esc(x.detail)}</small>`:''}</div><time>${esc(fmt(x.at))}</time></article>`).join(''):'<p>Er is nog geen dossieractiviteit.</p>'}
async function load(my){const id=uid();if(!id)return;const items=[];const results=await Promise.all([
client.from('customer_communications').select('subject,body,visible_to_customer,created_at').eq('customer_user_id',id).order('created_at',{ascending:false}).limit(8),
client.from('customer_documents').select('title,document_type,visible_to_customer,created_at').eq('customer_user_id',id).order('created_at',{ascending:false}).limit(8),
client.from('commerce_quotes').select('quote_number,status,invoice_id,created_at,updated_at').eq('portal_user_id',id).order('updated_at',{ascending:false}).limit(8),
client.from('commerce_checkout_sessions').select('id,status,order_status,created_at,updated_at').eq('user_id',id).order('created_at',{ascending:false}).limit(8)
]);if(my!==token)return;const [cr,dr,qr,or]=results;results.filter(r=>r.error).forEach(r=>console.warn('Customer 360 activity source unavailable',r.error.message));
(cr.data||[]).forEach(x=>items.push({type:x.visible_to_customer?'Bericht':'Intern',title:x.subject||'Communicatie',detail:(x.body||'').slice(0,120),at:x.created_at}));
(dr.data||[]).forEach(x=>items.push({type:'Document',title:x.title||'Document',detail:`${x.document_type||'general'} · ${x.visible_to_customer?'Klantzichtbaar':'Intern'}`,at:x.created_at}));
const quotes=qr.data||[],invoiceIds=quotes.map(x=>x.invoice_id).filter(Boolean);let invoices=[];if(invoiceIds.length){const r=await client.from('commerce_invoices').select('invoice_number,status,payment_status,issued_at,paid_at').in('id',invoiceIds);if(r.error)console.warn('Customer 360 invoice activity unavailable',r.error.message);invoices=r.data||[]}if(my!==token)return;
quotes.forEach(x=>items.push({type:'Offerte',title:x.quote_number||'Offerteaanvraag',detail:x.status||'',at:x.updated_at||x.created_at}));
invoices.forEach(x=>items.push({type:'Factuur',title:x.invoice_number||'Factuur',detail:x.payment_status||x.status||'',at:x.paid_at||x.issued_at}));
(or.data||[]).forEach(x=>items.push({type:'Order',title:`Order ${String(x.id||'').slice(0,8).toUpperCase()}`,detail:x.order_status||x.status||'',at:x.updated_at||x.created_at}));render(items)}
function schedule(){const my=++token;let n=0;const run=()=>{if(ensure()){bindActions();load(my);return}if(n++<8)setTimeout(run,150)};run()}
function bind(){if(bound)return;bound=true;document.addEventListener('click',e=>{if(e.target.closest('#customerRows tr[data-customer-row]'))setTimeout(schedule,0)},true)}
function init(){bind();ensure();bindActions()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();