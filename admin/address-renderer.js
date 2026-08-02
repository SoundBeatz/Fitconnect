(()=>{'use strict';
const cfg=window.AddressConfig;
const store=window.addressStore;
const factory=window.AddressFormFactory;
if(!cfg||!store||!factory)return;
function forms(root=document){return Array.from(root.querySelectorAll('[data-address-customer-id]'))}
function addressFor(form){const list=store.getSnapshot(form.dataset.addressCustomerId);return list[0]||null}
function mount(root=document){forms(root).forEach(form=>{const address=addressFor(form);if(address)factory.populate(form,address)})}
function patchCustomer(customerId){forms().forEach(form=>{if(form.dataset.addressCustomerId!==String(customerId))return;const address=addressFor(form);if(address)factory.patch(form,address)})}
function rollback(customerId,snapshot){forms().forEach(form=>{if(form.dataset.addressCustomerId===String(customerId))factory.rollback(form,snapshot)})}
function onSubmit(event){const form=event.target.closest('[data-address-form]');if(!form)return;const detail=Object.freeze({form,address:factory.serialize(form)});window.dispatchEvent(new CustomEvent('fitconnect:address-submit',{detail}))}
window.addEventListener(cfg.events.loaded,()=>mount());
window.addEventListener(cfg.events.saved,event=>patchCustomer(event.detail&&event.detail.customerId));
window.addEventListener(cfg.events.rollback,event=>rollback(event.detail&&event.detail.customerId,event.detail&&event.detail.snapshot));
document.addEventListener('submit',onSubmit,true);
window.FitConnectAddressRenderer=Object.freeze({mount,patchCustomer});
})();