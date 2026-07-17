(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Accessibility vereist FitConnectRegistry');return}

  let liveRegion;
  function ensureLiveRegion(){
    if(liveRegion)return liveRegion;
    liveRegion=document.createElement('div');
    liveRegion.className='fc-sr-only fc-live-region';
    liveRegion.setAttribute('aria-live','polite');
    liveRegion.setAttribute('aria-atomic','true');
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  function announce(message,{assertive=false}={}){
    const region=ensureLiveRegion();
    region.setAttribute('aria-live',assertive?'assertive':'polite');
    region.textContent='';
    requestAnimationFrame(()=>{region.textContent=String(message||'')});
  }

  function enhance(root=document){
    root.querySelectorAll?.('button:not([type])').forEach(button=>button.type='button');
    root.querySelectorAll?.('img:not([alt])').forEach(image=>image.setAttribute('alt',''));
    root.querySelectorAll?.('[role="button"]:not([tabindex])').forEach(element=>element.tabIndex=0);
    root.querySelectorAll?.('button,a,[role="button"],[role="tab"],[role="menuitem"]').forEach(element=>element.classList.add('fc-touch-target'));
    const main=document.querySelector('main');
    if(main&&!main.id)main.id='main-content';
    if(main&&!document.querySelector('.fc-skip-link')){
      const link=document.createElement('a');link.className='fc-skip-link';link.href=`#${main.id}`;link.textContent='Ga naar hoofdinhoud';document.body.prepend(link);
    }
  }

  function audit(root=document){
    const issues=[];
    root.querySelectorAll?.('img:not([alt])').forEach(element=>issues.push({code:'image-alt',element,message:'Afbeelding mist alt-attribuut'}));
    root.querySelectorAll?.('button:not([aria-label])').forEach(element=>{if(!element.textContent.trim()&&!element.querySelector('[data-fc-icon]'))issues.push({code:'button-name',element,message:'Knop mist toegankelijke naam'})});
    root.querySelectorAll?.('input,select,textarea').forEach(element=>{if(!element.id||!root.querySelector(`label[for="${CSS.escape(element.id)}"]`)){if(!element.getAttribute('aria-label')&&!element.getAttribute('aria-labelledby'))issues.push({code:'field-label',element,message:'Formulierveld mist label'})}});
    root.querySelectorAll?.('[id]').forEach(element=>{if(root.querySelectorAll(`#${CSS.escape(element.id)}`).length>1)issues.push({code:'duplicate-id',element,message:`Dubbel id: ${element.id}`})});
    registry.emit('accessibility:audit',{root,issues});
    return issues;
  }

  const api={announce,enhance,audit,version:'1.0.0'};
  registry.register('design.accessibility',api,{replace:true,meta:{type:'design-service',version:api.version}});
  window.FitConnectAccessibility=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>enhance(),{once:true});else enhance();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)enhance(node)}))).observe(document.documentElement,{childList:true,subtree:true});
})();