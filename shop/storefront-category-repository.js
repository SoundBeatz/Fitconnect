class StorefrontCategoryRepository{
  constructor(productRepository){if(!productRepository)throw new TypeError('StorefrontProductRepository is verplicht.');this.productRepository=productRepository;this.client=productRepository.client||window.getFitConnectSupabase?.()}
  slug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  async listCategories(){
    if(this.client){
      const {data,error}=await this.client.from('commerce_categories').select('id,name,slug,parent_id,type,shop_key,status,display_order').eq('shop_key','fitness').eq('status','active').order('display_order',{ascending:true}).order('name',{ascending:true});
      if(!error&&Array.isArray(data)&&data.length){
        const sportRoots=new Set(['functional-training','strength-training','combat-sports','crossfit','hyrox','pilates','cardio-sport','supplements']);
        const sportTree=data.filter(item=>sportRoots.has(item.id)||sportRoots.has(item.parent_id)).map(item=>({id:item.id,name:item.name,slug:item.slug,parentKey:item.parent_id,type:item.type,displayOrder:item.display_order||0}));
        if(sportTree.length)return sportTree.map(item=>window.FitConnectDeepFreeze(item));
      }
    }
    const products=await this.productRepository.listPublicProducts(),mains=new Map(),subs=new Map();
    for(const product of products){const main=String(product.category||product.specifications?.Categorie||'').trim(),sub=String(product.specifications?.Subcategorie||'').trim();if(!main)continue;const mainSlug=this.slug(main);if(mainSlug==='nutrition')continue;if(!mains.has(mainSlug))mains.set(mainSlug,{id:mainSlug,name:main,slug:mainSlug,parentKey:null,type:'main'});if(sub){const subSlug=this.slug(sub),id=`${mainSlug}:${subSlug}`;if(!subs.has(id))subs.set(id,{id,name:sub,slug:subSlug,parentKey:mainSlug,type:'sub'})}}
    return [...mains.values(),...subs.values()].map(item=>window.FitConnectDeepFreeze(item));
  }
}
window.StorefrontCategoryRepository=StorefrontCategoryRepository;