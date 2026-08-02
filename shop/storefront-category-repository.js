class StorefrontCategoryRepository{
  constructor(productRepository){if(!productRepository)throw new TypeError('StorefrontProductRepository is verplicht.');this.productRepository=productRepository}
  slug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  async listCategories(){const products=await this.productRepository.listPublicProducts(),mains=new Map(),subs=new Map();for(const product of products){const main=String(product.category||product.specifications?.Categorie||'').trim(),sub=String(product.specifications?.Subcategorie||'').trim();if(!main)continue;const mainSlug=this.slug(main);if(mainSlug==='nutrition')continue;if(!mains.has(mainSlug))mains.set(mainSlug,{id:mainSlug,name:main,slug:mainSlug,parentKey:null,type:'main'});if(sub){const subSlug=this.slug(sub),id=`${mainSlug}:${subSlug}`;if(!subs.has(id))subs.set(id,{id,name:sub,slug:subSlug,parentKey:mainSlug,type:'sub'})}}
    return [...mains.values(),...subs.values()].map(item=>window.FitConnectDeepFreeze(item));
  }
}
window.StorefrontCategoryRepository=StorefrontCategoryRepository;