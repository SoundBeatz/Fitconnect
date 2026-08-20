(()=>{
  'use strict';
  window.FITCONNECT_SUPABASE={
    url:'https://lwpiqshyqzsgwejvmbyo.supabase.co',
    anonKey:'sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj'
  };

  let client=null;

  class PublicRestQuery{
    constructor(config,table){this.config=config;this.table=table;this.params=new URLSearchParams();this.single=false;}
    select(columns='*'){this.params.set('select',columns);return this;}
    eq(column,value){this.params.append(column,`eq.${value}`);return this;}
    order(column,{ascending=true}={}){const current=this.params.get('order');const next=`${column}.${ascending?'asc':'desc'}`;this.params.set('order',current?`${current},${next}`:next);return this;}
    maybeSingle(){this.single=true;return this.execute();}
    then(resolve,reject){return this.execute().then(resolve,reject);}
    async execute(){
      try{
        const response=await fetch(`${this.config.url}/rest/v1/${encodeURIComponent(this.table)}?${this.params.toString()}`,{headers:{apikey:this.config.anonKey,Authorization:`Bearer ${this.config.anonKey}`,Accept:this.single?'application/vnd.pgrst.object+json':'application/json','x-application-name':'fitconnect-web'}});
        if(this.single&&response.status===406)return {data:null,error:null};
        const payload=await response.json().catch(()=>null);
        if(!response.ok)return {data:null,error:{message:payload?.message||`HTTP ${response.status}`,details:payload}};
        return {data:payload,error:null};
      }catch(error){return {data:null,error};}
    }
  }

  function createPublicRestClient(config){
    console.warn('FitConnect: supabase-js unavailable, using public REST fallback.');
    return {
      from(table){return new PublicRestQuery(config,table);},
      auth:{async getSession(){return {data:{session:null},error:null};}}
    };
  }

  window.getFitConnectSupabase=function(){
    const config=window.FITCONNECT_SUPABASE;
    if(!config||config.url.includes('PASTE_')||config.anonKey.includes('PASTE_'))return null;
    if(client)return client;
    client=window.supabase?.createClient
      ? window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{headers:{'x-application-name':'fitconnect-web'}}})
      : createPublicRestClient(config);
    return client;
  };

  if(!window.CustomerRepository){
    window.CustomerRepository=class CustomerAuthorizationBootstrapRepository{
      constructor(supabaseClient=window.getFitConnectSupabase?.()){
        if(!supabaseClient)throw new Error('CustomerRepository requires Supabase client');
        this.client=supabaseClient;
      }
      async getAuthorizationProfile(userId){
        if(!userId)throw new Error('userId is required');
        const {data,error}=await this.client.from('profiles').select('id,full_name,role,organization_id').eq('id',userId).maybeSingle();
        return {profile:data||null,error:error||null};
      }
    };
  }
})();
