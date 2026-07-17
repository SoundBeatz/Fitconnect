(()=>{
  'use strict';

  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Advanced Components vereist FitConnectRegistry');return}

  const uid=prefix=>`${prefix}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
  const focusable='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function mountTabs(root=document){
    root.querySelectorAll?.('[data-fc-tabs],.fc-tabs').forEach(group=>{
      if(group.dataset.fcReady==='tabs')return;
      const list=group.querySelector('[role="tablist"],.fc-tabs__list');
      const tabs=[...(list?.querySelectorAll('[role="tab"],.fc-tabs__tab')||[])];
      const panels=[...group.querySelectorAll('[role="tabpanel"],.fc-tabs__panel')];
      if(!list||!tabs.length)return;
      list.setAttribute('role','tablist');
      const activate=(tab,focus=true)=>{
        tabs.forEach(item=>{const selected=item===tab;item.setAttribute('role','tab');item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;const id=item.getAttribute('aria-controls');const panel=id?group.querySelector(`#${CSS.escape(id)}`):panels[tabs.indexOf(item)];if(panel){panel.hidden=!selected;panel.setAttribute('role','tabpanel');if(!panel.id)panel.id=uid('fc-panel');item.setAttribute('aria-controls',panel.id);if(!item.id)item.id=uid('fc-tab');panel.setAttribute('aria-labelledby',item.id)}});if(focus)tab.focus();registry.emit('tabs:change',{group,tab})
      };
      tabs.forEach((tab,index)=>{tab.setAttribute('role','tab');if(!tab.id)tab.id=uid('fc-tab');tab.addEventListener('click',()=>activate(tab,false));tab.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activate(tabs[next])})});
      activate(tabs.find(tab=>tab.getAttribute('aria-selected')==='true')||tabs[0],false);group.dataset.fcReady='tabs';
    });
  }

  function mountAccordions(root=document){
    root.querySelectorAll?.('[data-fc-accordion],.fc-accordion').forEach(group=>{
      if(group.dataset.fcReady==='accordion')return;
      const single=group.dataset.multiple!=='true';
      group.querySelectorAll('.fc-accordion__trigger,[data-fc-accordion-trigger]').forEach(trigger=>{
        const panel=trigger.nextElementSibling;if(!panel)return;
        if(!trigger.id)trigger.id=uid('fc-accordion-trigger');if(!panel.id)panel.id=uid('fc-accordion-panel');
        trigger.setAttribute('aria-controls',panel.id);panel.setAttribute('role','region');panel.setAttribute('aria-labelledby',trigger.id);
        const setOpen=open=>{trigger.setAttribute('aria-expanded',String(open));panel.hidden=!open};
        setOpen(trigger.getAttribute('aria-expanded')==='true');
        trigger.addEventListener('click',()=>{const open=trigger.getAttribute('aria-expanded')!=='true';if(single&&open)group.querySelectorAll('.fc-accordion__trigger,[data-fc-accordion-trigger]').forEach(other=>{if(other!==trigger){other.setAttribute('aria-expanded','false');if(other.nextElementSibling)other.nextElementSibling.hidden=true}});setOpen(open);registry.emit('accordion:change',{group,trigger,open})});
      });group.dataset.fcReady='accordion';
    });
  }

  function mountDropdowns(root=document){
    root.querySelectorAll?.('[data-fc-dropdown],.fc-dropdown').forEach(dropdown=>{
      if(dropdown.dataset.fcReady==='dropdown')return;
      const trigger=dropdown.querySelector('[data-fc-dropdown-trigger],.fc-dropdown__trigger');const menu=dropdown.querySelector('[data-fc-dropdown-menu],.fc-dropdown__menu');if(!trigger||!menu)return;
      if(!menu.id)menu.id=uid('fc-dropdown');trigger.setAttribute('aria-controls',menu.id);trigger.setAttribute('aria-haspopup','menu');menu.setAttribute('role','menu');menu.hidden=true;
      const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
      const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');menu.querySelector(focusable)?.focus()};
      trigger.addEventListener('click',event=>{event.stopPropagation();menu.hidden?open():close()});
      dropdown.addEventListener('keydown',event=>{if(event.key==='Escape'){close();trigger.focus()}if(event.key==='ArrowDown'&&document.activeElement===trigger){event.preventDefault();open()}});
      document.addEventListener('click',event=>{if(!dropdown.contains(event.target))close()});dropdown.dataset.fcReady='dropdown';
    });
  }

  function mountSteppers(root=document){
    root.querySelectorAll?.('[data-fc-stepper],.fc-stepper').forEach(stepper=>{
      if(stepper.dataset.fcReady==='stepper')return;
      const steps=[...stepper.querySelectorAll('.fc-stepper__step,[data-fc-step]')];const current=Math.max(0,Math.min(steps.length-1,Number(stepper.dataset.current||0)));
      steps.forEach((step,index)=>{step.dataset.state=index<current?'complete':index===current?'current':'upcoming';if(index===current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current')});stepper.dataset.fcReady='stepper';
    });
  }

  function mountCommandPalette(){
    let palette=document.querySelector('[data-fc-command-palette],.fc-command-palette');if(!palette||palette.dataset.fcReady==='command')return;
    const input=palette.querySelector('input[type="search"],.fc-command-palette__input');const items=[...palette.querySelectorAll('[data-fc-command],.fc-command-palette__item')];
    const open=()=>{palette.hidden=false;document.body.classList.add('fc-command-open');input?.focus();filter()};const close=()=>{palette.hidden=true;document.body.classList.remove('fc-command-open')};
    const filter=()=>{const query=(input?.value||'').trim().toLowerCase();items.forEach(item=>item.hidden=query&&!item.textContent.toLowerCase().includes(query))};
    input?.addEventListener('input',filter);palette.addEventListener('click',event=>{if(event.target===palette||event.target.closest('[data-fc-command-close]'))close()});
    document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();palette.hidden?open():close()}else if(event.key==='Escape'&&!palette.hidden)close()});
    document.querySelectorAll('[data-fc-command-open]').forEach(button=>button.addEventListener('click',open));palette.dataset.fcReady='command';
    registry.register('design.commandPalette',{open,close,filter},{replace:true,meta:{type:'design-service',version:'1.0.0'}});
  }

  function mount(root=document){mountTabs(root);mountAccordions(root);mountDropdowns(root);mountSteppers(root);mountCommandPalette()}
  const api={mount,version:'1.0.0'};
  registry.register('design.advancedComponents',api,{replace:true,meta:{type:'design-service',version:api.version}});window.FitConnectAdvancedComponents=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});else mount();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)mount(node)}))).observe(document.documentElement,{childList:true,subtree:true});
})();