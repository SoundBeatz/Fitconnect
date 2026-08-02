(()=>{
  'use strict';
  class SupplierRepository{
    constructor(client){if(!client)throw new TypeError('Supabase client is verplicht in de SupplierRepository.');this.client=client}
    async listSuppliers(){const {data,error}=await this.client.from('suppliers').select('*').order('name',{ascending:true});if(error)throw error;return(data||[]).map(record=>this.mapToDomain(record))}
    async saveSupplier(id,domain){const payload=this.mapToDatabase(id,domain);let query=id?this.client.from('suppliers').update(payload).eq('id',id):this.client.from('suppliers').insert(payload);const {data,error}=await query.select().single();if(error)throw error;return this.mapToDomain(data)}
    mapToDomain(record){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({id:record.id,name:record.name||'',contactName:record.contact_name||'',email:record.email||'',phone:record.phone||'',address:record.address||'',postalCode:record.postal_code||'',city:record.city||'',country:record.country||'',website:record.website||'',notes:record.notes||'',status:record.status||'active',createdAt:record.created_at||null,updatedAt:record.updated_at||null})}
    mapToDatabase(id,domain){const payload={name:String(domain.name||'').trim(),contact_name:String(domain.contactName||'').trim()||null,email:String(domain.email||'').trim()||null,phone:String(domain.phone||'').trim()||null,address:String(domain.address||'').trim()||null,postal_code:String(domain.postalCode||'').trim()||null,city:String(domain.city||'').trim()||null,country:String(domain.country||'').trim()||null,website:String(domain.website||'').trim()||null,notes:String(domain.notes||'').trim()||null,status:String(domain.status||'active'),updated_at:domain.updatedAt||new Date().toISOString()};if(id)payload.id=id;return payload}
    async getSupplier(){throw new Error('Not implemented')}
    async deleteSupplier(){throw new Error('Not implemented')}
  }
  window.SupplierRepository=SupplierRepository;
})();
