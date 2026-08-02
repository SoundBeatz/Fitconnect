(()=>{'use strict';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const repository=new window.CustomerRepository();
const service=new window.CustomerService(repository);
const store=new window.CustomerStore(service);
window.customerStore=store;
function render(snapshot=store.getSnapshot()){
  const rows=document.getElementById('customerRows');
  if(rows){
    rows.innerHTML=snapshot.customers.map(customer=>`<tr data-customer-id="${escapeHtml(customer.id)}"><td><strong>${escapeHtml(customer.fullName||customer.companyName||'Naam ontbreekt')}</strong></td><td>${escapeHtml(customer.phone||'-')}</td><td>${escapeHtml(customer.isB2BInvoiceOnly?'invoice_customer':customer.role)}</td></tr>`).join('')||'<tr><td colspan="3">Nog geen klanten.</td></tr>';
  }
  document.querySelectorAll('[data-customer-options]').forEach(select=>{
    const selected=select.value;
    select.innerHTML='<option value="">Kies een klant</option>'+snapshot.customers.filter(customer=>customer.role!=='admin').map(customer=>`<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.companyName||customer.fullName||customer.email||customer.id)}</option>`).join('');
    if(snapshot.customers.some(customer=>customer.id===selected))select.value=selected;
  });
}
function captureSubmit(event){
  const form=event.target.closest?.('[data-customer-form],#customerForm');
  if(!form)return;
  event.preventDefault();event.stopImmediatePropagation();
  const fd=new FormData(form);const selected=store.find(String(fd.get('id')||''));
  const model={...(selected||{}),id:selected?.id||null,source:selected?.source||window.CustomerConfig.sources.invoiceCustomer,portalUserId:selected?.portalUserId||null,fullName:String(fd.get('fullName')||fd.get('name')||''),companyName:String(fd.get('companyName')||''),contactName:String(fd.get('contactName')||''),email:String(fd.get('email')||''),phone:String(fd.get('phone')||''),address:{line1:String(fd.get('address')||fd.get('addressLine1')||''),postalCode:String(fd.get('postalCode')||''),city:String(fd.get('city')||''),countryCode:String(fd.get('countryCode')||'NL')},fiscal:{vatNumber:String(fd.get('vatNumber')||''),kvkNumber:String(fd.get('kvkNumber')||'')}};
  const organizationId=form.dataset.organizationId||window.FITCONNECT_ORGANIZATION_ID||null;
  store.saveInvoiceCustomer(model,{organizationId}).catch(error=>window.fitConnectToast?.(error.message||'Klant opslaan mislukt'));
}
window.addEventListener(window.CustomerConfig.events.loaded,event=>render(event.detail));
window.addEventListener(window.CustomerConfig.events.saved,event=>render(event.detail));
document.addEventListener('submit',captureSubmit,true);
store.load().catch(error=>console.error('Customer foundation load failed',error));
})();