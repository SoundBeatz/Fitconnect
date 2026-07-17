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
})();