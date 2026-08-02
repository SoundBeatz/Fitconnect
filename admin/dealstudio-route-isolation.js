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

  function setVisible(studio,visible){
    studio.hidden=!visible;
    studio.setAttribute('aria-hidden',String(!visible));
    studio.style.setProperty('display',visible?'':'none','important');
    studio.style.setProperty('visibility',visible?'visible':'hidden','important');
    studio.style.setProperty('pointer-events',visible?'auto':'none','important');
  }

  function sync(reason='manual'){
    if(syncing)return;
    syncing=true;
    try{
      const view=getView();
      const studios=[...document.querySelectorAll(studioSelector)];
      if(!view||!studios.length)return;

      const primary=studios[0];
      for(const duplicate of studios.slice(1))duplicate.remove();
      if(primary.parentElement!==view)view.appendChild(primary);

      const active=isCombinationDealsActive(view);
      setVisible(primary,active);
      primary.dataset.dealstudioOwner='combination-deals';
      primary.dataset.dealstudioLastSync=reason;
    }finally{
      syncing=false;
    }
  }

  const observer=new MutationObserver(()=>sync('mutation'));

  function start(){
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    sync('bootstrap');
    setTimeout(()=>sync('bootstrap-late'),100);
    setTimeout(()=>sync('bootstrap-final'),500);
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view]'))setTimeout(()=>sync('navigation'),0);
  },true);

  window.addEventListener('hashchange',()=>sync('hashchange'));
  window.addEventListener('pageshow',()=>sync('pageshow'));

  window.__fitConnectDealstudioRouteIsolation={
    active:true,
    version:'20260802-3',
    owner:viewSelector,
    sync
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
