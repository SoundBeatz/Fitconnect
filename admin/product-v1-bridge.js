(()=>{
  'use strict';
  let store=null;
  function init(){if(store)return store;const client=window.getFitConnectSupabase?.();const config=window.FitConnectProductConfig;if(!client||!config||!window.ProductRepository||!window.ProductService||!window.ProductStore)throw new Error('Product FDMP-afhankelijkheden ontbreken.');const repository=new window.ProductRepository(client);const service=new window.ProductService(repository,config);store=new window.ProductStore(service,config);window.FitConnectProductFDMP={repository,service,store,load:()=>store.loadProducts(),save:(id,changes)=>store.updateProduct(id,changes),getState:()=>store.getState()};return store}
  async function bootstrap(){try{const productStore=init();const client=window.getFitConnectSupabase?.();const {data}=await client.auth.getSession();if(data?.session)await productStore.loadProducts()}catch(error){console.warn('Product FDMP foundation kon niet initialiseren',error)}}
  window.FitConnectProductBridge={init,bootstrap};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})();
