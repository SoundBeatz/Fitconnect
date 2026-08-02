(()=>{
  'use strict';
  class CategoryRepository{
    constructor(supabaseClient){if(!supabaseClient)throw new TypeError('Supabase client is verplicht in de CategoryRepository.');this.client=supabaseClient}
    async listCategories(){const{data,error}=await this.client.from('products').select('category,specifications');if(error)throw error;return this.buildCanonicalCategories(data||[])}
    buildCanonicalCategories(records){const freeze=window.FitConnectDeepFreeze||Object.freeze,main=new Map(),subs=new Map();for(const record of records){const mainName=String(record.category||'').trim(),subName=String(record.specifications?.Subcategorie||record.specifications?.subcategory||'').trim();if(!mainName)continue;const mainSlug=this.generateSlug(mainName);if(!main.has(mainSlug))main.set(mainSlug,freeze({id:mainSlug,name:mainName,slug:mainSlug,parentKey:null,type:'main'}));if(subName){const subSlug=this.generateSlug(subName),id=`${mainSlug}:${subSlug}`;if(!subs.has(id))subs.set(id,freeze({id,name:subName,slug:subSlug,parentKey:mainSlug,type:'sub'}))}}return[...main.values(),...subs.values()]}
    generateSlug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
    async saveCategory(){throw new Error('Schrijven naar Categories is geblokkeerd tot de SQL-migratiefase.')}
    async getCategory(){throw new Error('Not implemented')}
  }
  window.CategoryRepository=CategoryRepository;
})();