(()=>{
  'use strict';
  let initialized=false;
  let pendingStock=null;
  function createStore(){
    if(window.inventoryStore)return window.inventoryStore;
    const client=window.getFitConnectSupabase?.();
    if(!client||!window.InventoryPersistenceAdapter||!window.InventoryRepository||!window.InventoryService||!window.InventoryStore)throw new Error('Inventory FDMP-afhankelijkheden ontbreken.');
    const adapter=new window.InventoryPersistenceAdapter(client);
    const repository=new window.InventoryRepository(adapter);
    const service=new window.InventoryService(repository);
    const store=new window.InventoryStore(service);
    window.inventoryStore=store;window.FitConnectInventoryFDMP={adapter,repository,service,store};return store;
  }
  async function onEditorOpened(event){const id=event.detail?.id,form=event.detail?.form;if(!id||!form)return;try{const aggregated=await window.inventoryStore.loadStock(id);if(form.elements.stock&&aggregated)form.elements.stock.value=aggregated.displayStock}catch(error){console.error('[Inventory Bridge] Voorraad laden mislukt',error)}}
  function captureSubmit(event){const form=event.target;if(form?.id!=='productForm')return;const id=form.elements.id?.value||null;if(!id)return;pendingStock={productId:id,amount:Number(form.elements.stock?.value||0)};}
  async function onProductSaved(event){const savedId=event.detail?.id;if(!pendingStock||String(pendingStock.productId)!==String(savedId))return;const target=pendingStock;pendingStock=null;try{const updated=await window.inventoryStore.updateStock(savedId,target.amount);window.dispatchEvent(new CustomEvent('fitconnect:inventory-mutated',{detail:{productId:savedId,inventory:updated}}))}catch(error){console.error('[Inventory Bridge] Voorraadmutatie mislukt',error);window.fitConnectToast?.(error.message||'Voorraad bijwerken mislukt')}}
  function init(){if(initialized)return;initialized=true;createStore();document.getElementById('productForm')?.addEventListener('submit',captureSubmit,true);window.addEventListener('fitconnect:product-editor-opened',onEditorOpened);window.addEventListener('fitconnect:product-saved',onProductSaved);}
  window.FitConnectInventoryV1Bridge={init};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
