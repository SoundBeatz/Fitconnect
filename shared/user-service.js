(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect User Service vereist FitConnectRegistry');return}
  let client=null;
  function getClient(){if(client)return client;client=window.getFitConnectSupabase?.()||null;return client}
  async function requireClient(){const value=getClient();if(!value)throw new Error('Supabase client is niet beschikbaar');return value}
  async function getCurrentUser(){const supabase=await requireClient();const {data,error}=await supabase.auth.getUser();if(error)throw error;return data.user||null}
  async function getProfile(userId,{normalize=true}={}){if(!userId)return null;const supabase=await requireClient();const {data,error}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();if(error)throw error;if(!data)return null;return normalize&&window.FitConnectProfileModel?window.FitConnectProfileModel.normalize(data):data}
  async function getCurrentProfile(options){const user=await getCurrentUser();if(!user)return null;const profile=await getProfile(user.id,options);return profile||(window.FitConnectProfileModel?.normalize(user.user_metadata||{},user)||null)}
  async function updateProfile(userId,changes){if(!userId)throw new TypeError('userId is verplicht');if(!changes||typeof changes!=='object')throw new TypeError('Profielwijzigingen zijn verplicht');const supabase=await requireClient();const sanitized=window.FitConnectProfileModel?.sanitizeChanges(changes)||changes;const payload={...sanitized,id:userId,updated_at:new Date().toISOString()};const {data,error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;const profile=window.FitConnectProfileModel?.normalize(data)||data;registry.emit('user:profile-updated',{userId,profile});return profile}
  async function ensureProfile(user){const current=user||await getCurrentUser();if(!current)return null;const existing=await getProfile(current.id);if(existing)return existing;return updateProfile(current.id,window.FitConnectProfileModel?.sanitizeChanges(current.user_metadata||{})||{})}
  const api=Object.freeze({getClient,getCurrentUser,getProfile,getCurrentProfile,updateProfile,ensureProfile,version:'1.1.0'});
  registry.register('user.service',api,{replace:true,meta:{type:'user-service',version:api.version}});window.FitConnectUserService=api;
})();