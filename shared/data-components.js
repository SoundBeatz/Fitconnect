(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Data Components vereist FitConnectRegistry');return}
  const uid=prefix=>`${prefix}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;

  function mountPagination(root=document){
    root.querySelectorAll?.('[data-fc-pagination],.fc-pagination').forEach(pager=>{
      if(pager.dataset.fcReady==='pagination')return;
      const buttons=[...pager.querySelectorAll('[data-page]')];
      const activate=button=>{
        if(button.disabled)return;
        buttons.forEach(item=>item.removeAttribute('aria-current'));
        button.setAttribute('aria-current','page');
        pager.dataset.current=button.dataset.page;
        registry.emit('pagination:change',{pager,page:Number(button.dataset.page),button});
      };
      buttons.forEach(button=>button.addEventListener('click',()=>activate(button)));
      pager.dataset.fcReady='pagination';
    });
  }

  function mountFilters(root=document){
    root.querySelectorAll?.('[data-fc-filter-bar],.fc-filter-bar').forEach(bar=>{
      if(bar.dataset.fcReady==='filters')return;
      const controls=[...bar.querySelectorAll('input,select')];
      const reset=bar.querySelector('[data-fc-filter-reset]');
      const emit=()=>registry.emit('filters:change',{bar,values:Object.fromEntries(controls.filter(c=>c.name).map(c=>[c.name,c.value]))});
      controls.forEach(control=>control.addEventListener(control.matches('input[type="search"]')?'input':'change',emit));
      reset?.addEventListener('click',()=>{controls.forEach(control=>{if(control.matches('select'))control.selectedIndex=0;else control.value=''});emit()});
      bar.dataset.fcReady='filters';
    });
  }

  let tooltip;
  function ensureTooltip(){
    if(tooltip)return tooltip;
    tooltip=document.createElement('div');tooltip.className='fc-tooltip';tooltip.hidden=true;tooltip.id=uid('fc-tooltip');tooltip.setAttribute('role','tooltip');document.body.appendChild(tooltip);return tooltip;
  }
  function positionFloating(trigger,popup,{gap=8}={}){
    const rect=trigger.getBoundingClientRect();
    popup.style.left=`${Math.min(window.innerWidth-popup.offsetWidth-8,Math.max(8,rect.left+(rect.width-popup.offsetWidth)/2))}px`;
    popup.style.top=`${Math.max(8,rect.top-popup.offsetHeight-gap)}px`;
  }
  function mountTooltips(root=document){
    root.querySelectorAll?.('[data-fc-tooltip]').forEach(trigger=>{
      if(trigger.dataset.fcReady==='tooltip')return;
      const show=()=>{const tip=ensureTooltip();tip.textContent=trigger.dataset.fcTooltip;tip.hidden=false;trigger.setAttribute('aria-describedby',tip.id);requestAnimationFrame(()=>positionFloating(trigger,tip))};
      const hide=()=>{const tip=ensureTooltip();tip.hidden=true;trigger.removeAttribute('aria-describedby')};
      trigger.addEventListener('mouseenter',show);trigger.addEventListener('focus',show);trigger.addEventListener('mouseleave',hide);trigger.addEventListener('blur',hide);trigger.dataset.fcReady='tooltip';
    });
  }

  function mountPopovers(root=document){
    root.querySelectorAll?.('[data-fc-popover-trigger]').forEach(trigger=>{
      if(trigger.dataset.fcReady==='popover')return;
      const target=document.getElementById(trigger.dataset.fcPopoverTrigger);if(!target)return;
      target.classList.add('fc-popover');target.hidden=true;trigger.setAttribute('aria-controls',target.id);trigger.setAttribute('aria-expanded','false');
      const close=()=>{target.hidden=true;trigger.setAttribute('aria-expanded','false')};
      const open=()=>{target.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();target.style.position='fixed';target.style.left=`${Math.min(window.innerWidth-target.offsetWidth-8,Math.max(8,rect.left))}px`;target.style.top=`${Math.min(window.innerHeight-target.offsetHeight-8,rect.bottom+8)}px`;registry.emit('popover:open',{trigger,popover:target})};
      trigger.addEventListener('click',event=>{event.stopPropagation();target.hidden?open():close()});
      target.addEventListener('click',event=>event.stopPropagation());
      document.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!target.hidden){close();trigger.focus()}});trigger.dataset.fcReady='popover';
    });
  }

  function mountProgress(root=document){
    root.querySelectorAll?.('[data-fc-progress],.fc-progress').forEach(progress=>{
      const value=Math.max(0,Math.min(100,Number(progress.dataset.value||progress.getAttribute('aria-valuenow')||0)));
      progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',String(value));progress.style.setProperty('--fc-progress',`${value}%`);
      const output=progress.querySelector('[data-fc-progress-value]');if(output)output.textContent=`${value}%`;
    });
  }

  function mount(root=document){mountPagination(root);mountFilters(root);mountTooltips(root);mountPopovers(root);mountProgress(root)}
  const api={mount,version:'1.0.0'};
  registry.register('design.dataComponents',api,{replace:true,meta:{type:'design-service',version:api.version}});window.FitConnectDataComponents=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)mount(node)}))).observe(document.documentElement,{childList:true,subtree:true});
})();