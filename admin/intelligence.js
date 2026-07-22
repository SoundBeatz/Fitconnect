(()=>{
  'use strict';
  const client=window.getFitConnectSupabase?.();
  const $=selector=>document.querySelector(selector);
  const money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value||0));
  const dateKey=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'Europe/Amsterdam'});
  const startOfDay=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const daysAgo=days=>{const date=startOfDay(new Date());date.setDate(date.getDate()-days);return date};
  const paymentOf=order=>[...(order.payments||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||{};
  const safe=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  async function edgeOrders(){
    const {data,error}=await client.functions.invoke('commerce-update-order',{body:{action:'list'}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return Array.isArray(data?.orders)?data.orders:[];
  }

  async function read(table,columns='*',options={}){
    let query=client.from(table).select(columns);
    if(options.order)query=query.order(options.order,{ascending:false});
    const {data,error}=await query;
    if(error)throw error;
    return data||[];
  }

  function priority(type,title,detail,action,view){return{type,title,detail,action,view}}
  function buildPriorities(state){
    const items=[];
    const unpaid=state.orders.filter(order=>['failed','expired'].includes(paymentOf(order).status));
    const fulfilment=state.orders.filter(order=>paymentOf(order).status==='paid'&&!['shipped','delivered','cancelled','returned'].includes(order.order_status));
    const lowStock=state.products.filter(product=>product.status==='active'&&Number(product.stock||0)<=2);
    const openService=state.service.filter(item=>item.status!=='closed');
    if(fulfilment.length)items.push(priority('high',`${fulfilment.length} betaalde ${fulfilment.length===1?'bestelling wacht':'bestellingen wachten'} op verwerking`,`${money(fulfilment.reduce((sum,item)=>sum+Number(item.grand_total||0),0))} moet nog worden verzameld of verzonden.`,'Orders openen','orders'));
    if(openService.length)items.push(priority(openService.length>3?'high':'medium',`${openService.length} open service${openService.length===1?'verzoek':'verzoeken'}`,'Controleer responstijd, eigenaar en eerstvolgende actie.','Service openen','service'));
    if(lowStock.length)items.push(priority('medium',`${lowStock.length} actieve ${lowStock.length===1?'voorraadpositie is':'voorraadposities zijn'} laag`,lowStock.slice(0,3).map(item=>item.name).join(', ')+(lowStock.length>3?' en meer.':'.'),'Voorraad bekijken','products'));
    if(unpaid.length)items.push(priority('medium',`${unpaid.length} mislukte of verlopen ${unpaid.length===1?'betaling':'betalingen'}`,'Beoordeel of opvolging of checkout-analyse nodig is.','Betalingen bekijken','orders'));
    if(!items.length)items.push(priority('good','Geen kritieke operationele blokkades','Orders, service en voorraad bevinden zich binnen de ingestelde grenzen.','Dashboard actueel','dashboard'));
    return items;
  }

  function renderPriorities(items){
    $('#priorityCount').textContent=`${items.length} ${items.length===1?'signaal':'signalen'}`;
    $('#priorityFeed').innerHTML=items.map(item=>`<article class="priority-item ${safe(item.type)}"><i></i><div><strong>${safe(item.title)}</strong><span>${safe(item.detail)}</span></div><button type="button" data-intelligence-open="${safe(item.view)}">${safe(item.action)}</button></article>`).join('');
    document.querySelectorAll('[data-intelligence-open]').forEach(button=>button.addEventListener('click',()=>document.querySelector(`[data-view="${button.dataset.intelligenceOpen}"]`)?.click()));
  }

  function renderChart(orders){
    const days=Array.from({length:7},(_,index)=>{const date=daysAgo(6-index);return{date,key:dateKey(date),total:0}});
    orders.filter(order=>paymentOf(order).status==='paid').forEach(order=>{const key=dateKey(paymentOf(order).paid_at||order.completed_at||order.created_at);const day=days.find(item=>item.key===key);if(day)day.total+=Number(order.grand_total||0)});
    const max=Math.max(...days.map(day=>day.total),1);
    $('#revenueChart').innerHTML=days.map(day=>`<div class="chart-day" title="${safe(money(day.total))}"><i style="height:${Math.max(3,(day.total/max)*100)}%"></i><strong>${safe(money(day.total))}</strong><span>${day.date.toLocaleDateString('nl-NL',{weekday:'short'})}</span></div>`).join('');
  }

  function renderHealth(state,priorities){
    const activeProducts=state.products.filter(item=>item.status==='active');
    const dimensions=[
      ['Commerce',Math.max(0,100-priorities.filter(item=>item.type==='high').length*25)],
      ['Voorraad',activeProducts.length?Math.round(activeProducts.filter(item=>Number(item.stock||0)>2).length/activeProducts.length*100):100],
      ['Service',Math.max(0,100-state.service.filter(item=>item.status!=='closed').length*10)],
      ['Datakwaliteit',activeProducts.length?Math.round(activeProducts.filter(item=>item.name&&item.price!=null&&item.brand).length/activeProducts.length*100):100]
    ];
    const score=Math.round(dimensions.reduce((sum,item)=>sum+item[1],0)/dimensions.length);
    $('#healthScore').textContent=`${score}/100`;$('#healthGauge').style.width=`${score}%`;
    $('#healthDimensions').innerHTML=dimensions.map(([label,value])=>`<div class="health-row"><span>${safe(label)}</span><b>${value}%</b><div><i style="width:${value}%"></i></div></div>`).join('');
  }

  function renderChecks(state){
    const active=state.products.filter(item=>item.status==='active');
    const missingMedia=active.filter(item=>!Array.isArray(item.images)||!item.images.length).length;
    const checks=[
      ['Databaseverbinding','Verbonden','ok'],
      ['Commerce orderstroom',`${state.orders.length} orders bereikbaar`,'ok'],
      ['Productmedia',missingMedia?`${missingMedia} actief zonder foto`:'Compleet',missingMedia?'warning':'ok'],
      ['Klantprofielen',`${state.customers.length} profielen bereikbaar`,'ok'],
      ['Laatste synchronisatie',new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),'ok']
    ];
    $('#systemChecks').innerHTML=checks.map(([label,value,status])=>`<div class="system-check ${status}"><i></i><span>${safe(label)}</span><small>${safe(value)}</small></div>`).join('');
  }

  function renderKpis(state,priorities){
    const cutoff=daysAgo(30),previousCutoff=daysAgo(60);
    const paid=state.orders.filter(order=>paymentOf(order).status==='paid');
    const current=paid.filter(order=>new Date(paymentOf(order).paid_at||order.created_at)>=cutoff);
    const previous=paid.filter(order=>{const date=new Date(paymentOf(order).paid_at||order.created_at);return date>=previousCutoff&&date<cutoff});
    const revenue=current.reduce((sum,item)=>sum+Number(item.grand_total||0),0),previousRevenue=previous.reduce((sum,item)=>sum+Number(item.grand_total||0),0);
    const delta=previousRevenue?Math.round((revenue-previousRevenue)/previousRevenue*100):null;
    const customers=state.customers.filter(item=>item.role==='customer');
    const newCustomers=customers.filter(item=>new Date(item.created_at)>=cutoff).length;
    const pressure=priorities.filter(item=>item.type!=='good').length;
    $('#executiveRevenue').textContent=money(revenue);$('#revenueDelta').textContent=delta===null?'Nog geen vergelijkingsperiode':`${delta>=0?'+':''}${delta}% versus vorige periode`;
    $('#executivePaidOrders').textContent=String(current.length);$('#averageOrderValue').textContent=`${money(current.length?revenue/current.length:0)} gemiddeld`;
    $('#executiveCustomers').textContent=String(customers.length);$('#newCustomersLabel').textContent=`${newCustomers} nieuw in 30 dagen`;
    $('#executivePressure').textContent=String(pressure);$('#pressureLabel').textContent=pressure?`${priorities.filter(item=>item.type==='high').length} hoge prioriteit`:'Alles onder controle';
  }

  async function load(){
    const button=$('#refreshIntelligence');if(!client)return;
    if(button){button.disabled=true;button.textContent='Analyseren…'}
    try{
      const results=await Promise.allSettled([edgeOrders(),read('products'),read('profiles','id,full_name,role,created_at'),read('service_requests')]);
      const required=results.slice(0,3);if(required.some(result=>result.status==='rejected'))throw new Error('Een verplichte databron is niet bereikbaar');
      const state={orders:results[0].value,products:results[1].value,customers:results[2].value,service:results[3].status==='fulfilled'?results[3].value:[]};
      const priorities=buildPriorities(state);renderKpis(state,priorities);renderPriorities(priorities);renderHealth(state,priorities);renderChart(state.orders);renderChecks(state);
      $('#intelligenceTimestamp').textContent=`Live bijgewerkt op ${new Date().toLocaleString('nl-NL',{dateStyle:'long',timeStyle:'short'})}`;
    }catch(error){console.error('Command Center Intelligence',error);$('#priorityFeed').innerHTML=`<article class="priority-item high"><i></i><div><strong>Bedrijfsbeeld kon niet volledig worden opgebouwd</strong><span>${safe(error.message||'Onbekende synchronisatiefout')}</span></div></article>`;window.fitConnectToast?.('Executive Intelligence kon niet volledig laden')}
    finally{if(button){button.disabled=false;button.textContent='Alles vernieuwen'}}
  }
  $('#refreshIntelligence')?.addEventListener('click',load);
  window.addEventListener('load',()=>setTimeout(load,250));
})();
