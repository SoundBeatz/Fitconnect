window.FITCONNECT_SUPABASE={url:'https://lwpiqshyqzsgwejvmbyo.supabase.co',anonKey:'sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj'};
window.getFitConnectSupabase=function(){const c=window.FITCONNECT_SUPABASE;if(!c||c.url.includes('PASTE_')||c.anonKey.includes('PASTE_'))return null;return window.supabase.createClient(c.url,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})};
(()=>{
  document.addEventListener('click',async event=>{
    const button=event.target.closest('#logoutButton,[data-fc-logout]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled=true;
    button.textContent='Uitloggen…';
    try{
      const client=window.getFitConnectSupabase?.();
      if(client)await client.auth.signOut();
    }finally{
      location.replace(`${location.origin}/login/?logout=1`);
    }
  },true);
})();
