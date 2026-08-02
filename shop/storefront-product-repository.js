(()=>{
  'use strict';
  const PUBLIC_COLUMNS='id,slug,brand,model,name,category,price,vat,stock,delivery,warranty,short_description,description,images,featured,specifications,created_at';
  const BLOCKED_SPEC_KEYS=new Set(['purchase_price','purchase price','purchaseprice','inkoopprijs','margin','marge','cost_price','cost price','kostprijs','supplier_cost','interne marge']);

  class StorefrontProductRepository{
    constructor(supabaseClient){
      if(!supabaseClient)throw new TypeError('Supabase client is verplicht in StorefrontProductRepository.');
      this.client=supabaseClient;
    }
    async listPublicProducts(){
      const {data,error}=await this.client.from('products').select(PUBLIC_COLUMNS).eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false});
      if(error)throw error;
      return (data||[]).filter(record=>this.categorySlug(record.category)!=='nutrition').map(record=>this.mapToStorefrontDomain(record));
    }
    async getPublicProductBySlug(slug){
      const {data,error}=await this.client.from('products').select(PUBLIC_COLUMNS).eq('slug',slug).eq('status','active').maybeSingle();
      if(error)throw error;
      return data?this.mapToStorefrontDomain(data):null;
    }
    categorySlug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
    sanitizeSpecifications(value){
      if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({});
      const clean={};
      for(const [key,item] of Object.entries(value)){
        const normalized=String(key).trim().toLowerCase().replace(/[_-]+/g,' ');
        if(BLOCKED_SPEC_KEYS.has(normalized))continue;
        clean[key]=item;
      }
      return Object.freeze(clean);
    }
    mapToStorefrontDomain(record){
      const dto={
        id:record.id,
        slug:record.slug||'',
        brand:record.brand||'',
        model:record.model||'',
        name:record.name||'',
        category:record.category||'',
        price:Number(record.price||0),
        vat:Number(record.vat||0),
        stock:Number(record.stock||0),
        delivery:record.delivery||'',
        warranty:record.warranty||'',
        short_description:record.short_description||'',
        description:record.description||'',
        images:Object.freeze(Array.isArray(record.images)?[...record.images]:[]),
        featured:Boolean(record.featured),
        specifications:this.sanitizeSpecifications(record.specifications),
        created_at:record.created_at||null
      };
      const freeze=window.FitConnectDeepFreeze||Object.freeze;
      return freeze(dto);
    }
  }
  window.StorefrontProductRepository=StorefrontProductRepository;
})();
