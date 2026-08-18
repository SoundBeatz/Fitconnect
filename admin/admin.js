(()=>{
  'use strict';
  const scripts=[
    'order-config.js?v=20260818-order-runtime-v1',
    'order-repository.js?v=20260818-order-runtime-v1',
    'order-service.js?v=20260818-order-runtime-v1',
    'order-store.js?v=20260818-order-runtime-v1',
    'order-factories.js?v=20260818-order-runtime-v1',
    'order-renderer.js?v=20260818-order-runtime-v1',
    'admin-core.js?v=20260818-order-runtime-v1'
  ];
  if(document.readyState==='loading'){
    document.write(scripts.map(src=>`<script src="${src}"><\/script>`).join(''));
    return;
  }
  (async()=>{
    for(const src of scripts){
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`Runtime kon ${src} niet laden`));document.head.appendChild(script)});
    }
  })().catch(error=>console.error('[FitConnect Admin Runtime]',error));
})();