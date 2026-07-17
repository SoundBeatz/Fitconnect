(()=>{
  'use strict';
  const registry=window.FitConnectRegistry,userService=window.FitConnectUserService;
  if(!registry||!userService){console.error('FitConnect Auth Callback mist vereiste services');return}
  async function handle(){
    const isCallback=location.pathname.replace(/\/+$/,'')==='/auth/callback';if(!isCallback)return null;
    const client=userService.getClient();if(!client)throw new Error('Authenticatie is niet beschikbaar');
    document.documentElement.dataset.fcAuthCallback='processing';
    const params=new URLSearchParams(location.search);const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const code=params.get('code');const errorDescription=params.get('error_description')||hash.get('error_description');
    if(errorDescription)throw new Error(errorDescription);
    if(code){const {error}=await client.auth.exchangeCodeForSession(code);if(error)throw error}
    else{const accessToken=hash.get('access_token'),refreshToken=hash.get('refresh_token');if(accessToken&&refreshToken){const {error}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw error}}
    await window.FitConnectAuthState?.refresh?.();
    const type=params.get('type')||hash.get('type');const next=params.get('next');
    document.documentElement.dataset.fcAuthCallback='complete';registry.emit('auth:callback-complete',{type});
    location.replace(type==='recovery'?'/reset-password/':window.FitConnectRouteGuard?.safePath(next||'/account/')||'/account/');return true;
  }
  const api=Object.freeze({handle,version:'1.0.0'});registry.register('user.authCallback',api,{replace:true,meta:{type:'user-service',version:api.version}});window.FitConnectAuthCallback=api;
  const run=()=>handle().catch(error=>{console.error('Auth callback mislukt',error);document.documentElement.dataset.fcAuthCallback='error';window.FitConnectAccessibility?.announce(error.message||'Aanmelden is mislukt',{assertive:true});setTimeout(()=>location.replace(`/login/?error=${encodeURIComponent(error.message||'callback')}`),900)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();