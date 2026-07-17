(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect User Service vereist FitConnectRegistry');return}

  let client=null;
  function getClient(){
    if(client)return client;
    client=window.getFitConnectSupabase?.()||null;
    return client;
  }

  async function requireClient(){
    const value=getClient();
    if(!value)throw new Error('Supabase client is niet beschikbaar');
    return value;
  }

  async function getCurrentUser(){
    const supabase=await requireClient();
    const {data,error}=await supabase.auth.getUser();
    if(error)throw error;
    return data.user||null;
  }

  async function getProfile(userId){
    if(!userId)return null;
    const supabase=await requireClient();
    const {data,error}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function getCurrentProfile(){
    const user=await getCurrentUser();
    return user?getProfile(user.id):null;
  }

  async function updateProfile(userId,changes){
    if(!userId)throw new TypeError('userId is verplicht');
    if(!changes||typeof changes!=='object')throw new TypeError('Profielwijzigingen zijn verplicht');
    const supabase=await requireClient();
    const payload={...changes,id:userId,updated_at:new Date().toISOString()};
    const {data,error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select().single();
    if(error)throw error;
    registry.emit('user:profile-updated',{userId,profile:data});
    return data;
  }

  const api=Object.freeze({getClient,getCurrentUser,getProfile,getCurrentProfile,updateProfile,version:'1.0.0'});
  registry.register('user.service',api,{replace:true,meta:{type:'user-service',version:api.version}});
  window.FitConnectUserService=api;
})();