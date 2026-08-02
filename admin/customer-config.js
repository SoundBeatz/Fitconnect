(()=>{'use strict';
const config=Object.freeze({
  version:'20260802-customer-foundation-v1.0',
  limits:Object.freeze({name:160,email:254,phone:40,companyName:180,addressLine:220,postalCode:24,city:120,countryCode:2,vatNumber:40,kvkNumber:40}),
  fiscal:Object.freeze({defaultCountryCode:'NL',defaultVatRate:21,allowedVatRates:Object.freeze([0,9,21]),snapshotFields:Object.freeze(['billing_address_snapshot','shipping_address_snapshot','customer_snapshot'])}),
  events:Object.freeze({loading:'fitconnect:customer-loading',loaded:'fitconnect:customer-loaded',saved:'fitconnect:customer-saved',failed:'fitconnect:customer-failed',changed:'fitconnect:customer-state-changed'}),
  sources:Object.freeze({profile:'profile',invoiceCustomer:'invoice_customer'})
});
window.CustomerConfig=config;
})();