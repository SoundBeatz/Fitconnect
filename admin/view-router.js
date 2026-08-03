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
    if(!item)return false;

    let changed=false;

    if(item.hidden){
      item.hidden=false;
      changed=true;
    }
    if(item.hasAttribute('hidden')){
      item.removeAttribute('hidden');
      changed=true;
    }
    if(item.hasAttribute('aria-disabled')){
      item.removeAttribute('aria-disabled');
      changed=true;
    }
    if(item.style.getPropertyValue('display')){
      item.style.removeProperty('display');
      changed=true;
    }
    if(item.style.getPropertyValue('visibility')){
      item.style.removeProperty('visibility');
      changed=true;
    }

    return changed;
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
        if(view.classList.contains('active')!==active)view.classList.toggle('active',active);
        if(view.hidden===active)view.hidden=!active;
        if(view.getAttribute('aria-hidden')!==String(!active))view.setAttribute('aria-hidden',String(!active));

        if(active){
          if(view.style.getPropertyValue('display'))view.style.removeProperty('display');
        }else if(view.style.getPropertyValue('display')!=='none'||view.style.getPropertyPriority('display')!=='important'){
          view.style.setProperty('display','none','important');
        }
      }

      for(const item of allNavItems()){
        const active=item.dataset.view===targetId;
        if(item.classList.contains('active')!==active)item.classList.toggle('active',active);
        const ariaCurrent=active?'page':'false';
        if(item.getAttribute('aria-current')!==ariaCurrent)item.setAttribute('aria-current',ariaCurrent);
      }

      document.documentElement.dataset.activeCommandCenterView=targetId;
      document.documentElement.dataset.viewRouterReason=reason;

      const studio=document.getElementById('fitConnectDealstudio');
      if(studio){
        const visible=targetId==='combination-deals';
        if(studio.hidden===visible)studio.hidden=!visible;
        if(studio.getAttribute('aria-hidden')!==String(!visible))studio.setAttribute('aria-hidden',String(!visible));
        const expectedDisplay=visible?'block':'none';
        if(studio.style.getPropertyValue('display')!==expectedDisplay||studio.style.getPropertyPriority('display')!=='important'){
          studio.style.setProperty('display',expectedDisplay,'important');
        }
      }
    }finally{
      syncing=false;
    }
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const item=target.closest(navSelector);
    if(!item)return;
    const targetId=item.dataset.view;
    if(!targetId)return;
    setTimeout(()=>activate(targetId,'navigation'),0);
  },true);

  const observer=new MutationObserver(()=>{
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

  window.FitConnectViewRouter={activate,get activeView(){return currentView;},version:'1.0.1'};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
