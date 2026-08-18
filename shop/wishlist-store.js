(()=>{
  const STORAGE_KEY='fitconnect-wishlist';
  const readLocal=()=>{
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(parsed)?[...new Set(parsed.filter(Boolean))]:[];
    }catch{return []}
  };
  const writeLocal=ids=>localStorage.setItem(STORAGE_KEY,JSON.stringify([...new Set(ids.filter(Boolean))]));

  class WishlistStore{
    constructor(client){this.client=client;this.user=null;this.ids=new Set(readLocal());}
    async init(){
      if(!this.client)return this.snapshot();
      try{
        const {data:{session}}=await this.client.auth.getSession();
        this.user=session?.user||null;
        if(!this.user)return this.snapshot();
        const local=[...this.ids];
        if(local.length){
          const rows=local.map(product_id=>({user_id:this.user.id,product_id}));
          await this.client.from('commerce_wishlist_items').upsert(rows,{onConflict:'user_id,product_id',ignoreDuplicates:true});
        }
        const {data,error}=await this.client.from('commerce_wishlist_items').select('product_id').eq('user_id',this.user.id).order('created_at',{ascending:false});
        if(error)throw error;
        this.ids=new Set((data||[]).map(row=>row.product_id));
        writeLocal([...this.ids]);
      }catch(error){console.warn('Verlanglijst kon niet worden gesynchroniseerd',error)}
      return this.snapshot();
    }
    snapshot(){return [...this.ids]}
    has(productId){return this.ids.has(productId)}
    async add(productId){
      if(!productId)return this.snapshot();
      this.ids.add(productId);writeLocal(this.snapshot());
      if(this.user&&this.client){
        const {error}=await this.client.from('commerce_wishlist_items').upsert({user_id:this.user.id,product_id:productId},{onConflict:'user_id,product_id',ignoreDuplicates:true});
        if(error)throw error;
      }
      window.dispatchEvent(new CustomEvent('fitconnect:wishlist-changed',{detail:{ids:this.snapshot()}}));
      return this.snapshot();
    }
    async remove(productId){
      this.ids.delete(productId);writeLocal(this.snapshot());
      if(this.user&&this.client){
        const {error}=await this.client.from('commerce_wishlist_items').delete().eq('user_id',this.user.id).eq('product_id',productId);
        if(error)throw error;
      }
      window.dispatchEvent(new CustomEvent('fitconnect:wishlist-changed',{detail:{ids:this.snapshot()}}));
      return this.snapshot();
    }
    async toggle(productId){return this.has(productId)?this.remove(productId):this.add(productId)}
  }
  window.FitConnectWishlistStore=WishlistStore;
})();
