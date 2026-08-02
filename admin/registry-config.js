(()=>{
  'use strict';

  const freeze=window.FitConnectDeepFreeze||Object.freeze;
  window.FitConnectRegistryConfig=freeze({
    version:'1.0-fdmp-foundation',
    defaultSurfaceStyle:'light',
    defaultAccentColor:'#f36f21',
    maxModuleNameLength:120,
    routePattern:/^(?:\.?\.?\/|\/)?[a-zA-Z0-9._\-\/]*$/,
    allowedSurfaceStyles:new Set(['light','dark','natural','premium']),
    mandatoryModules:new Set(['commerce','combination_deals','nutrition','rewards']),
    functionalAliases:{
      'commerce.combination_deals':'combination_deals',
      'commerce_combination_deals':'combination_deals',
      'combination-deals':'combination_deals',
      'combination.deals':'combination_deals',
      'combinationdeals':'combination_deals',
      'combination_deals_v2':'combination_deals',
      'dealstudio':'combination_deals',
      'dealstudio_runtime':'combination_deals'
    },
    protectedKeys:new Set(['core_auth','billing_central','module_registry']),
    reservedKeys:new Set(['admin','root','system_config'])
  });
})();
