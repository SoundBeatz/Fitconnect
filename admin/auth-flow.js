(()=>{
  const client=window.getFitConnectSupabase?.();
  const centralLogin='../login/';
  const customerPortal='../portal/';
  const dedicatedCustomer='service@fit360.nl';

  document.documentElement.classList.add('fc-admin-authorizing');

  /**
   * Legacy admin.js still binds some controls eagerly while the script is
   * evaluated. A missing optional control must never abort the complete
   * Command Center bootstrap. Keep these compatibility targets in the DOM
   * until the legacy file has been split into feature-specific modules.
   */
  function ensureCompatibilityTarget(id,tagName='button'){
    const existing=document.getElementById(id);
    if(existing)return existing;

    const element=document.createElement(tagName);
    element.id=id;
    if(tagName==='button')element.type='button';
    element.hidden=true;
    element.setAttribute('aria-hidden','true');
    element.setAttribute('data-fc-compatibility-target','true');
    element.tabIndex=-1;
    (document.body||document.documentElement).appendChild(element);
    return element;
  }

  function establishLegacyDomContract(){
    ensureCompatibilityTarget('duplicateProduct');
    window.__fitConnectLegacyDomContract={ready:true,version:'20260727-2'};
  }

  establishLegacyDomContract();

  // Safari can evaluate a cached legacy admin.js after another runtime has
  // replaced part of the product editor DOM. Guarantee the exact selector
  // used by admin.js always resolves to a harmless compatibility control.
  const nativeDocumentQuerySelector=Document.prototype.querySelector;
  Document.prototype.querySelector=function(selector){
    if(selector==='#duplicateProduct'){
      return nativeDocumentQuerySelector.call(this,selector)||ensureCompatibilityTarget('duplicateProduct');
    }
    return nativeDocumentQuerySelector.call(this,selector);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',establishLegacyDomContract,{once:true});
  }

  async function authorize(){
    if(!client){
      location.replace(`${centralLogin}?error=configuration`);
      return false;
    }
    try{
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError||!session){
        location.replace(`${centralLogin}?expired=1`);
        return false;
      }
      const email=String(session.user.email||'').trim().toLowerCase();
      if(email===dedicatedCustomer){
        location.replace(`${customerPortal}?denied=admin`);
        return false;
      }
      const {data:profile,error:profileError}=await client
        .from('profiles')
        .select('role')
        .eq('id',session.user.id)
        .maybeSingle();
      if(profileError||profile?.role!=='admin'){
        location.replace(`${customerPortal}?denied=admin`);
        return false;
      }
      document.documentElement.classList.remove('fc-admin-authorizing');
      document.documentElement.classList.add('fc-admin-authorized');
      return true;
    }catch(error){
      console.error('Command Center authorization failed',error);
      location.replace(`${centralLogin}?error=authorization`);
      return false;
    }
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('#logoutButton');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled=true;
    button.textContent='Uitloggen…';
    try{
      if(client)await client.auth.signOut();
    }finally{
      location.replace(`${centralLogin}?logout=1`);
    }
  },true);

  window.addEventListener('pageshow',async event=>{
    if(!event.persisted||!client)return;
    const {data:{session}}=await client.auth.getSession();
    if(!session)location.replace(`${centralLogin}?expired=1`);
  });

  authorize();
})();