(()=>{
  'use strict';
  window.FITCONNECT_SUPABASE={
    url:'https://lwpiqshyqzsgwejvmbyo.supabase.co',
    anonKey:'sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj'
  };

  let client=null;
  window.getFitConnectSupabase=function(){
    const config=window.FITCONNECT_SUPABASE;
    if(!config||!window.supabase||config.url.includes('PASTE_')||config.anonKey.includes('PASTE_'))return null;
    if(client)return client;
    client=window.supabase.createClient(config.url,config.anonKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
      global:{headers:{'x-application-name':'fitconnect-web'}}
    });
    return client;
  };

  // Command Center bootstrap compatibility: auth-flow can run before the
  // canonical customer repository injected by that same parser cycle.
  // This shim exposes only the read-only authorization method required for
  // the initial admin gate. customer-repository.js replaces it afterwards.
  if(!window.CustomerRepository){
    window.CustomerRepository=class CustomerAuthorizationBootstrapRepository{
      constructor(supabaseClient=window.getFitConnectSupabase?.()){
        if(!supabaseClient)throw new Error('CustomerRepository requires Supabase client');
        this.client=supabaseClient;
      }
      async getAuthorizationProfile(userId){
        if(!userId)throw new Error('userId is required');
        const {data,error}=await this.client
          .from('profiles')
          .select('id,full_name,role,organization_id')
          .eq('id',userId)
          .maybeSingle();
        return {profile:data||null,error:error||null};
      }
    };
  }
})();