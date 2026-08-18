(()=>{
  'use strict';
  const definitions=[
    'order-config.js?v=20260818-order-runtime-v1',
    'order-repository.js?v=20260818-order-runtime-v1',
    'order-service.js?v=20260818-order-runtime-v1',
    'order-store.js?v=20260818-order-runtime-v1',
    'order-factories.js?v=20260818-order-runtime-v1',
    'admin-core.js?v=20260818-order-runtime-v1'
  ];
  const renderer='order-renderer.js?v=20260818-order-runtime-v1';
  const appendScript=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`Runtime kon ${src} niet laden`));document.head.appendChild(script)});
  if(document.readyState==='loading')document.write(definitions.map(src=>`<script src="${src}"><\/script>`).join(''));
  else (async()=>{for(const src of definitions)await appendScript(src)})().catch(error=>console.error('[FitConnect Admin Runtime]',error));

  function loadRenderer(){
    if(window.FitConnectOrderRenderer||document.querySelector('script[data-fitconnect-order-renderer]'))return;
    const script=document.createElement('script');script.src=renderer;script.dataset.fitconnectOrderRenderer='true';script.onerror=()=>console.error('[FitConnect Admin Runtime] Order renderer kon niet laden');document.head.appendChild(script);
  }
  function activateRenderer(){if(!document.documentElement.classList.contains('fc-admin-authorized'))return false;loadRenderer();return true}
  if(!activateRenderer()){
    const observer=new MutationObserver(()=>{if(activateRenderer())observer.disconnect()});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  }
})();