(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  const auth=window.FitConnectAuthState;
  const userService=window.FitConnectUserService;
  if(!registry||!userService){console.error('FitConnect Business Core mist vereiste services');return}
  let state=Object.freeze({status:'idle',organization:null,membership:null,user:null,error:null,updatedAt:Date.now()});
  const listeners=new Set();
  const client=()=>userService.getClient();
  function publish(next){state=Object.freeze({...state,...next,updatedAt:Date.now()});listeners.forEach(fn=>{try{fn(state)}catch(e){console.error(e)}});registry.emit('business:context-changed',state);window.dispatchEvent(new CustomEvent('fitconnect:business-context',{detail:state}));return state}
  function subscribe(fn,{immediate=true}={}){if(typeof fn!=='function')throw new TypeError('Listener moet een functie zijn');listeners.add(fn);if(immediate)fn(state);return()=>listeners.delete(fn)}
  async function resolve(user){
    if(!user)return publish({status:'anonymous',organization:null,membership:null,user:null,error:null});
    const supabase=client();if(!supabase)return publish({status:'unavailable',user,error:new Error('Supabase client niet beschikbaar')});
    publish({status:'loading',user,error:null});
    try{
      const {data:membership,error}=await supabase.from('organization_members').select('organization_id,role,status,organizations(*)').eq('user_id',user.id).eq('status','active').order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(error)throw error;
      return publish({status:membership?'ready':'empty',organization:membership?.organizations||null,membership:membership||null,user,error:null});
    }catch(error){return publish({status:'error',organization:null,membership:null,user,error})}
  }
  async function initialize(){const current=auth?.getState?.();await resolve(current?.user||null);auth?.subscribe?.(next=>resolve(next.user||null),{immediate:false});return state}
  function getContext(){return Object.freeze({organizationId:state.organization?.id||null,workspaceId:window.FitConnectWorkspace?.getState?.().workspace?.id||null,userId:state.user?.id||null,role:state.membership?.role||'guest',permissions:window.FitConnectPermissions||null})}
  const api=Object.freeze({initialize,getState:()=>state,getOrganization:()=>state.organization,getMembership:()=>state.membership,getContext,subscribe,refresh:async()=>resolve(auth?.getState?.().user||null),version:'1.0.0'});
  registry.register('business.organization',api,{replace:true,meta:{type:'business-service',version:api.version}});window.FitConnectBusiness=api;
})();