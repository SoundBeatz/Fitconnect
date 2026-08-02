(()=>{
  'use strict';
  const freeze=value=>(window.FitConnectDeepFreeze||Object.freeze)(value);
  class StorefrontBrandRepository{
    constructor(client){if(!client)throw new TypeError('Supabase client is verplicht.');this.client=client;}
    async listPublicBrands(){const {data,error}=await this.client.from('v_storefront_brands').select('id,name,slug,logo_url').order('name',{ascending:true});if(error)throw error;return (data||[]).map(record=>freeze({id:record.id,name:String(record.name||''),slug:String(record.slug||''),logoUrl:record.logo_url||null}));}
  }
  class StorefrontInventoryRepository{
    constructor(client){if(!client)throw new TypeError('Supabase client is verplicht.');this.client=client;}
    async getPublicStock(productId){const {data,error}=await this.client.from('v_storefront_inventory').select('product_id,stock_quantity,status').eq('product_id',productId).maybeSingle();if(error)throw error;return freeze({productId:String(data?.product_id||productId),rawQuantity:Math.max(0,Number(data?.stock_quantity||0)),isProductActive:data?.status==='active'});}
  }
  window.StorefrontBrandRepository=StorefrontBrandRepository;
  window.StorefrontInventoryRepository=StorefrontInventoryRepository;
})();
