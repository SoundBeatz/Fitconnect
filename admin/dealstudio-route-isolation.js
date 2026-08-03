(()=>{
  'use strict';

  const viewSelector='#combination-deals';
  const studioSelector='#fitConnectDealstudio';
  const observerConfig={
    attributes:true,
    attributeFilter:['class','style','hidden']
  };

  let studio=null;
  let observer=null;
  let armed=false;
  let bindAttempts=0;
  const maxBindAttempts=40;

  function getView(){
    return document.querySelector(viewSelector);
  }

  function shouldBeVisible(){
    const activeView=document.documentElement.dataset.activeCommandCenterView;
    if(activeView)return activeView==='combination-deals';
    return Boolean(getView()?.classList.contains('active'));
  }

  function setAttributeIfChanged(element,name,value){
    if(element.getAttribute(name)!==value)element.setAttribute(name,value);
  }

  function setStyleIfChanged(element,name,value,priority='important'){
    if(element.style.getPropertyValue(name)!==value||element.style.getPropertyPriority(name)!==priority){
      element.style.setProperty(name,value,priority);
    }
  }

  function executeSecureSync(reason='manual'){
    if(!studio||!observer)return;

    observer.disconnect();
    try{
      const view=getView();
      if(view&&studio.parentElement!==view)view.appendChild(studio);

      const visible=shouldBeVisible();
      if(visible){
        if(studio.hidden)studio.hidden=false;
        if(studio.hasAttribute('hidden'))studio.removeAttribute('hidden');
        setAttributeIfChanged(studio,'aria-hidden','false');
        setStyleIfChanged(studio,'display','block');
        setStyleIfChanged(studio,'visibility','visible');
        setStyleIfChanged(studio,'pointer-events','auto');
      }else{
        if(!studio.hidden)studio.hidden=true;
        if(!studio.hasAttribute('hidden'))studio.setAttribute('hidden','');
        setAttributeIfChanged(studio,'aria-hidden','true');
        setStyleIfChanged(studio,'display','none');
        setStyleIfChanged(studio,'visibility','hidden');
        setStyleIfChanged(studio,'pointer-events','none');
      }

      studio.dataset.dealstudioOwner='combination-deals';
      studio.dataset.dealstudioLastSync=reason;
    }finally{
      observer.observe(studio,observerConfig);
    }
  }

  function armStudio(){
    if(armed)return true;

    const studios=[...document.querySelectorAll(studioSelector)];
    if(!studios.length)return false;

    studio=studios[0];
    for(const duplicate of studios.slice(1))duplicate.remove();

    observer=new MutationObserver(mutations=>{
      const relevant=mutations.some(mutation=>
        mutation.target===studio&&
        mutation.type==='attributes'&&
        observerConfig.attributeFilter.includes(mutation.attributeName)
      );
      if(relevant)executeSecureSync('container-attribute-change');
    });

    observer.observe(studio,observerConfig);
    armed=true;
    executeSecureSync('bootstrap');
    console.info('[FitConnect v2.5.1] Emergency Disconnect-Guard armed.');
    return true;
  }

  function bindStudioWithBoundedRetry(){
    if(armStudio())return;
    bindAttempts+=1;
    if(bindAttempts<maxBindAttempts)setTimeout(bindStudioWithBoundedRetry,100);
    else console.warn('[FitConnect v2.5.1] Dealstudio container was not created; guard not armed.');
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    if(!target.closest('[data-view]'))return;
    setTimeout(()=>{
      if(!armed)armStudio();
      if(armed)executeSecureSync('navigation');
    },0);
  },true);

  window.addEventListener('hashchange',()=>{
    if(armed)executeSecureSync('hashchange');
  });
  window.addEventListener('pageshow',()=>{
    if(!armed)armStudio();
    if(armed)executeSecureSync('pageshow');
  });

  window.__fitConnectDealstudioRouteIsolation={
    active:true,
    version:'20260803-disconnect-guard-v1.0',
    owner:viewSelector,
    sync:executeSecureSync
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindStudioWithBoundedRetry,{once:true});
  }else{
    bindStudioWithBoundedRetry();
  }
})();
