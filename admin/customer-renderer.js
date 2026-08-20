(()=>{'use strict';
const cfg=window.CustomerConfig;
const CardFactory=window.CustomerCardFactory;
const FormFactory=window.CustomerFormFactory;
const repository=new window.CustomerRepository();
const service=new window.CustomerService(repository);
const store=new window.CustomerStore(service);
window.customerStore=store;
let activeOrganizationId=null;
const rows=()=>document.getElementById('customerRows');
function mount(customers){const body=rows();if(!body)return;const fragment=document.createDocumentFragment();if(customers.length)customers.forEach(customer=>fragment.appendChild(CardFactory.createRow(customer)));else fragment.appendChild(CardFactory.createEmptyRow());body.replaceChildren(fragment)}
function showLoading(){const body=rows();if(body&&!body.children.length)body.replaceChildren(CardFactory.createLoadingRow())}
function replaceCustomer(customer){const body=rows();if(!body)return;const current=body.querySelector(`tr[data-customer-row="${CSS.escape(customer.id)}"]`);const replacement=CardFactory.createRow(customer);if(current)current.replaceWith(replacement);else body.appendChild(replacement)}
function rollbackForm({id,snapshot,error}){const form=document.querySelector('[data-customer-form],#customerForm');if(form?.dataset.customerId===id)FormFactory.rollback(form,snapshot);window.fitConnectToast?.(error?.message||error||'Klant opslaan mislukt. Formulier hersteld.')}
async function resolveOrganizationId(){if(activeOrganizationId)return activeOrganizationId;const configured=String(window.FITCONNECT_ORGANIZATION_ID||'').trim();if(configured){activeOrganizationId=configured;return configured}const client=window.getFitConnectSupabase?.();if(!client)throw new Error('Customer tenant resolution requires Supabase client');const {data,error}=await client.rpc('commerce_current_organization');if(error)throw error;if(!data)throw new Error('Geen actieve FitConnect-organisatie gevonden voor dit account');activeOrganizationId=String(data);window.FITCONNECT_ORGANIZATION_ID=activeOrganizationId;return activeOrganizationId}
async function submit(event){const form=event.target.closest?.('[data-customer-form],#customerForm');if(!form)return;event.preventDefault();event.stopImmediatePropagation();const id=form.dataset.customerId;const current=id?store.find(id):null;const customer=FormFactory.serialize(form,current||{});const tenantId=form.dataset.organizationId||current?.organizationId||await resolveOrganizationId();if(!tenantId)throw new Error('Customer mutation blocked: organization context is required');await store.updateCustomer(customer,{organizationId:tenantId})}
function bind(){
  window.addEventListener(cfg.events.loading,showLoading);
  window.addEventListener(cfg.events.loaded,event=>mount(event.detail.customers||[]));
  window.addEventListener(cfg.events.saved,event=>{if(event.detail.entity)replaceCustomer(event.detail.entity)});
  window.addEventListener(cfg.events.rollback,event=>rollbackForm(event.detail));
  document.addEventListener('submit',event=>{submit(event).catch(error=>window.fitConnectToast?.(error?.message||'Klant opslaan mislukt.'))},true);
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="customers"]'))mount(store.getSnapshot().customers)},true);
}
async function init(){bind();try{const organizationId=await resolveOrganizationId();await store.load({organizationId})}catch(error){console.error('Customer renderer load blocked',error);mount([]);window.fitConnectToast?.(error?.message||'Klantgegevens konden niet veilig worden geladen.')}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init()},{once:true});else init();
window.FitConnectCustomerRenderer=Object.freeze({init,replaceCustomer,mount,resolveOrganizationId});
})();