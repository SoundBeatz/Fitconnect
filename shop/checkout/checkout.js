(()=>{
  'use strict';
  const SUPABASE_URL=window.FITCONNECT_SUPABASE?.url;
  const SUPABASE_KEY=window.FITCONNECT_SUPABASE?.anonKey;
  const itemsElement=document.getElementById('checkoutItems');
  const totalsElement=document.getElementById('checkoutTotals');
  const message=document.getElementById('checkoutMessage');
  const submitButton=document.getElementById('checkoutSubmit');
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let cart=[];
  let products=[];
  let checkoutBusy=false;

  function readCart(){try{return JSON.parse(localStorage.getItem('fitconnect-cart')||'[]').map(item=>typeof item==='string'?{productId:item,quantity:1}:item)}catch(_error){return []}}
  async function load(){
    cart=readCart().filter(item=>item?.productId&&Number(item.quantity)>0);
    if(!cart.length){location.replace('../');return}
    const ids=cart.map(item=>item.productId).join(',');
    const response=await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,price,vat&id=in.(${encodeURIComponent(ids)})`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!response.ok)throw new Error(`Product API ${response.status}`);
    products=await response.json();
    render();
  }
  function render(){
    const rows=cart.map(item=>({item,product:products.find(product=>product.id===item.productId)})).filter(row=>row.product);
    const total=rows.reduce((sum,row)=>sum+Number(row.product.price)*Number(row.item.quantity),0);
    itemsElement.innerHTML=rows.map(({item,product})=>`<div class="summary-item"><span>${escapeHtml(product.name)} × ${item.quantity}</span><strong>${euro(Number(product.price)*item.quantity)}</strong></div>`).join('');
    totalsElement.innerHTML=`<div class="summary-total"><span>Totaal incl. btw</span><strong>${euro(total)}</strong></div>`;
  }
  async function functionRequest(name,body){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/${name}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'De betaalservice is tijdelijk niet bereikbaar.');
    return payload;
  }
  async function checkReturnStatus(){
    const checkoutSessionId=new URLSearchParams(location.search).get('checkout');
    if(!checkoutSessionId)return;
    const idempotencyKey=sessionStorage.getItem(`fitconnect-checkout-${checkoutSessionId}`);
    if(!idempotencyKey){message.textContent='De betaling wordt gecontroleerd. Controleer uw e-mail voor de definitieve bevestiging.';return}
    message.textContent='Uw betaling wordt gecontroleerd…';
    for(let attempt=0;attempt<8;attempt+=1){
      const status=await functionRequest('commerce-payment-status',{checkoutSessionId,idempotencyKey});
      if(status.paymentStatus==='paid'){
        localStorage.removeItem('fitconnect-cart');
        sessionStorage.removeItem(`fitconnect-checkout-${checkoutSessionId}`);
        message.textContent='Betaling ontvangen. Bedankt voor uw bestelling! U ontvangt de bevestiging per e-mail.';
        submitButton.hidden=true;
        return;
      }
      if(['failed','cancelled','expired'].includes(status.paymentStatus)){message.textContent='De betaling is niet voltooid. U kunt het hieronder opnieuw proberen.';return}
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    message.textContent='Mollie verwerkt de betaling nog. U ontvangt de definitieve bevestiging per e-mail.';
  }
  document.getElementById('checkoutForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(checkoutBusy)return;
    checkoutBusy=true;submitButton.disabled=true;submitButton.textContent='Beveiligde betaling starten…';message.textContent='Uw bestelling wordt server-side gecontroleerd.';
    try{
      const data=new FormData(event.currentTarget);
      const idempotencyKey=crypto.randomUUID();
      const result=await functionRequest('commerce-create-payment',{idempotencyKey,items:cart,customer:{firstName:data.get('firstName'),lastName:data.get('lastName'),email:data.get('email'),phone:data.get('phone')},shippingAddress:{street:data.get('street'),postalCode:data.get('postalCode'),city:data.get('city'),country:'NL'}});
      sessionStorage.setItem(`fitconnect-checkout-${result.checkoutSessionId}`,idempotencyKey);
      location.assign(result.checkoutUrl);
    }catch(error){console.error(error);message.textContent=error.message;checkoutBusy=false;submitButton.disabled=false;submitButton.textContent='Veilig betalen met Mollie'}
  });
  load().then(checkReturnStatus).catch(error=>{console.error(error);message.textContent='De bestelling kon niet worden geladen. Ga terug naar de winkelmand en probeer opnieuw.'});
})();
