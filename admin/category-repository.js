(()=>{
  'use strict';
  class CategoryRepository{
    constructor(supabaseClient){if(!supabaseClient)throw new TypeError('Supabase client is verplicht in de CategoryRepository.');this.client=supabaseClient}
    async listCategories(){
      const {data,error}=await this.client.from('commerce_categories').select('id,name,slug,parent_id,type,shop_key,status,display_order').eq('status','active').order('display_order',{ascending:true}).order('name',{ascending:true});
      if(error)throw error;
      const freeze=window.FitConnectDeepFreeze||Object.freeze;
      return(data||[]).map(record=>freeze({id:record.id,name:record.name||'',slug:record.slug||'',parentKey:record.parent_id||null,type:record.type,shopKey:record.shop_key||'fitness',displayOrder:Number(record.display_order??100)}));
    }
    async saveCategory(){throw new Error('Categoriebeheer is centraal; schrijven wordt pas via de categoriebeheer-UI vrijgegeven.')}
    async getCategory(id){const {data,error}=await this.client.from('commerce_categories').select('*').eq('id',id).single();if(error)throw error;return data}
  }
  window.CategoryRepository=CategoryRepository;
})();