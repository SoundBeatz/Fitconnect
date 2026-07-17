(()=>{
  'use strict';
  const registry=window.FitConnectRegistry;
  if(!registry){console.error('FitConnect Profile Model vereist FitConnectRegistry');return}
  const allowed=['display_name','first_name','last_name','phone','avatar_url','locale','timezone','role','company','job_title','bio','marketing_opt_in'];
  const clean=value=>typeof value==='string'?value.trim():value;
  function normalize(input={},user=null){
    const source=input&&typeof input==='object'?input:{};
    const profile={id:source.id||user?.id||null,email:source.email||user?.email||null};
    allowed.forEach(key=>{if(source[key]!==undefined)profile[key]=clean(source[key])});
    profile.display_name=profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.email?.split('@')[0]||'Gebruiker';
    profile.role=String(profile.role||user?.app_metadata?.role||user?.user_metadata?.role||'member').toLowerCase();
    profile.locale=profile.locale||document.documentElement.lang||'nl-NL';
    profile.timezone=profile.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Amsterdam';
    profile.marketing_opt_in=Boolean(profile.marketing_opt_in);
    return Object.freeze(profile);
  }
  function sanitizeChanges(changes={}){const result={};allowed.forEach(key=>{if(changes[key]!==undefined)result[key]=clean(changes[key])});return result}
  function initials(profile){return String(profile?.display_name||profile?.email||'?').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}
  const api=Object.freeze({normalize,sanitizeChanges,initials,fields:Object.freeze([...allowed]),version:'1.0.0'});
  registry.register('user.profileModel',api,{replace:true,meta:{type:'user-service',version:api.version}});window.FitConnectProfileModel=api;
})();