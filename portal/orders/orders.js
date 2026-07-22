(()=>{'use strict';
const client=window.getFitConnectSupabase?.(),list=document.getElementById('ordersList'),detail=document.getElementById('orderDetail'),statusEl=document.getElementById('ordersStatus');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const euro=v=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(v||0));
const date=v=>new Intl.DateTimeFormat('nl-NL',{dateStyle:'long'}).format(new Date(v));
const labels={processing:'Wordt verwerkt',confirmed:'Bevestigd',picking:'Wordt verzameld',packed:'Klaar voor verzending',shipped:'Verzonden',delivered:'Bezorgd',cancelled:'Geannuleerd',returned:'Retour',created:'Aangemaakt',pending:'In behandeling',paid:'Betaald',failed:'Mislukt',expired:'Verlopen',refunded:'Terugbetaald',partially_refunded:'Deels terugbetaald'};
function setStatus(text,error=false){statusEl.textContent=text;statusEl.classList.toggle('error',error)}
function reference(order){return `FC-${order.id.slice(0,8).toUpperCase()}`}
function paymentOf(order){const payments=Array.isArray(order.commerce_payments)?order.commerce_payments:[];return payments.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||{status:'pending'}}
function progress(status){const steps=['processing','confirmed','packed','shipped','delivered'],i=Math.max(0,steps.indexOf(status));return steps.map((step,index)=>`<li class="${index<=i?'done':''}"><i>${index<i?'✓':index+1}</i><span>${labels[step]}</span></li>`).join('')}
async function downloadInvoice(orderId,button){
  const original=button.textContent;button.disabled=true;button.textContent='Factuur openen…';
  try{
    const {data,error}=await client.functions.invoke('commerce-download-invoice',{body:{orderId}});
    if(error)throw error;if(!data?.url)throw new Error('Factuur niet beschikbaar');
    window.open(data.url,'_blank','noopener');
  }catch(error){console.error(error);setStatus('De factuur kon niet worden geopend. Probeer het opnieuw.',true)}
  finally{button.disabled=false;button.textContent=original}
}
function renderList(orders){
  detail.hidden=true;list.hidden=false;
  if(!orders.length){list.innerHTML='<article class="empty"><h2>Nog geen bestellingen</h2><p>Na uw eerste aankoop verschijnt de volledige voortgang hier automatisch.</p><a href="../../shop/">Naar de shop</a></article>';return}
  list.innerHTML=orders.map(order=>{const payment=paymentOf(order);return `<article class="order-card"><div><small>${esc(reference(order))} · ${esc(date(order.created_at))}</small><h2>${esc(labels[order.order_status]||'Wordt verwerkt')}</h2><p>${order.commerce_cart_items?.length||0} artikel(en) · ${esc(euro(order.grand_total))}</p></div><div class="order-actions"><span class="pill ${payment.status==='paid'?'paid':''}">${esc(labels[payment.status]||payment.status)}</span><button type="button" data-order="${order.id}">Bekijk bestelling</button></div></article>`}).join('');
  list.querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>showDetail(orders.find(order=>order.id===button.dataset.order))));
}
function showDetail(order){
  if(!order)return;const payment=paymentOf(order),address=order.shipping_address||{},invoice=order.commerce_invoices?.[0];
  const tracking=order.tracking_code?`<a class="tracking" href="${esc(order.tracking_url||'#')}" ${order.tracking_url?'target="_blank" rel="noopener"':''}><strong>${esc(order.tracking_carrier||'Vervoerder')}</strong><span>${esc(order.tracking_code)}</span></a>`:'<p class="muted">Track & Trace verschijnt hier zodra uw bestelling is verzonden.</p>';
  const invoiceBlock=invoice?`<h3>Factuur</h3><div class="invoice-box"><span><strong>${esc(invoice.invoice_number)}</strong><small>Betaald · ${esc(date(invoice.issued_at))}</small></span><button type="button" data-invoice>Download PDF</button></div>`:(payment.status==='paid'?'<h3>Factuur</h3><p class="muted">Uw factuur wordt klaargezet.</p>':'');
  list.hidden=true;detail.hidden=false;
  detail.innerHTML=`<button class="back" type="button">← Alle bestellingen</button><div class="detail-head"><div><p class="eyebrow">${esc(reference(order))}</p><h2>${esc(labels[order.order_status]||'Wordt verwerkt')}</h2><p>Besteld op ${esc(date(order.created_at))}</p></div><span class="pill ${payment.status==='paid'?'paid':''}">${esc(labels[payment.status]||payment.status)}</span></div><ol class="journey">${progress(order.order_status)}</ol><div class="detail-grid"><section><h3>Artikelen</h3>${(order.commerce_cart_items||[]).map(item=>`<div class="line"><span>${esc(item.product_name)} × ${Number(item.quantity)}</span><strong>${esc(euro(Number(item.unit_price)*(1+Number(item.tax_rate)/100)*Number(item.quantity)))}</strong></div>`).join('')}<div class="line total"><span>Totaal incl. btw</span><strong>${esc(euro(order.grand_total))}</strong></div></section><section><h3>Bezorgadres</h3><p>${esc(`${order.first_name} ${order.last_name}`)}<br>${esc(`${address.street||''} ${address.house_number||''}`)}<br>${esc(`${address.postal_code||''} ${address.city||''}`)}</p><h3>Track & Trace</h3>${tracking}${invoiceBlock}</section></div>`;
  detail.querySelector('.back').addEventListener('click',()=>renderList(window.__fitconnectOrders||[]));
  detail.querySelector('[data-invoice]')?.addEventListener('click',event=>downloadInvoice(order.id,event.currentTarget));
}
async function load(){
  if(!client){location.replace('../../login/?login=required');return}const {data:{session}}=await client.auth.getSession();if(!session){location.replace('../../login/?login=required');return}
  const {data:profile,error:profileError}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();if(profileError||!profile){location.replace('../../login/?denied=1');return}
  const {data,error}=await client.from('commerce_checkout_sessions').select('id,cart_id,created_at,first_name,last_name,shipping_address,grand_total,currency,order_status,tracking_carrier,tracking_code,tracking_url').eq('user_id',session.user.id).order('created_at',{ascending:false});if(error)throw error;
  const rows=data||[],checkoutIds=rows.map(order=>order.id),cartIds=[...new Set(rows.map(order=>order.cart_id).filter(Boolean))];let payments=[],items=[],invoices=[];const requests=[];
  if(checkoutIds.length){
    requests.push(client.from('commerce_payments').select('checkout_session_id,status,created_at').in('checkout_session_id',checkoutIds).then(result=>{if(result.error)console.warn('Payments unavailable',result.error);else payments=result.data||[]}));
    requests.push(client.from('commerce_invoices').select('checkout_session_id,invoice_number,issued_at,status').eq('status','issued').in('checkout_session_id',checkoutIds).then(result=>{if(result.error)console.warn('Invoices unavailable',result.error);else invoices=result.data||[]}));
  }
  if(cartIds.length)requests.push(client.from('commerce_cart_items').select('cart_id,product_name,quantity,unit_price,tax_rate').in('cart_id',cartIds).then(result=>{if(result.error)console.warn('Order items unavailable',result.error);else items=result.data||[]}));
  await Promise.all(requests);
  const group=(rows,key)=>rows.reduce((groups,row)=>{(groups[row[key]]??=[]).push(row);return groups},{}),paymentsByCheckout=group(payments,'checkout_session_id'),itemsByCart=group(items,'cart_id'),invoicesByCheckout=group(invoices,'checkout_session_id');
  const orders=rows.map(order=>({...order,commerce_payments:paymentsByCheckout[order.id]||[],commerce_cart_items:itemsByCart[order.cart_id]||[],commerce_invoices:invoicesByCheckout[order.id]||[]}));
  window.__fitconnectOrders=orders;setStatus(`${orders.length} bestelling${orders.length===1?'':'en'}`);const selected=new URLSearchParams(location.search).get('order');selected?showDetail(orders.find(order=>order.id===selected)):renderList(orders);
}
document.getElementById('logoutButton').addEventListener('click',async()=>{if(client)await client.auth.signOut({scope:'local'});location.replace('../../login/?logout=1')});
load().catch(error=>{console.error(error);setStatus('Uw bestellingen konden niet worden geladen.',true)});
})();
