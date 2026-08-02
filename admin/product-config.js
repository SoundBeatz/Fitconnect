(()=>{
  'use strict';
  const freeze=window.FitConnectDeepFreeze||Object.freeze;
  window.FitConnectProductConfig=freeze({
    version:'1.0-product-foundation',
    defaultCurrency:'EUR',
    minPrice:0,
    maxPrice:99999.99,
    maxSkuLength:80,
    maxProductNameLength:160,
    allowedVatRates:new Set([0,9,21]),
    protectedSkus:new Set(['FC-MEMBERSHIP-CORE','FC-SYSTEM-RESERVED']),
    allowedStatuses:new Set(['active','draft','archived']),
    skuPattern:/^[A-Z0-9\-_]+$/i
  });
})();
