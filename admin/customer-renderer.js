(()=>{'use strict';
const cfg=window.CustomerConfig;
const CardFactory=window.CustomerCardFactory;
const FormFactory=window.CustomerFormFactory;
const repository=new window.CustomerRepository();
const service=new window.CustomerService(repository);
const store=new window.CustomerStore(service);
window.customerStore=store;
const rows=()=>document.getElementById('customerRows');
const organizationId=()=>String(window.FITCONNECT_ORGANIZATION_ID||'').trim()||null;
function mount(customers){const body=rows();if(!body)return;const fragment=document.createDocumentFragment();if(customers.length)customers.forEach(customer=>fragment.appendChild(CardFactory.createRow(customer)));else fragment.appendChild(CardFactory.createEmptyRow());body.replaceChildren(fragment)}
function showLoading(){const body=rows();if(body&&!body.children.length)body.replaceChildren(CardFactory.createLoadingRow())}
function replaceCustomer(customer){const body=rows();if(!body)return;const current=body.querySelector(`tr[data-customer-row="${CSS.escape(customer.id)}"]`);const replacement=CardFactory.createRow(customer);if(current)current.replaceWith(replacement);else body.appendChild(replacement)}
function rollbackForm({id,snapshot,error}){const form=document.querySelector('[data-customer-form],#customerForm');if(form?.dataset.customerId===id)FormFactory.rollback(form,snapshot);window.fitConnectToast?.(error?.message||error||'Klant opslaan mislukt. Formulier hersteld.')}
async function submit(event){const form=event.target.closest?.('[data-customer-form],#customerForm');if(!form)return;event.preventDefault();event.stopImmediatePropagation();const id=form.dataset.customerId;const current=id?store.find(id):null;const customer=FormFactory.serialize(form,current||{});const tenantId=form.dataset.organizationId||organizationId()||current?.organizationId||null;if(!tenantId)throw new Error('Customer mutation blocked: organization context is required');await store.updateCustomer(customer,{organizationId:tenantId})}
function bind(){
  window.addEventListener(cfg.events.loading,showLoading);
  window.addEventListener(cfg.events.loaded,event=>mount(event.detail.customers||[]));
  window.addEventListener(cfg.events.saved,event=>{if(event.detail.entity)replaceCustomer(event.detail.entity)});
  window.addEventListener(cfg.events.rollback,event=>rollbackForm(event.detail));
  document.addEventListener('submit',event=>{submit(event).catch(error=>window.fitConnectToast?.(error?.message||'Klant opslaan mislukt.'))},true);
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="customers"]'))mount(store.getSnapshot().customers)},true);
}
function init(){bind();const tenantId=organizationId();if(!tenantId){console.error('Customer renderer blocked: FITCONNECT_ORGANIZATION_ID is required');mount([]);return}store.load({organizationId:tenantId}).catch(error=>console.error('Customer renderer load failed',error))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.FitConnectCustomerRenderer=Object.freeze({init,replaceCustomer,mount});
})();