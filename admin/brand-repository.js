(()=>{
  'use strict';
  class BrandRepository{
    constructor(client){if(!client)throw new TypeError('Supabase client is verplicht in de BrandRepository.');this.client=client}
    async listBrands(){const {data,error}=await this.client.from('brands').select('*').order('display_order',{ascending:true}).order('name',{ascending:true});if(error)throw error;return(data||[]).map(record=>this.mapToDomain(record))}
    async getBrand(id){const {data,error}=await this.client.from('brands').select('*').eq('id',id).single();if(error)throw error;return this.mapToDomain(data)}
    async saveBrand(id,domain){const payload=this.mapToDatabase(id,domain);const query=id?this.client.from('brands').upsert(payload,{onConflict:'id'}):this.client.from('brands').insert(payload);const {data,error}=await query.select().single();if(error)throw error;return this.mapToDomain(data)}
    mapToDomain(record){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({id:record.id||null,name:record.name||'',slug:record.slug||'',description:record.description||'',website:record.website||'',address:record.address||'',postalCode:record.postal_code||'',city:record.city||'',country:record.country||'',status:record.status||'draft',featured:Boolean(record.featured),displayOrder:Number(record.display_order??100),logoUrl:record.logo_url||'',createdAt:record.created_at||null,updatedAt:record.updated_at||null})}
    mapToDatabase(id,domain){const payload={name:String(domain.name||'').trim(),slug:String(domain.slug||domain.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),description:String(domain.description||'').trim()||null,website:String(domain.website||'').trim()||null,address:String(domain.address||'').trim()||null,postal_code:String(domain.postalCode||'').trim()||null,city:String(domain.city||'').trim()||null,country:String(domain.country||'').trim()||null,status:String(domain.status||'draft'),featured:Boolean(domain.featured),display_order:Number(domain.displayOrder??100),logo_url:String(domain.logoUrl||'').trim()||null,updated_at:domain.updatedAt||new Date().toISOString()};if(id)payload.id=id;return payload}
    async deleteBrand(){throw new Error('Not implemented')}
    async exists(){throw new Error('Not implemented')}
  }
  window.BrandRepository=BrandRepository;
})();
