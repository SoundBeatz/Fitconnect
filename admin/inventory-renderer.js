(()=>{
  'use strict';
  let inventoryStore=null;
  let initialized=false;
  let pendingMutation=null;

  const InventoryFieldFactory={
    getInput(form){
      if(!form)return null;
      const input=form.querySelector('[data-product-stock], [name="stock"]');
      if(input&&!input.hasAttribute('data-product-stock'))input.setAttribute('data-product-stock','');
      return input;
    },
    populateField(form,aggregatedState){
      const input=this.getInput(form);
      if(!input||!aggregatedState)return;
      input.value=String(aggregatedState.displayStock??0);
      input.disabled=false;
      const badges=form.querySelector('[data-inventory-status-badges]');
      if(badges&&aggregatedState.rawModel){
        const model=aggregatedState.rawModel;
        badges.innerHTML=`<span class="fdmp-badge status-available">Beschikbaar: ${Number(model.available||0)}</span><span class="fdmp-badge status-damaged">Beschadigd: ${Number(model.damaged||0)}</span><span class="fdmp-badge status-quarantine">Quarantaine: ${Number(model.quarantine||0)}</span>`;
      }
    },
    serialize(form){
      const input=this.getInput(form);
      return {available:Number(input?.value||0)};
    },
    updateSavingStatus(form,isSaving){
      const input=this.getInput(form);
      const button=form?.querySelector('[data-action="save-inventory"]');
      if(input)input.disabled=Boolean(isSaving);
      if(button){button.disabled=Boolean(isSaving);button.textContent=isSaving?'Muteren…':'Voorraad bijwerken';}
    },
    rollbackFormUI(form,snapshot){
      const input=this.getInput(form);
      if(input&&snapshot)input.value=String(snapshot.available??0);
    }
  };

  function createStore(){
    if(window.inventoryStore)return window.inventoryStore;
    const client=window.getFitConnectSupabase?.();
    if(!client||!window.InventoryPersistenceAdapter||!window.InventoryRepository||!window.InventoryService||!window.InventoryStore)throw new Error('Inventory FDMP-afhankelijkheden ontbreken.');
    const adapter=new window.InventoryPersistenceAdapter(client);
    const repository=new window.InventoryRepository(adapter);
    const service=new window.InventoryService(repository);
    const store=new window.InventoryStore(service);
    window.inventoryStore=store;
    window.FitConnectInventoryFDMP={adapter,repository,service,store};
    return store;
  }

  function activeForm(productId){
    const form=document.getElementById('productForm');
    return form&&String(form.dataset.productId||form.elements.id?.value||'')===String(productId||'')?form:null;
  }

  function updateProductRow(productId,aggregated){
    const row=document.querySelector(`tr[data-product-row="${CSS.escape(String(productId||''))}"]`);
    if(!row)return;
    const cell=row.querySelector('[data-inventory-cell]');
    if(cell)cell.textContent=String(aggregated?.displayStock??0);
  }

  async function onEditorOpened(event){
    const {id,form}=event.detail||{};
    if(!id||!form)return;
    InventoryFieldFactory.updateSavingStatus(form,true);
    try{await inventoryStore.loadStock(id);}catch(error){window.fitConnectToast?.(error.message||'Voorraad laden mislukt');}
  }

  function captureProductSubmit(event){
    const form=event.target;
    if(form?.id!=='productForm')return;
    pendingMutation={productId:form.elements.id?.value||null,changes:InventoryFieldFactory.serialize(form),form};
  }

  async function onProductSaved(event){
    const savedId=event.detail?.id;
    if(!savedId||!pendingMutation)return;
    const target=pendingMutation;
    pendingMutation=null;
    if(target.productId&&String(target.productId)!==String(savedId))return;
    try{await triggerInventoryMutation(savedId,target.form,target.changes);}catch(_error){}
  }

  async function triggerInventoryMutation(productId,form,preSerialized=null){
    const changes=preSerialized||InventoryFieldFactory.serialize(form);
    try{return await inventoryStore.updateStock(productId,changes.available);}
    catch(error){console.warn(`[FDMP v2] Voorraadmutatie afgewezen voor product ${productId}.`,error);throw error;}
  }

  function bindStoreEvents(){
    inventoryStore.subscribeEvent('inventory.loading',({productId})=>{const form=activeForm(productId);if(form)InventoryFieldFactory.updateSavingStatus(form,true);});
    inventoryStore.subscribeEvent('inventory.loaded',({productId,aggregated})=>{const form=activeForm(productId);if(form)InventoryFieldFactory.populateField(form,aggregated);updateProductRow(productId,aggregated);});
    inventoryStore.subscribeEvent('inventory.saving',({productId})=>{const form=activeForm(productId);if(form)InventoryFieldFactory.updateSavingStatus(form,true);});
    inventoryStore.subscribeEvent('inventory.mutated',({productId,aggregated})=>{
      const form=activeForm(productId);
      if(form){InventoryFieldFactory.populateField(form,aggregated);InventoryFieldFactory.updateSavingStatus(form,false);}
      updateProductRow(productId,aggregated);
      window.dispatchEvent(new CustomEvent('fitconnect:inventory-mutated',{detail:{productId,inventory:aggregated}}));
      window.fitConnectToast?.(`Voorraad bijgewerkt naar ${aggregated.displayStock}.`);
    });
    inventoryStore.subscribeEvent('inventory.rollback',({productId,snapshot,error})=>{
      const form=activeForm(productId);
      if(form){InventoryFieldFactory.rollbackFormUI(form,snapshot);InventoryFieldFactory.updateSavingStatus(form,false);}
      window.fitConnectToast?.(error?.message||'Voorraadmutatie mislukt. UI hersteld.');
    });
    inventoryStore.subscribeEvent('inventory.error',({productId,error})=>{const form=activeForm(productId);if(form)InventoryFieldFactory.updateSavingStatus(form,false);window.fitConnectToast?.(error?.message||'Voorraad laden mislukt');});
  }

  function init(){
    if(initialized)return;
    initialized=true;
    inventoryStore=createStore();
    bindStoreEvents();
    document.getElementById('productForm')?.addEventListener('submit',captureProductSubmit,true);
    window.addEventListener('fitconnect:product-editor-opened',onEditorOpened);
    window.addEventListener('fitconnect:product-saved',onProductSaved);
  }

  window.FitConnectInventoryRenderer={init,triggerInventoryMutation,InventoryFieldFactory};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
