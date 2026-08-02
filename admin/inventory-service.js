(()=>{
  'use strict';
  class InventoryServiceError extends Error{constructor({code,operation,productId,message,cause=null}){super(message);this.name='InventoryServiceError';this.code=code;this.operation=operation;this.productId=productId;this.cause=cause;}}
  class InventoryService{
    constructor(repository,{isOnline=()=>typeof navigator==='undefined'?true:navigator.onLine}={}){if(!repository)throw new TypeError('InventoryRepository is verplicht.');this.repository=repository;this.isOnline=isOnline;}
    validate(productId,model){if(!productId)throw new InventoryServiceError({code:'VALIDATION_INVALID_ID',operation:'validate',productId,message:'Product ID is verplicht voor voorraadbeheer.'});const amount=Number(model?.available);if(!Number.isFinite(amount)||amount<0)throw new InventoryServiceError({code:'VALIDATION_INVALID_STOCK',operation:'validate',productId,message:'Voorraad moet een geldig, niet-negatief getal zijn.'});}
    async fetchStock(productId){if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'fetchStock',productId);try{return await this.repository.getStockLevel(productId)}catch(error){throw this.normalizeError(error,'fetchStock',productId)}}
    async mutateStock(productId,model){this.validate(productId,model);if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'mutateStock',productId);try{return await this.repository.saveStockLevel(productId,{...model,available:Number(model.available)})}catch(error){throw this.normalizeError(error,'mutateStock',productId)}}
    normalizeError(error,operation,productId=null){if(error instanceof InventoryServiceError)return error;let code='INVENTORY_UNKNOWN_ERROR',message=error?.message||'Er is een systeemfout opgetreden.';if(error?.message==='Offline'||!this.isOnline()){code='NETWORK_OFFLINE';message='Geen internetverbinding beschikbaar.'}else if(error?.code==='42501'){code='INVENTORY_SAVE_FORBIDDEN';message='U heeft onvoldoende rechten om voorraden te muteren.'}return new InventoryServiceError({code,operation,productId,message,cause:error});}
  }
  window.InventoryServiceError=InventoryServiceError;window.InventoryService=InventoryService;
})();
