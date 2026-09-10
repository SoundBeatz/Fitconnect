(()=>{
  'use strict';

  const Repository=window.StorefrontProductRepository;
  if(!Repository||Repository.prototype.__fitconnectSportMembershipAdapter)return;

  const context={category:'Alle',subcategory:''};
  window.FitConnectStorefrontSportContext=context;
  window.addEventListener('fitconnect:storefront-category-selected',event=>{
    const detail=event.detail||{};
    context.category=detail.category||'Alle';
    context.subcategory=detail.subcategory||'';
  });

  const membershipCache=new WeakMap();
  async function loadMemberships(client){
    if(membershipCache.has(client))return membershipCache.get(client);
    const promise=(async()=>{
      const [{data:memberships,error:membershipError},{data:categories,error:categoryError}]=await Promise.all([
        client.from('commerce_product_categories').select('product_id,category_id,is_primary,display_order').order('display_order',{ascending:true}),
        client.from('commerce_categories').select('id,name,parent_id,type,shop_key,status').eq('shop_key','fitness').eq('status','active')
      ]);
      if(membershipError)throw membershipError;
      if(categoryError)throw categoryError;
      const categoryById=new Map((categories||[]).map(item=>[item.id,item]));
      const byProduct=new Map();
      for(const row of memberships||[]){
        const leaf=categoryById.get(row.category_id);
        if(!leaf)continue;
        const root=leaf.parent_id?categoryById.get(leaf.parent_id):leaf;
        if(!root||root.type!=='main')continue;
        const item=Object.freeze({
          categoryId:leaf.id,
          rootId:root.id,
          rootName:root.name,
          subcategoryName:leaf.parent_id?leaf.name:'',
          isPrimary:Boolean(row.is_primary),
          displayOrder:Number(row.display_order||100)
        });
        if(!byProduct.has(row.product_id))byProduct.set(row.product_id,[]);
        byProduct.get(row.product_id).push(item);
      }
      byProduct.forEach(items=>items.sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||a.displayOrder-b.displayOrder));
      return byProduct;
    })();
    membershipCache.set(client,promise);
    return promise;
  }

  function chooseMembership(items){
    if(!items?.length)return null;
    if(context.category&&context.category!=='Alle'){
      const exact=context.subcategory?items.find(item=>item.rootName===context.category&&item.subcategoryName===context.subcategory):null;
      if(exact)return exact;
      const rootMatch=items.find(item=>item.rootName===context.category);
      if(rootMatch)return rootMatch;
    }
    return items.find(item=>item.isPrimary)||items[0];
  }

  function adaptProduct(product,items){
    if(!items?.length)return product;
    const baseSpecifications={...(product.specifications||{})};
    const adaptedSpecifications={...baseSpecifications};
    Object.defineProperty(adaptedSpecifications,'Subcategorie',{
      enumerable:true,
      get(){return chooseMembership(items)?.subcategoryName||baseSpecifications.Subcategorie||'';}
    });
    const adapted={...product,legacy_category:product.category,sport_categories:Object.freeze([...items]),specifications:adaptedSpecifications};
    Object.defineProperty(adapted,'category',{
      enumerable:true,
      get(){return chooseMembership(items)?.rootName||product.category;}
    });
    return (window.FitConnectDeepFreeze||Object.freeze)(adapted);
  }

  const originalList=Repository.prototype.listPublicProducts;
  Repository.prototype.listPublicProducts=async function(){
    const [products,memberships]=await Promise.all([originalList.call(this),loadMemberships(this.client)]);
    return Object.freeze(products.map(product=>adaptProduct(product,memberships.get(product.id))));
  };

  Repository.prototype.__fitconnectSportMembershipAdapter=true;
})();
