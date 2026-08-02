(()=>{'use strict';
const freeze=value=>(window.FitConnectDeepFreeze||window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
window.OrderConfig=freeze({
  statuses:freeze(['processing','confirmed','picking','packed','shipped','delivered','cancelled','returned']),
  paymentStatuses:freeze(['created','pending','authorized','paid','failed','cancelled','expired','refunded','partially_refunded']),
  transitions:freeze({processing:freeze(['confirmed','cancelled']),confirmed:freeze(['picking','cancelled']),picking:freeze(['packed','cancelled']),packed:freeze(['shipped','cancelled']),shipped:freeze(['delivered','returned']),delivered:freeze(['returned']),cancelled:freeze([]),returned:freeze([])}),
  fulfillment:freeze({confirmationHours:24,pickingHours:48,shippingHours:72}),
  events:freeze({loading:'fitconnect:order-loading',loaded:'fitconnect:order-loaded',saving:'fitconnect:order-saving',saved:'fitconnect:order-saved',rollback:'fitconnect:order-rollback',failed:'fitconnect:order-failed',changed:'fitconnect:order-changed',fulfillmentPaid:'fitconnect:order-fulfillment-paid'}),
  edgeFunction:'commerce-update-order'
});
})();