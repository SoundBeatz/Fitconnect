(()=>{
  'use strict';
  class BrandServiceError extends Error{constructor({code,operation,id=null,message,cause=null}){super(message);this.name='BrandServiceError';this.code=code;this.operation=operation;this.id=id;this.cause=cause}}
  class BrandService{
    constructor(repository,{isOnline=()=>typeof navigator==='undefined'?true:navigator.onLine,now=()=>new Date()}={}){if(!repository)throw new TypeError('BrandRepository is verplicht in de BrandService.');this.repository=repository;this.isOnline=isOnline;this.now=now}
    async validate(id,domain){await this.beforeValidate(id,domain);const name=String(domain?.name||'').trim();if(!name||name.length>120)throw new BrandServiceError({code:'VALIDATION_INVALID_NAME',operation:'validate',id,message:'Merknaam is verplicht en mag maximaal 120 tekens bevatten.'});const status=String(domain?.status||'draft');if(!['active','draft','archived'].includes(status))throw new BrandServiceError({code:'VALIDATION_INVALID_STATUS',operation:'validate',id,message:'Ongeldige merkstatus.'});await this.afterValidate(id,domain)}
    async fetchAll(){if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'fetchAll');await this.beforeLoad();try{const brands=await this.repository.listBrands();await this.afterLoad(brands);return brands}catch(error){throw this.normalizeError(error,'fetchAll')}}
    async save(id,domain){await this.validate(id,domain);if(!this.isOnline())throw this.normalizeError(new Error('Offline'),'save',id);const mutable={...domain,updatedAt:this.now().toISOString()};await this.beforeSave(id,mutable);try{const saved=await this.repository.saveBrand(id,mutable);await this.afterSave(id,saved);return saved}catch(error){throw this.normalizeError(error,'save',id)}}
    async beforeLoad(){} async afterLoad(){} async beforeSave(){} async afterSave(){} async beforeValidate(){} async afterValidate(){}
    normalizeError(error,operation,id=null){if(error instanceof BrandServiceError)return error;let code='BRAND_UNKNOWN_ERROR',message=error?.message||'Er is een systeemfout opgetreden.';if(error?.message==='Offline'||!this.isOnline()){code='NETWORK_OFFLINE';message='Geen internetverbinding beschikbaar.'}else if(error?.code==='42501'){code='BRAND_SAVE_FORBIDDEN';message='U heeft onvoldoende rechten om merken te beheren.'}return new BrandServiceError({code,operation,id,message,cause:error})}
  }
  window.BrandServiceError=BrandServiceError;window.BrandService=BrandService;
})();
