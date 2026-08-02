(()=>{
  'use strict';

  const viewSelector='main .view[id]';
  const navSelector='[data-view]';
  let currentView='dashboard';
  let syncing=false;

  function allViews(){
    return [...document.querySelectorAll(viewSelector)];
  }

  function allNavItems(){
    return [...document.querySelectorAll(navSelector)];
  }

  function ensureCombinationDealsNavigation(){
    const item=document.querySelector('[data-view="combination-deals"]');
    if(!item)return;
    item.hidden=false;
    item.removeAttribute('hidden');
    item.removeAttribute('aria-disabled');
    item.style.removeProperty('display');
    item.style.removeProperty('visibility');
  }

  function resolveViewId(preferred){
    const requested=String(preferred||'').trim();
    if(requested&&document.getElementById(requested)?.matches('.view'))return requested;
    const activeNav=document.querySelector(`${navSelector}.active`);
    const activeNavView=activeNav?.dataset.view;
    if(activeNavView&&document.getElementById(activeNavView)?.matches('.view'))return activeNavView;
    const activeViews=allViews().filter(view=>view.classList.contains('active'));
    if(activeViews.length===1)return activeViews[0].id;
    return 'dashboard';
  }

  function activate(preferred,reason='manual'){
    if(syncing)return;
    syncing=true;
    try{
      ensureCombinationDealsNavigation();
      const targetId=resolveViewId(preferred);
      currentView=targetId;

      for(const view of allViews()){
        const active=view.id===targetId;
        view.classList.toggle('active',active);
        view.hidden=!active;
        view.setAttribute('aria-hidden',String(!active));
        view.style.setProperty('display',active?'':'none',active?'':'important');
        if(active)view.style.removeProperty('display');
      }

      for(const item of allNavItems()){
        const active=item.dataset.view===targetId;
        item.classList.toggle('active',active);
        item.setAttribute('aria-current',active?'page':'false');
      }

      document.documentElement.dataset.activeCommandCenterView=targetId;
      document.documentElement.dataset.viewRouterReason=reason;

      const studio=document.getElementById('fitConnectDealstudio');
      if(studio){
        const visible=targetId==='combination-deals';
        studio.hidden=!visible;
        studio.setAttribute('aria-hidden',String(!visible));
        studio.style.setProperty('display',visible?'block':'none','important');
      }
    }finally{
      syncing=false;
    }
  }

  document.addEventListener('click',event=>{
    const item=event.target.closest(navSelector);
    if(!item)return;
    const targetId=item.dataset.view;
    if(!targetId)return;
    setTimeout(()=>activate(targetId,'navigation'),0);
  },true);

  const observer=new MutationObserver(records=>{
    if(syncing)return;
    ensureCombinationDealsNavigation();
    const activeViews=allViews().filter(view=>view.classList.contains('active'));
    const targetStillActive=activeViews.length===1&&activeViews[0].id===currentView;
    if(!targetStillActive)activate(currentView,'mutation-repair');
  });

  function start(){
    ensureCombinationDealsNavigation();
    activate(resolveViewId(),'bootstrap');
    observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','hidden','style'],childList:true});
    setTimeout(()=>activate(currentView,'late-bootstrap-250'),250);
    setTimeout(()=>activate(currentView,'late-bootstrap-1500'),1500);
  }

  window.FitConnectViewRouter={activate,get activeView(){return currentView;},version:'1.0.0'};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
