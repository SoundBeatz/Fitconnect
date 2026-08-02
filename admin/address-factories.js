(()=>{'use strict';
const selectors=Object.freeze({addressLine1:'[data-address-line1]',addressLine2:'[data-address-line2]',postalCode:'[data-address-postal-code]',city:'[data-address-city]',region:'[data-address-region]',countryCode:'[data-address-country-code]'});
const field=(form,key)=>form.querySelector(selectors[key]);
const AddressFormFactory=Object.freeze({
  populate(form,address,{overwrite=false}={}){if(!form||!address)return;form.dataset.addressCustomerId=address.customerId||'';form.dataset.addressId=address.addressId||'';for(const key of Object.keys(selectors)){const input=field(form,key);if(input&&(overwrite||!input.value))input.value=address[key]||''}},
  serialize(form){if(!form)throw new TypeError('Address form is required');const read=key=>String(field(form,key)?.value??'').trim();return{addressId:form.dataset.addressId||null,customerId:form.dataset.addressCustomerId||null,addressLine1:read('addressLine1'),addressLine2:read('addressLine2'),postalCode:read('postalCode'),city:read('city'),region:read('region'),countryCode:read('countryCode')||window.AddressConfig.defaultCountryCode,type:form.dataset.addressType||'billing'}},
  rollback(form,snapshot){if(snapshot)this.populate(form,snapshot,{overwrite:true})},
  patch(form,address){this.populate(form,address,{overwrite:true})}
});
window.AddressFormFactory=AddressFormFactory;
})();