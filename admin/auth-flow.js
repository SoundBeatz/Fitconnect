(()=>{
  const client=window.getFitConnectSupabase?.();
  const centralLogin='../login/';

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
})();
