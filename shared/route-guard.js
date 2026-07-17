(()=>{
  'use strict';
  const registry=window.FitConnectRegistry,auth=window.FitConnectAuthState,permissions=window.FitConnectPermissions;
  if(!registry||!auth){console.error('FitConnect Route Guard mist vereiste services');return}
  const safePath=value=>{try{const url=new URL(value,location.origin);return url.origin===location.origin?`${url.pathname}${url.search}${url.hash}`:'/account/'}catch{return'/account/'}};
  function redirect(path){location.replace(safePath(path))}
  function evaluate(state=auth.getState()){
    const root=document.documentElement;
    const protectedRoute=root.hasAttribute('data-fc-protected')||document.body?.hasAttribute('data-fc-protected');
    const guestOnly=root.hasAttribute('data-fc-guest-only')||document.body?.hasAttribute('data-fc-guest-only');
    if(['initializing','loading'].includes(state.status)){root.dataset.fcRoute='checking';return false}
    if(protectedRoute&&state.status!=='authenticated'){
      const next=encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);redirect(`/login/?next=${next}`);return false;
    }
    if(guestOnly&&state.status==='authenticated'){redirect(new URLSearchParams(location.search).get('next')||'/account/');return false}
    const requiredPermission=root.dataset.fcPermission||document.body?.dataset.fcPermission;
    const requiredRole=root.dataset.fcRoleRequired||document.body?.dataset.fcRoleRequired;
    if(state.status==='authenticated'&&requiredPermission&&!permissions?.can(requiredPermission)){redirect('/403/');return false}
    if(state.status==='authenticated'&&requiredRole&&!permissions?.hasRole(requiredRole)){redirect('/403/');return false}
    root.dataset.fcRoute='ready';document.querySelectorAll('[data-fc-route-content]').forEach(el=>el.hidden=false);registry.emit('route:authorized',{state,path:location.pathname});return true;
  }
  function mount(){document.querySelectorAll('[data-fc-route-content]').forEach(el=>el.hidden=true);return auth.subscribe(evaluate)}
  const api=Object.freeze({evaluate,mount,redirect,safePath,version:'1.0.0'});
  registry.register('user.routeGuard',api,{replace:true,meta:{type:'user-service',version:api.version}});window.FitConnectRouteGuard=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();