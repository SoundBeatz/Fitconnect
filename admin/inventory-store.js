(()=>{
  'use strict';
  class InventoryStore{
    #state;
    constructor(service){if(!service)throw new TypeError('InventoryService is verplicht.');this.service=service;this.#state={warehouseStocks:new Map(),loadingIds:new Set(),savingIds:new Set(),error:null};this.listeners={};}
    subscribeEvent(type,callback){if(!this.listeners[type])this.listeners[type]=new Set();this.listeners[type].add(callback);return()=>this.listeners[type].delete(callback);}
    emitEvent(type,payload){this.listeners[type]?.forEach(callback=>callback(payload));}
    getAggregatedState(productId){const model=this.#state.warehouseStocks.get(productId);if(!model)return null;const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({productId:model.productId,displayStock:model.available,isLocked:model.available<=0,rawModel:model});}
    getState(){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({loading:this.#state.loadingIds.size>0,saving:this.#state.savingIds.size>0,error:this.#state.error});}
    getSnapshot(productId){const model=this.#state.warehouseStocks.get(productId);const freeze=window.FitConnectDeepFreeze||Object.freeze;return model?freeze({...model}):null;}
    async loadStock(productId){if(this.#state.loadingIds.has(productId))return this.getAggregatedState(productId);this.#state.loadingIds.add(productId);this.emitEvent('inventory.loading',{productId});try{const model=await this.service.fetchStock(productId);this.#state.warehouseStocks.set(productId,model);const aggregated=this.getAggregatedState(productId);this.emitEvent('inventory.loaded',{productId,aggregated});return aggregated}catch(error){this.#state.error=error;this.emitEvent('inventory.error',{productId,error});throw error}finally{this.#state.loadingIds.delete(productId);}}
    async updateStock(productId,cleanAmount){if(this.#state.savingIds.has(productId))return this.getSnapshot(productId);this.#state.savingIds.add(productId);this.emitEvent('inventory.saving',{productId});const snapshot=this.getSnapshot(productId);try{const current=snapshot||{available:0,reserved:0,incoming:0,damaged:0,quarantine:0,allocated:0,warehouseId:'wh-central-01'};const updated=await this.service.mutateStock(productId,{...current,available:Number(cleanAmount)});this.#state.warehouseStocks.set(productId,updated);this.emitEvent('inventory.mutated',{productId,aggregated:this.getAggregatedState(productId)});return updated}catch(error){this.#state.error=error;this.emitEvent('inventory.rollback',{productId,snapshot,error});throw error}finally{this.#state.savingIds.delete(productId);}}
  }
  window.InventoryStore=InventoryStore;
})();
