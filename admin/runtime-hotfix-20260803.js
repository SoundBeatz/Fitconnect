(()=>{
  'use strict';

  const normalizeCombinationDealsNavigation=()=>{
    const button=document.querySelector('[data-view="combination-deals"]');
    if(!button)return;
    if(button.hidden)button.hidden=false;
    if(button.hasAttribute('hidden'))button.removeAttribute('hidden');
    if(button.getAttribute('aria-disabled')!=='false')button.setAttribute('aria-disabled','false');
    if(button.style.getPropertyValue('display'))button.style.removeProperty('display');
    if(button.style.getPropertyValue('visibility'))button.style.removeProperty('visibility');
  };

  let scheduled=false;
  const scheduleNormalize=()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      normalizeCombinationDealsNavigation();
    });
  };

  const start=()=>{
    normalizeCombinationDealsNavigation();
    const observer=new MutationObserver(records=>{
      const relevant=records.some(record=>{
        const target=record.target;
        return target instanceof Element&&(
          target.matches?.('[data-view="combination-deals"]')||
          target.querySelector?.('[data-view="combination-deals"]')
        );
      });
      if(relevant)scheduleNormalize();
    });
    observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['hidden','style','aria-disabled'],childList:true});
    window.__fitConnectRuntimeHotfix={version:'20260803-1',navigationObserver:'scoped-idempotent'};
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
