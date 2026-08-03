(()=>{
  const customerFoundationVersion='20260802-customer-cleanup-v1.0';
  const addressFoundationVersion='20260802-address-renderer-v1.0';
  const invoiceFoundationVersion='20260803-invoice-membership-hotfix-v1.0';
  const orderFoundationVersion='20260802-order-renderer-v1.0';
  const registryFoundationVersion='20260803-registry-stabilization-v1.0';
  if(!window.__fitConnectCustomerFoundationBootstrap){window.__fitConnectCustomerFoundationBootstrap=true;document.write(`<script src="../shared/deep-freeze.js?v=20260802-commerce-release-v1.0"><\/script>`);document.write(`<script src="customer-config.js?v=${customerFoundationVersion}"><\/script>`);document.write(`<script src="customer-repository.js?v=${customerFoundationVersion}"><\/script>`);document.write(`<script src="customer-service.js?v=${customerFoundationVersion}"><\/script>`);document.write(`<script src="customer-store.js?v=${customerFoundationVersion}"><\/script>`);document.write(`<script src="customer-factories.js?v=${customerFoundationVersion}"><\/script>`);document.write(`<script src="customer-renderer.js?v=${customerFoundationVersion}"><\/script>`)}
  if(!window.__fitConnectAddressFoundationBootstrap){window.__fitConnectAddressFoundationBootstrap=true;document.write(`<script src="address-config.js?v=${addressFoundationVersion}"><\/script>`);document.write(`<script src="address-repository.js?v=${addressFoundationVersion}"><\/script>`);document.write(`<script src="address-service.js?v=${addressFoundationVersion}"><\/script>`);document.write(`<script src="address-store.js?v=${addressFoundationVersion}"><\/script>`);document.write(`<script src="address-factories.js?v=${addressFoundationVersion}"><\/script>`);document.write(`<script src="address-renderer.js?v=${addressFoundationVersion}"><\/script>`)}
  if(!window.__fitConnectInvoiceFoundationBootstrap){window.__fitConnectInvoiceFoundationBootstrap=true;document.write(`<script src="invoice-config.js?v=${invoiceFoundationVersion}"><\/script>`);document.write(`<script src="invoice-repository.js?v=${invoiceFoundationVersion}"><\/script>`);document.write(`<script src="invoice-service.js?v=${invoiceFoundationVersion}"><\/script>`);document.write(`<script src="invoice-store.js?v=${invoiceFoundationVersion}"><\/script>`);document.write(`<script src="invoice-factories.js?v=${invoiceFoundationVersion}"><\/script>`);document.write(`<script src="invoice-renderer.js?v=${invoiceFoundationVersion}"><\/script>`)}
  if(!window.__fitConnectOrderFoundationBootstrap){window.__fitConnectOrderFoundationBootstrap=true;document.write(`<script src="order-config.js?v=${orderFoundationVersion}"><\/script>`);document.write(`<script src="order-repository.js?v=${orderFoundationVersion}"><\/script>`);document.write(`<script src="order-service.js?v=${orderFoundationVersion}"><\/script>`);document.write(`<script src="order-store.js?v=${orderFoundationVersion}"><\/script>`);document.write(`<script src="order-factories.js?v=${orderFoundationVersion}"><\/script>`);document.write(`<script src="order-renderer.js?v=${orderFoundationVersion}"><\/script>`)}

  const registryAssets=[
    'registry-config.js',
    'module-registry-repository.js',
    'module-registry-service.js',
    'module-registry-store.js',
    'module-registry-v6.js'
  ];

  function loadFreshScript(file){
    return new Promise((resolve,reject)=>{
      const selector=`script[data-fc-registry-harmonized="${file}"]`;
      const existing=document.querySelector(selector);
      if(existing){resolve(existing);return;}
      const script=document.createElement('script');
      script.src=`${file}?v=${registryFoundationVersion}`;
      script.async=false;
      script.dataset.fcRegistryHarmonized=file;
      script.addEventListener('load',()=>resolve(script),{once:true});
      script.addEventListener('error',()=>reject(new Error(`Registry asset laden mislukt: ${file}`)),{once:true});
      document.head.appendChild(script);
    });
  }

  async function harmonizeRegistryRuntime(){
    if(window.__fitConnectRegistryHarmonizationPromise)return window.__fitConnectRegistryHarmonizationPromise;
    window.__fitConnectRegistryHarmonizationPromise=(async()=>{
      for(const file of registryAssets)await loadFreshScript(file);
      window.__fitConnectRegistryAssetVersion=registryFoundationVersion;
      await window.FitConnectModuleRegistry?.render?.('registry-asset-harmonization');
      console.info(`[FitConnect] Module Registry harmonized: ${registryFoundationVersion}`);
    })().catch(error=>{
      window.__fitConnectRegistryHarmonizationPromise=null;
      console.error('Module Registry harmonization failed',error);
      throw error;
    });
    return window.__fitConnectRegistryHarmonizationPromise;
  }

  const client=window.getFitConnectSupabase?.();const centralLogin='../login/';const customerPortal='../portal/';const dedicatedCustomer='service@fit360.nl';document.documentElement.classList.add('fc-admin-authorizing');
  if(client&&!window.__fitConnectInvoiceLegacyQueryTrace){
    window.__fitConnectInvoiceLegacyQueryTrace=true;
    const originalFrom=client.from;
    client.from=function(table){
      if(table==='organization_members'){
        console.error('[FDMP TRACE] Geïdentificeerde legacy-query op: organization_members');
        console.trace('[FDMP TRACE] Legacy organization_members call stack');
      }
      return originalFrom.apply(this,arguments);
    };
    console.info('[FDMP TRACE] Invoice legacy-query tracer armed.');
  }
  function hardHide(element){element.hidden=true;element.setAttribute('aria-hidden','true');element.style.setProperty('display','none','important');element.style.setProperty('visibility','hidden','important');element.style.setProperty('pointer-events','none','important')}
  function ensureCompatibilityTarget(id,tagName='button'){const existing=document.getElementById(id);if(existing){hardHide(existing);return existing}const element=document.createElement(tagName);element.id=id;if(tagName==='button')element.type='button';element.setAttribute('data-fc-compatibility-target','true');element.tabIndex=-1;hardHide(element);(document.body||document.documentElement).appendChild(element);return element}
  function isolateLegacyModuleRegistry(){const visible=document.getElementById('moduleRegistry');if(visible&&!document.getElementById('moduleRegistryCanonical')){visible.id='moduleRegistryCanonical';visible.setAttribute('data-registry-role','canonical')}let sandbox=document.getElementById('moduleRegistry');if(!sandbox){sandbox=document.createElement('div');sandbox.id='moduleRegistry';sandbox.setAttribute('data-registry-role','legacy-sandbox');(document.body||document.documentElement).appendChild(sandbox)}hardHide(sandbox)}
  function establishLegacyDomContract(){ensureCompatibilityTarget('duplicateProduct');isolateLegacyModuleRegistry();window.__fitConnectLegacyDomContract={ready:true,version:'20260803-1',registryIsolation:true,canonicalRegistry:'#moduleRegistryCanonical',legacySandbox:'#moduleRegistry'}}
  establishLegacyDomContract();const nativeQuerySelector=document.querySelector.bind(document);document.querySelector=function(selector){const result=nativeQuerySelector(selector);if(result)return result;if(selector==='#duplicateProduct')return ensureCompatibilityTarget('duplicateProduct');return null};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',establishLegacyDomContract,{once:true});
  async function authorize(){if(!client){location.replace(`${centralLogin}?error=configuration`);return false}try{const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError||!session){location.replace(`${centralLogin}?expired=1`);return false}const email=String(session.user.email||'').trim().toLowerCase();if(email===dedicatedCustomer){location.replace(`${customerPortal}?denied=admin`);return false}const {profile,error:profileError}=await new window.CustomerRepository(client).getAuthorizationProfile(session.user.id);if(profileError||profile?.role!=='admin'){location.replace(`${customerPortal}?denied=admin`);return false}document.documentElement.classList.remove('fc-admin-authorizing');document.documentElement.classList.add('fc-admin-authorized');return true}catch(error){console.error('Command Center authorization failed',error);location.replace(`${centralLogin}?error=authorization`);return false}}
  document.addEventListener('click',async event=>{const button=event.target.closest('#logoutButton');if(!button)return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;button.textContent='Uitloggen…';try{if(client)await client.auth.signOut()}finally{location.replace(`${centralLogin}?logout=1`)}},true);
  window.addEventListener('pageshow',async event=>{if(!event.persisted||!client)return;const {data:{session}}=await client.auth.getSession();if(!session)location.replace(`${centralLogin}?expired=1`)});
  window.addEventListener('load',()=>{harmonizeRegistryRuntime().catch(error=>window.fitConnectToast?.(error.message||'Module Registry kon niet worden geharmoniseerd.'))},{once:true});
  window.FitConnectRegistryHarmonizer={run:harmonizeRegistryRuntime,version:registryFoundationVersion};
  authorize();
})();