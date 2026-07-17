(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  const userService=window.FitConnectUserService;
  const authState=window.FitConnectAuthState;
  if(!registry||!userService||!authState){console.error('FitConnect Session Manager mist vereiste services');return}

  let initialized=false;
  let refreshTimer=null;

  function clearTimer(){if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null}}
  function schedule(session){
    clearTimer();
    const expiresAt=Number(session?.expires_at||0)*1000;
    if(!expiresAt)return;
    const delay=Math.max(30000,expiresAt-Date.now()-120000);
    refreshTimer=setTimeout(()=>refresh().catch(error=>registry.emit('session:error',{error})),delay);
  }

  async function refresh(){
    const client=userService.getClient();
    if(!client)throw new Error('Supabase client niet beschikbaar');
    const {data,error}=await client.auth.refreshSession();
    if(error)throw error;
    schedule(data.session||null);
    registry.emit('session:refreshed',{session:data.session||null});
    return data.session||null;
  }

  async function signOut({redirect=true}={}){
    clearTimer();
    const client=userService.getClient();
    if(client){const {error}=await client.auth.signOut();if(error)throw error}
    registry.emit('session:signed-out',{});
    if(redirect)location.replace(`${location.origin}/login/?logout=1`);
  }

  async function initialize(){
    if(initialized)return authState.getState();
    initialized=true;
    const state=await authState.initialize();
    schedule(state.session);
    authState.subscribe(next=>schedule(next.session),{immediate:false});
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-fc-logout],#logoutButton');
      if(!button)return;
      event.preventDefault();button.disabled=true;button.setAttribute('aria-busy','true');
      signOut().catch(error=>{button.disabled=false;button.removeAttribute('aria-busy');registry.emit('session:error',{error})});
    },true);
    return state;
  }

  const api=Object.freeze({initialize,refresh,signOut,getSession:()=>authState.getState().session,isAuthenticated:()=>authState.getState().status==='authenticated',version:'1.0.0'});
  registry.register('user.session',api,{replace:true,meta:{type:'user-service',version:api.version}});
  window.FitConnectSessionManager=api;
})();