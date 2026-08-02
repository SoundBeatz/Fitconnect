(()=>{
  'use strict';

  const viewSelector='#combination-deals';
  const studioSelector='#fitConnectDealstudio';
  let syncing=false;

  function getView(){
    return document.querySelector(viewSelector);
  }

  function isCombinationDealsActive(view){
    return Boolean(view&&view.classList.contains('active'));
  }

  function sync(reason='manual'){
    if(syncing)return;
    syncing=true;
    try{
      const view=getView();
      const studio=document.querySelector(studioSelector);
      if(!view||!studio)return;

      if(studio.parentElement!==view)view.appendChild(studio);

      const active=isCombinationDealsActive(view);
      studio.hidden=!active;
      studio.setAttribute('aria-hidden',String(!active));
      studio.dataset.dealstudioOwner='combination-deals';
      studio.dataset.dealstudioLastSync=reason;
    }finally{
      syncing=false;
    }
  }

  const observer=new MutationObserver(()=>sync('mutation'));

  function start(){
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    sync('bootstrap');
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view]'))setTimeout(()=>sync('navigation'),0);
  },true);

  window.addEventListener('hashchange',()=>sync('hashchange'));
  window.addEventListener('pageshow',()=>sync('pageshow'));

  window.__fitConnectDealstudioRouteIsolation={
    active:true,
    version:'20260802-2',
    owner:viewSelector,
    sync
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
