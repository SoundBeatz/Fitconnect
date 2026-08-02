(()=>{
  const customerFoundationVersion='20260802-customer-renderer-v1.0';
  if(!window.__fitConnectCustomerFoundationBootstrap){
    window.__fitConnectCustomerFoundationBootstrap=true;
    document.write(`<script src="../shared/deep-freeze.js?v=20260802-commerce-release-v1.0"><\/script>`);
    document.write(`<script src="customer-config.js?v=${customerFoundationVersion}"><\/script>`);
    document.write(`<script src="customer-repository.js?v=${customerFoundationVersion}"><\/script>`);
    document.write(`<script src="customer-service.js?v=${customerFoundationVersion}"><\/script>`);
    document.write(`<script src="customer-store.js?v=${customerFoundationVersion}"><\/script>`);
    document.write(`<script src="customer-factories.js?v=${customerFoundationVersion}"><\/script>`);
    document.write(`<script src="customer-renderer.js?v=${customerFoundationVersion}"><\/script>`);
  }

  const client=window.getFitConnectSupabase?.();
  const centralLogin='../login/';
  const customerPortal='../portal/';
  const dedicatedCustomer='service@fit360.nl';
  document.documentElement.classList.add('fc-admin-authorizing');
  function hardHide(element){element.hidden=true;element.setAttribute('aria-hidden','true');element.style.setProperty('display','none','important');element.style.setProperty('visibility','hidden','important');element.style.setProperty('pointer-events','none','important')}
  function ensureCompatibilityTarget(id,tagName='button'){const existing=document.getElementById(id);if(existing){hardHide(existing);return existing}const element=document.createElement(tagName);element.id=id;if(tagName==='button')element.type='button';element.setAttribute('data-fc-compatibility-target','true');element.tabIndex=-1;hardHide(element);(document.body||document.documentElement).appendChild(element);return element}
  function isolateLegacyModuleRegistry(){const visible=document.getElementById('moduleRegistry');if(visible&&!document.getElementById('moduleRegistryCanonical')){visible.id='moduleRegistryCanonical';visible.setAttribute('data-registry-role','canonical')}let sandbox=document.getElementById('moduleRegistry');if(!sandbox){sandbox=document.createElement('div');sandbox.id='moduleRegistry';sandbox.setAttribute('data-registry-role','legacy-sandbox');(document.body||document.documentElement).appendChild(sandbox)}hardHide(sandbox)}
  function establishLegacyDomContract(){ensureCompatibilityTarget('duplicateProduct');isolateLegacyModuleRegistry();window.__fitConnectLegacyDomContract={ready:true,version:'20260802-2',registryIsolation:true,canonicalRegistry:'#moduleRegistryCanonical',legacySandbox:'#moduleRegistry'}}
  establishLegacyDomContract();
  const nativeQuerySelector=document.querySelector.bind(document);
  document.querySelector=function(selector){const result=nativeQuerySelector(selector);if(result)return result;if(selector==='#duplicateProduct')return ensureCompatibilityTarget('duplicateProduct');return null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',establishLegacyDomContract,{once:true});
  async function authorize(){if(!client){location.replace(`${centralLogin}?error=configuration`);return false}try{const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError||!session){location.replace(`${centralLogin}?expired=1`);return false}const email=String(session.user.email||'').trim().toLowerCase();if(email===dedicatedCustomer){location.replace(`${customerPortal}?denied=admin`);return false}const {data:profile,error:profileError}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();if(profileError||profile?.role!=='admin'){location.replace(`${customerPortal}?denied=admin`);return false}document.documentElement.classList.remove('fc-admin-authorizing');document.documentElement.classList.add('fc-admin-authorized');return true}catch(error){console.error('Command Center authorization failed',error);location.replace(`${centralLogin}?error=authorization`);return false}}
  document.addEventListener('click',async event=>{const button=event.target.closest('#logoutButton');if(!button)return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;button.textContent='Uitloggen…';try{if(client)await client.auth.signOut()}finally{location.replace(`${centralLogin}?logout=1`)}},true);
  window.addEventListener('pageshow',async event=>{if(!event.persisted||!client)return;const {data:{session}}=await client.auth.getSession();if(!session)location.replace(`${centralLogin}?expired=1`)});
  authorize();
})();