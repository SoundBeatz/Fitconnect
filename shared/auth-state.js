(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  const userService=window.FitConnectUserService;
  if(!registry||!userService){console.error('FitConnect Auth State mist vereiste services');return}

  let state=Object.freeze({status:'initializing',session:null,user:null,profile:null,error:null,updatedAt:Date.now()});
  const listeners=new Set();

  function publish(next){
    state=Object.freeze({...state,...next,updatedAt:Date.now()});
    listeners.forEach(listener=>{try{listener(state)}catch(error){console.error('Auth listener fout',error)}});
    registry.emit('auth:state-changed',state);
    window.dispatchEvent(new CustomEvent('fitconnect:auth-state',{detail:state}));
    return state;
  }

  function getState(){return state}
  function subscribe(listener,{immediate=true}={}){
    if(typeof listener!=='function')throw new TypeError('Listener moet een functie zijn');
    listeners.add(listener);if(immediate)listener(state);return()=>listeners.delete(listener);
  }

  async function resolve(session){
    const user=session?.user||null;
    if(!user)return publish({status:'anonymous',session:null,user:null,profile:null,error:null});
    publish({status:'loading',session,user,profile:null,error:null});
    try{
      const profile=await userService.getProfile(user.id);
      return publish({status:'authenticated',session,user,profile,error:null});
    }catch(error){
      return publish({status:'authenticated',session,user,profile:null,error});
    }
  }

  async function initialize(){
    const client=userService.getClient();
    if(!client)return publish({status:'unavailable',error:new Error('Supabase client niet beschikbaar')});
    const {data,error}=await client.auth.getSession();
    if(error)return publish({status:'error',error});
    await resolve(data.session||null);
    const {data:subscription}=client.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>resolve(session))});
    registry.register('user.authSubscription',subscription.subscription,{replace:true,meta:{type:'runtime-service'}});
    return state;
  }

  const api=Object.freeze({initialize,getState,subscribe,refresh:async()=>{const client=userService.getClient();const {data,error}=await client.auth.getSession();if(error)throw error;return resolve(data.session||null)},version:'1.0.0'});
  registry.register('user.authState',api,{replace:true,meta:{type:'user-service',version:api.version}});
  window.FitConnectAuthState=api;
})();