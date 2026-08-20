(()=>{
  'use strict';
  const definitions=[
    'order-config.js?v=20260820-admin-runtime-v2',
    'order-repository.js?v=20260820-admin-runtime-v2',
    'order-service.js?v=20260820-admin-runtime-v2',
    'order-store.js?v=20260820-admin-runtime-v2',
    'order-factories.js?v=20260820-admin-runtime-v2',
    'address-config.js?v=20260820-admin-runtime-v2',
    'address-repository.js?v=20260820-admin-runtime-v2',
    'customer-config.js?v=20260820-admin-runtime-v2',
    'customer-repository.js?v=20260820-admin-runtime-v2',
    'customer-service.js?v=20260820-admin-runtime-v2',
    'customer-store.js?v=20260820-admin-runtime-v2',
    'customer-factories.js?v=20260820-admin-runtime-v2',
    'invoice-config.js?v=20260820-admin-runtime-v2',
    'invoice-repository.js?v=20260820-admin-runtime-v2',
    'invoice-service.js?v=20260820-admin-runtime-v2',
    'invoice-store.js?v=20260820-admin-runtime-v2',
    'invoice-factories.js?v=20260820-admin-runtime-v2',
    'admin-core.js?v=20260820-admin-runtime-v2'
  ];
  const renderers=[
    ['order','order-renderer.js?v=20260820-admin-runtime-v2'],
    ['customer','customer-renderer.js?v=20260820-admin-runtime-v2'],
    ['invoice','invoice-renderer.js?v=20260820-admin-runtime-v2'],
    ['finance','finance-intelligence.js?v=20260820-finance-intelligence-v1']
  ];
  const appendScript=(src,datasetKey=null)=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    if(datasetKey)script.dataset[datasetKey]='true';
    script.onload=resolve;
    script.onerror=()=>reject(new Error(`Runtime kon ${src} niet laden`));
    document.head.appendChild(script);
  });

  if(document.readyState==='loading')document.write(definitions.map(src=>`<script src="${src}"><\/script>`).join(''));
  else (async()=>{for(const src of definitions)await appendScript(src)})().catch(error=>console.error('[FitConnect Admin Runtime]',error));

  function publishCurrentContext(){
    const customers=window.customerStore?.getSnapshot?.().customers||[];
    const products=window.productStore?.getState?.().products||[];
    if(customers.length)window.dispatchEvent(new CustomEvent('fitconnect:customer-loaded',{detail:{customers:[...customers],source:'admin-runtime-bootstrap'}}));
    if(products.length)window.dispatchEvent(new CustomEvent('fitconnect:product-loaded',{detail:{products:[...products],source:'admin-runtime-bootstrap'}}));
  }

  async function loadRenderers(){
    if(window.__fitConnectAdminDomainRenderersLoaded)return;
    window.__fitConnectAdminDomainRenderersLoaded=true;
    try{
      for(const [name,src] of renderers){
        const marker=`fitconnect${name[0].toUpperCase()}${name.slice(1)}Renderer`;
        if(window[`FitConnect${name[0].toUpperCase()}${name.slice(1)}Renderer`]||document.querySelector(`script[data-${marker.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}]`))continue;
        await appendScript(src,marker);
      }
      publishCurrentContext();
      window.setTimeout(publishCurrentContext,0);
    }catch(error){
      window.__fitConnectAdminDomainRenderersLoaded=false;
      console.error('[FitConnect Admin Runtime] Domain renderer kon niet laden',error);
    }
  }

  function activateRenderers(){
    if(!document.documentElement.classList.contains('fc-admin-authorized'))return false;
    loadRenderers();
    return true;
  }
  if(!activateRenderers()){
    const observer=new MutationObserver(()=>{if(activateRenderers())observer.disconnect()});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  }
})();