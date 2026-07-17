(()=>{
  'use strict';
  const registry=window.FitConnectRegistry,business=window.FitConnectBusiness,userService=window.FitConnectUserService;
  if(!registry||!business||!userService)return;
  let state=Object.freeze({status:'idle',workspaces:[],workspace:null,error:null,updatedAt:Date.now()});const listeners=new Set();
  function publish(next){state=Object.freeze({...state,...next,updatedAt:Date.now()});listeners.forEach(fn=>fn(state));registry.emit('workspace:changed',state);document.documentElement.dataset.fcWorkspace=state.workspace?.id||'';return state}
  async function load(){const org=business.getOrganization();if(!org)return publish({status:'empty',workspaces:[],workspace:null,error:null});publish({status:'loading'});try{const {data,error}=await userService.getClient().from('workspaces').select('*').eq('organization_id',org.id).eq('active',true).order('name');if(error)throw error;const saved=localStorage.getItem(`fc:workspace:${org.id}`);const selected=(data||[]).find(x=>x.id===saved)||(data||[])[0]||null;return publish({status:'ready',workspaces:data||[],workspace:selected,error:null})}catch(error){return publish({status:'error',error})}}
  function select(id){const workspace=state.workspaces.find(item=>item.id===id);if(!workspace)throw new Error('Workspace niet gevonden');localStorage.setItem(`fc:workspace:${business.getOrganization().id}`,id);return publish({workspace})}
  function subscribe(fn,{immediate=true}={}){listeners.add(fn);if(immediate)fn(state);return()=>listeners.delete(fn)}
  business.subscribe(next=>{if(next.status==='ready'||next.status==='empty')load()},{immediate:false});
  const api=Object.freeze({load,select,getState:()=>state,getCurrent:()=>state.workspace,list:()=>[...state.workspaces],subscribe,version:'1.0.0'});registry.register('business.workspace',api,{replace:true,meta:{type:'business-service',version:api.version}});window.FitConnectWorkspace=api;
})();