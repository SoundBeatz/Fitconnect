(()=>{
  'use strict';

  const unsafeSelector = '#combinationDealForm,#dealStudioRoot,.combination-deals-editor,main,.content';
  const safeSelector = '#combinationDealForm,#dealStudioRoot,.combination-deals-editor';
  const originalQuerySelector = Document.prototype.querySelector;

  Document.prototype.querySelector = function(selector) {
    return originalQuerySelector.call(this, selector === unsafeSelector ? safeSelector : selector);
  };

  window.__fitConnectDealstudioRouteIsolation = {
    active: true,
    allowedSelector: safeSelector,
    blockedFallbacks: ['main', '.content'],
    installedAt: new Date().toISOString()
  };
})();
