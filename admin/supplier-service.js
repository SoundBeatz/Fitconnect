(()=>{
  'use strict';
  class SupplierServiceError extends Error{constructor({code,operation,id=null,message,cause=null}){super(message);this.name='SupplierServiceError';this.code=code;this.operation=operation;this.id=id;this.cause=cause}}
  class SupplierService{
    constructor(repository,{isOnline=()=>typeof navigator==='undefined'?true:navigator.onLine,now=()=>new Date()}={}){if(!repository)throw new TypeError('SupplierRepository is verplicht in de SupplierService.');this.repository=repository;this.isOnline=isOnline;this.now=now}
    validate(id,model){const name=String(model.name||'').trim();if(!name||name.length>120)throw new SupplierServiceError({code:'VALIDATION_INVALID_NAME',operation:'validate',id,message:'Leveranciersnaam is verplicht en mag maximaal 120 tekens bevatten.'});const email=String(model.email||'').trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new SupplierServiceError({code:'VALIDATION_INVALID_EMAIL',operation:'validate',id,message:'Contact e-mailadres is ongeldig.'});const website=String(model.website||'').trim();if(website){try{new URL(website)}catch{throw new SupplierServiceError({code:'VALIDATION_INVALID_WEBSITE',operation:'validate',id,message:'Website moet een geldige URL zijn.'})}}}
    async fetchAll(){if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'fetchAll');try{return await this.repository.listSuppliers()}catch(error){throw this.normalizeError(error,'fetchAll')}}
    async save(id,model){this.validate(id,model);if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'save',id);try{return await this.repository.saveSupplier(id,{...model,updatedAt:this.now().toISOString()})}catch(error){throw this.normalizeError(error,'save',id)}}
    normalizeError(error,operation,id=null){if(error instanceof SupplierServiceError)return error;let code='SUPPLIER_UNKNOWN_ERROR',message=error?.message||'Er is een systeemfout opgetreden.';if(error?.message==='Offline'||!this.isOnline()){code='NETWORK_OFFLINE';message='Geen internetverbinding beschikbaar.'}else if(error?.code==='42501'){code='SUPPLIER_SAVE_FORBIDDEN';message='U heeft onvoldoende rechten om leveranciers te beheren.'}return new SupplierServiceError({code,operation,id,message,cause:error})}
  }
  window.SupplierServiceError=SupplierServiceError;
  window.SupplierService=SupplierService;
})();
