(()=>{
  'use strict';
  const registry=window.FitConnectRegistry,business=window.FitConnectBusiness,userService=window.FitConnectUserService;
  if(!registry||!business||!userService)return;
  const defaults=Object.freeze({currency:'EUR',locale:'nl-NL',timezone:'Europe/Amsterdam',taxRates:[21,9,0],logoUrl:null,brandColor:null});
  let settings={...defaults};
  async function load(){const org=business.getOrganization();if(!org)return {...settings};const {data,error}=await userService.getClient().from('organization_settings').select('*').eq('organization_id',org.id).maybeSingle();if(error)throw error;settings={...defaults,...(data?.settings||{})};registry.emit('business:settings-loaded',settings);return {...settings}}
  async function save(changes){const org=business.getOrganization();if(!org)throw new Error('Geen actieve organisatie');settings={...settings,...changes};const payload={organization_id:org.id,settings,updated_at:new Date().toISOString()};const {error}=await userService.getClient().from('organization_settings').upsert(payload,{onConflict:'organization_id'});if(error)throw error;registry.emit('business:settings-updated',settings);return {...settings}}
  const api=Object.freeze({load,save,get:()=>({...settings}),defaults,version:'1.0.0'});registry.register('business.settings',api,{replace:true,meta:{type:'business-service',version:api.version}});window.FitConnectBusinessSettings=api;
})();