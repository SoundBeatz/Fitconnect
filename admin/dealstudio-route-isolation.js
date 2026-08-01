(()=>{
  'use strict';

  const legacySelector = '#combinationDealForm,#dealStudioRoot,.combination-deals-editor,main,.content';
  const viewSelector = '#combination-deals';
  const rootId = 'dealStudioRoot';
  const originalQuerySelector = Document.prototype.querySelector;

  function getCombinationDealsView(){
    return originalQuerySelector.call(document, viewSelector);
  }

  function ensureDedicatedRoot(){
    const view = getCombinationDealsView();
    if(!view)return null;

    let root = view.querySelector(`#${rootId}`)
      || view.querySelector('#combinationDealForm')
      || view.querySelector('.combination-deals-editor');

    if(!root){
      root = document.createElement('div');
      root.id = rootId;
      root.className = 'combination-deals-editor';
      root.setAttribute('data-fc-dealstudio-host','true');
      view.appendChild(root);
    }

    return root;
  }

  function isCombinationDealsActive(){
    const view = getCombinationDealsView();
    if(!view)return false;
    return view.classList.contains('active')
      || location.hash === '#combination-deals'
      || document.querySelector('[data-view="combination-deals"].active') !== null;
  }

  function syncVisibility(){
    const studio = document.getElementById('fitConnectDealstudio');
    if(!studio)return;

    const active = isCombinationDealsActive();
    studio.hidden = !active;
    studio.setAttribute('aria-hidden', String(!active));

    if(active){
      const host = ensureDedicatedRoot();
      if(host && studio.parentElement !== host)host.appendChild(studio);
    }
  }

  Document.prototype.querySelector = function(selector){
    if(selector === legacySelector){
      return ensureDedicatedRoot();
    }
    return originalQuerySelector.call(this, selector);
  };

  document.addEventListener('click', event=>{
    const trigger = event.target.closest('[data-view]');
    if(!trigger)return;
    queueMicrotask(syncVisibility);
    setTimeout(syncVisibility, 0);
  }, true);

  window.addEventListener('hashchange', syncVisibility);

  const observer = new MutationObserver(mutations=>{
    if(mutations.some(mutation=>
      mutation.type === 'childList'
      || (mutation.type === 'attributes' && mutation.attributeName === 'class')
    )){
      syncVisibility();
    }
  });

  const start = ()=>{
    ensureDedicatedRoot();
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['class']
    });
    syncVisibility();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, {once:true});
  }else{
    start();
  }

  window.__fitConnectDealstudioRouteIsolation = {
    active:true,
    version:'20260801-2',
    view:viewSelector,
    host:`#${rootId}`,
    blockedFallbacks:['main','.content'],
    sync:syncVisibility
  };
})();
