(async()=>{
  'use strict';
  const inventoryTag='20260802-commerce-inventory-foundation-v1';
  const loadScript=(name)=>new Promise((resolve,reject)=>{
    if(document.querySelector(`script[data-inventory-fdmp="${name}"]`))return resolve();
    const script=document.createElement('script');script.src=`/admin/${name}.js?v=${inventoryTag}`;script.async=false;script.dataset.inventoryFdmp=name;script.onload=()=>resolve();script.onerror=()=>reject(new Error(`Inventory-script laden mislukt: ${name}`));document.head.appendChild(script);
  });
  try{
    for(const name of ['inventory-persistence-adapter','inventory-repository','inventory-service','inventory-store','inventory-v1-bridge'])await loadScript(name);
  }catch(error){console.error('[Inventory Foundation]',error);window.fitConnectToast?.(error.message||'Inventory foundation kon niet worden geladen.');}

  const client=window.getFitConnectSupabase?.();
  if(!client)return;
  const money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const number=value=>{const parsed=Number(String(value??'').replace(',','.'));return Number.isFinite(parsed)?parsed:0};
  let activeProductId='';
  let lastSavedValue=null;
  let saving=false;

  function inject(form){
    if(!form||form.elements.purchasePrice)return;
    const price=form.elements.price,row=price?.closest('.field-row');if(!row)return;
    const label=document.createElement('label');label.className='purchase-price-field';label.innerHTML='Inkoopprijs excl. btw<input name="purchasePrice" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"><small id="purchaseMarginPreview">Interne kostprijs voor Bundle Intelligence.</small>';
    row.appendChild(label);
    if(!document.getElementById('purchasePriceFDMPStyle')){const style=document.createElement('style');style.id='purchasePriceFDMPStyle';style.textContent='.purchase-price-field small{display:block;margin-top:6px;color:#73767c;font-size:12px}.purchase-price-field.is-missing input{border-color:#d97706;background:#fffaf0}.purchase-price-field.is-ready input{border-color:#16803c}';document.head.appendChild(style)}
    form.elements.purchasePrice.addEventListener('input',()=>renderPreview(form));price?.addEventListener('input',()=>renderPreview(form));
  }

  function renderPreview(form){const purchase=number(form.elements.purchasePrice?.value),sales=number(form.elements.price?.value),preview=form.querySelector('#purchaseMarginPreview'),field=form.elements.purchasePrice?.closest('label');if(!preview||!field)return;field.classList.toggle('is-missing',purchase<=0);field.classList.toggle('is-ready',purchase>0);if(purchase<=0){preview.textContent='Nog geen inkoopprijs: bundelmarge blijft onvolledig.';return}const margin=sales-purchase,percent=sales>0?margin/sales*100:0;preview.textContent=`Indicatieve productmarge: ${money(margin)} · ${percent.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})}%`}

  async function savePurchasePrice(productId,purchasePrice){if(saving||!productId||purchasePrice===lastSavedValue)return;saving=true;try{const {error}=await client.rpc('commerce_set_product_purchase_price',{p_product_id:productId,p_purchase_price:purchasePrice});if(error)throw error;lastSavedValue=purchasePrice;window.fitConnectToast?.('Product en beveiligde inkoopprijs opgeslagen');window.dispatchEvent(new CustomEvent('fitconnect:purchase-price-updated',{detail:{productId,purchasePrice}}))}catch(error){console.error(error);window.fitConnectToast?.(error.message||'Inkoopprijs opslaan mislukt')}finally{saving=false}}

  window.addEventListener('fitconnect:product-editor-opened',event=>{const {id,product,form}=event.detail||{};if(!form)return;inject(form);activeProductId=id||'';const value=Number(product?.purchasePrice||0);lastSavedValue=value;form.elements.purchasePrice.value=value||'';renderPreview(form)});
  window.addEventListener('fitconnect:product-saved',event=>{const {id,product}=event.detail||{};const form=document.getElementById('productForm');if(!id||!form||String(activeProductId)!==String(id))return;const value=number(form.elements.purchasePrice?.value);if(value!==Number(product?.purchasePrice||0)||value!==lastSavedValue)savePurchasePrice(id,value)});
})();
