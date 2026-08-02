(()=>{
  'use strict';
  class ProductRepository{
    constructor(client){if(!client)throw new TypeError('Supabase client is verplicht in de ProductRepository.');this.client=client}
    async listProducts(){const {data,error}=await this.client.from('products').select('*').order('created_at',{ascending:false});if(error)throw error;return(data||[]).map(record=>this.mapToDomain(record))}
    async getProduct(id){const {data,error}=await this.client.from('products').select('*').eq('id',id).single();if(error)throw error;return this.mapToDomain(data)}
    async saveProduct(id,domain){const payload=this.mapToDatabase(id,domain);const query=id?this.client.from('products').upsert(payload,{onConflict:'id'}):this.client.from('products').insert(payload);const {data,error}=await query.select().single();if(error)throw error;return this.mapToDomain(data)}
    mapToDomain(record){const freeze=window.FitConnectDeepFreeze||Object.freeze;const specifications=record.specifications&&typeof record.specifications==='object'?record.specifications:{};return freeze({
      id:record.id||null,brand:record.brand||'',model:record.model||'',name:record.name||'',slug:record.slug||'',category:record.category||'',price:Number(record.price||0),vat:Number(record.vat??21),stock:Number(record.stock||0),delivery:record.delivery||'',warranty:record.warranty||'',status:record.status||'draft',shortDescription:record.short_description||'',description:record.description||'',images:Array.isArray(record.images)?[...record.images]:[],featured:Boolean(record.featured),specifications:{...specifications},sku:String(specifications.SKU||record.sku||''),purchasePrice:Number(record.purchase_price||0),createdAt:record.created_at||null,updatedAt:record.updated_at||null
    })}
    mapToDatabase(id,domain){const specifications={...(domain.specifications||{})};if(domain.sku)specifications.SKU=String(domain.sku).trim().toUpperCase();const payload={brand:String(domain.brand||'').trim(),model:String(domain.model||'').trim()||null,name:String(domain.name||'').trim(),slug:String(domain.slug||'').trim(),category:String(domain.category||'').trim(),price:Number(domain.price||0),vat:Number(domain.vat??21),stock:Number(domain.stock||0),delivery:String(domain.delivery||'').trim()||null,warranty:String(domain.warranty||'').trim()||null,status:String(domain.status||'draft'),short_description:String(domain.shortDescription||'').trim()||null,description:String(domain.description||'').trim()||null,images:Array.isArray(domain.images)?domain.images:[],featured:Boolean(domain.featured),specifications,updated_at:domain.updatedAt||new Date().toISOString()};if(id)payload.id=id;return payload}
    async deleteProduct(){throw new Error('Not implemented')}
    async exists(){throw new Error('Not implemented')}
    async count(){throw new Error('Not implemented')}
    async updateStock(){throw new Error('Not implemented')}
  }
  window.ProductRepository=ProductRepository;
})();
