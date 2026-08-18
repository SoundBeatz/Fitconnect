(()=>{'use strict';
const form=document.getElementById('checkoutForm'),business=document.getElementById('businessFields');
if(!form||!business)return;
const radios=[...form.querySelectorAll('input[name="customerType"]')];
const company=form.elements.company,kvk=form.elements.chamberOfCommerce,vat=form.elements.vatNumber,query=document.getElementById('kvkQuery'),find=document.getElementById('findCompany'),results=document.getElementById('kvkResults'),status=document.getElementById('kvkStatus');
const businessControls=[query,company,kvk,vat,find].filter(Boolean);
function clearError(input){if(!input)return;input.removeAttribute('aria-invalid');const error=input.closest('label')?.querySelector('.field-error');if(error)error.textContent=''}
function sync({clear=false}={}){
  const isBusiness=form.elements.customerType?.value==='business';
  business.hidden=!isBusiness;business.setAttribute('aria-hidden',String(!isBusiness));
  businessControls.forEach(control=>control.disabled=!isBusiness);
  if(company)company.required=isBusiness;
  if(kvk)kvk.required=isBusiness;
  if(vat)vat.required=false;
  if(!isBusiness){
    [company,kvk,vat].forEach(clearError);
    if(results)results.hidden=true;
    if(clear){if(company)company.value='';if(kvk)kvk.value='';if(vat)vat.value='';if(query)query.value='';if(status){status.className='';status.textContent='Zakelijke gegevens zijn alleen nodig wanneer u Zakelijk kiest.'}}
  }
}
async function prefill(){
  const client=window.getFitConnectSupabase?.();if(!client){sync();return}
  try{
    const {data:{session}}=await client.auth.getSession();if(!session){sync();return}
    const {data:profile}=await client.from('profiles').select('account_type,company_name,chamber_of_commerce,vat_number').eq('id',session.user.id).maybeSingle();
    const type=profile?.account_type==='business'?'business':'consumer';
    const radio=form.querySelector(`input[name="customerType"][value="${type}"]`);if(radio)radio.checked=true;
    if(type==='business'){
      if(company&&!company.value)company.value=profile?.company_name||'';
      if(kvk&&!kvk.value)kvk.value=profile?.chamber_of_commerce||'';
      if(vat&&!vat.value)vat.value=profile?.vat_number||'';
    }
    sync();
  }catch{sync()}
}
radios.forEach(radio=>radio.addEventListener('change',()=>sync({clear:true})));
form.addEventListener('reset',()=>setTimeout(()=>sync({clear:true}),0));
sync();prefill();
})();
