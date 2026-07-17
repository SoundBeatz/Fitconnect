(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry)return;
  let activeModal=null;
  let returnFocus=null;
  function focusables(root){return [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden)}
  function openModal(target){
    const modal=typeof target==='string'?document.querySelector(target):target;
    if(!modal)return null;
    if(activeModal&&activeModal!==modal)closeModal(activeModal);
    returnFocus=document.activeElement;activeModal=modal;modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('fc-modal-open');
    requestAnimationFrame(()=>focusables(modal)[0]?.focus());registry.emit('modal:open',{modal});return modal;
  }
  function closeModal(target=activeModal){
    const modal=typeof target==='string'?document.querySelector(target):target;if(!modal)return;
    modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('fc-modal-open');activeModal=null;returnFocus?.focus?.();registry.emit('modal:close',{modal});
  }
  document.addEventListener('click',event=>{
    const opener=event.target.closest('[data-fc-modal-open]');if(opener){event.preventDefault();openModal(opener.dataset.fcModalOpen);return}
    const closer=event.target.closest('[data-fc-modal-close],.fc-modal__backdrop');if(closer){event.preventDefault();closeModal(closer.closest('.fc-modal'));}
  });
  document.addEventListener('keydown',event=>{
    if(!activeModal)return;
    if(event.key==='Escape'){closeModal();return}
    if(event.key==='Tab'){
      const items=focusables(activeModal);if(!items.length){event.preventDefault();return}
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
  function region(){let el=document.querySelector('.fc-toast-region');if(!el){el=document.createElement('div');el.className='fc-toast-region';el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','false');document.body.appendChild(el)}return el}
  function toast(message,{title='',type='info',duration=4500}={}){
    const el=document.createElement('div');el.className=`fc-toast fc-toast--${type}`;el.setAttribute('role',type==='danger'?'alert':'status');
    const icon={success:'check',warning:'warning',danger:'error',info:'info'}[type]||'info';
    const iconHtml=window.FitConnectIcons?.render(icon)||'';
    el.innerHTML=`${iconHtml}<div class="fc-toast__content">${title?`<div class="fc-toast__title"></div>`:''}<div class="fc-toast__message"></div></div><button class="fc-toast__close" type="button" aria-label="Sluiten">${window.FitConnectIcons?.render('close')||'×'}</button>`;
    if(title)el.querySelector('.fc-toast__title').textContent=title;el.querySelector('.fc-toast__message').textContent=message;
    const remove=()=>{el.remove();registry.emit('toast:close',{message,type})};el.querySelector('.fc-toast__close').addEventListener('click',remove);region().appendChild(el);if(duration>0)setTimeout(remove,duration);registry.emit('toast:open',{message,title,type});return el;
  }
  const api=Object.freeze({openModal,closeModal,toast,version:'1.0.0'});window.FitConnectOverlays=api;registry.register('design.overlays',api,{meta:{type:'design-service',version:api.version}});
})();