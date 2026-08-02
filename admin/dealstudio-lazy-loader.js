(()=>{
  'use strict';

  const dealsViewId='combination-deals';
  let loading=false;

  function ensureNavigation(){
    const button=document.querySelector('[data-view="combination-deals"]');
    if(!button)return;
    button.hidden=false;
    button.removeAttribute('hidden');
    button.style.removeProperty('display');
    button.setAttribute('aria-disabled','false');
  }

  function loadScript(src,key){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-${key}]`);
      if(existing){
        if(existing.dataset.loaded==='true')resolve();
        else existing.addEventListener('load',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.setAttribute(`data-${key}`,'true');
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve();},{once:true});
      script.addEventListener('error',()=>reject(new Error(`Script laden mislukt: ${src}`)),{once:true});
      document.head.appendChild(script);
    });
  }

  async function mountDealstudio(){
    if(loading||document.getElementById('fitConnectDealstudio'))return;
    const view=document.getElementById(dealsViewId);
    if(!view||!view.classList.contains('active'))return;
    loading=true;
    try{
      await loadScript('dealstudio-complete.js?v=20260802-2','fitconnect-dealstudio-complete-lazy');
      window.__fitConnectDealstudioRouteIsolation?.sync?.('lazy-load');
    }catch(error){
      console.error('Dealstudio lazy loader:',error);
      window.fitConnectToast?.('Dealstudio kon niet worden geladen.');
    }finally{
      loading=false;
    }
  }

  function sync(){
    ensureNavigation();
    const view=document.getElementById(dealsViewId);
    const studio=document.getElementById('fitConnectDealstudio');
    const active=Boolean(view?.classList.contains('active'));
    if(active){
      mountDealstudio();
    }else if(studio){
      studio.style.setProperty('display','none','important');
      studio.setAttribute('aria-hidden','true');
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-view="combination-deals"]');
    if(button)setTimeout(sync,0);
  },true);

  const observer=new MutationObserver(sync);
  const start=()=>{
    ensureNavigation();
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
    sync();
  };

  window.__fitConnectDealstudioLazyLoader={version:'1.0',sync,mountDealstudio};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
