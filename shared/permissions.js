(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  const authState=window.FitConnectAuthState;
  if(!registry||!authState){console.error('FitConnect Permissions mist vereiste services');return}

  const hierarchy=Object.freeze({guest:0,member:10,staff:20,manager:30,admin:40,owner:50});
  const rolePermissions=Object.freeze({
    guest:['public:read'],
    member:['public:read','account:read','account:update'],
    staff:['public:read','account:read','account:update','customers:read','orders:read'],
    manager:['public:read','account:read','account:update','customers:read','customers:update','orders:read','orders:update','reports:read'],
    admin:['*'],
    owner:['*']
  });

  function normalizeRole(role){const key=String(role||'guest').toLowerCase();return Object.prototype.hasOwnProperty.call(hierarchy,key)?key:'guest'}
  function roleFromState(state=authState.getState()){
    return normalizeRole(state.profile?.role||state.user?.app_metadata?.role||state.user?.user_metadata?.role||(state.user?'member':'guest'));
  }
  function permissionsFor(role){return rolePermissions[normalizeRole(role)]||rolePermissions.guest}
  function can(permission,state=authState.getState()){
    if(!permission)return false;
    const permissions=permissionsFor(roleFromState(state));
    return permissions.includes('*')||permissions.includes(permission);
  }
  function hasRole(required,state=authState.getState()){
    const current=roleFromState(state);return hierarchy[current]>=hierarchy[normalizeRole(required)];
  }
  function requirePermission(permission,state=authState.getState()){
    if(!can(permission,state)){const error=new Error(`Geen toestemming: ${permission}`);error.code='FORBIDDEN';throw error}
    return true;
  }
  function apply(root=document,state=authState.getState()){
    root.querySelectorAll?.('[data-fc-permission]').forEach(element=>{const allowed=can(element.dataset.fcPermission,state);element.hidden=!allowed;element.setAttribute('aria-hidden',String(!allowed))});
    root.querySelectorAll?.('[data-fc-role]').forEach(element=>{const allowed=hasRole(element.dataset.fcRole,state);element.hidden=!allowed;element.setAttribute('aria-hidden',String(!allowed))});
    document.documentElement.dataset.fcRole=roleFromState(state);
  }

  const api=Object.freeze({roleFromState,permissionsFor,can,hasRole,require:requirePermission,apply,hierarchy,version:'1.0.0'});
  registry.register('user.permissions',api,{replace:true,meta:{type:'user-service',version:api.version}});
  window.FitConnectPermissions=api;
  authState.subscribe(state=>apply(document,state));
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)apply(node)}))).observe(document.documentElement,{childList:true,subtree:true});
})();