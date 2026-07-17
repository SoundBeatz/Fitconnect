(()=>{
  const client=window.getFitConnectSupabase?.();
  const form=document.getElementById('resetForm');
  const status=document.getElementById('status');
  const back=document.getElementById('backToLogin');
  const params=new URLSearchParams(location.search);

  function setStatus(text,ok=false){status.textContent=text;status.classList.toggle('success',ok)}
  async function establishRecoverySession(){
    if(!client)throw new Error('De beveiligde databasekoppeling kon niet worden geladen.');
    const code=params.get('code');
    if(code){
      const {error}=await client.auth.exchangeCodeForSession(code);
      if(error)throw error;
      history.replaceState(null,'',location.pathname);
    }
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(!session)throw new Error('Deze herstel-link is verlopen of ongeldig. Vraag een nieuwe herstelmail aan.');
    sessionStorage.setItem('fitconnect-password-recovery','active');
    form.hidden=false;
    setStatus('Herstel-link gecontroleerd. Kies nu een nieuw wachtwoord.',true);
  }

  client?.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY'){
      sessionStorage.setItem('fitconnect-password-recovery','active');
      form.hidden=false;
      setStatus('Herstel-link gecontroleerd. Kies nu een nieuw wachtwoord.',true);
    }
  });

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button');
    const password=String(form.elements.password.value||'');
    const confirm=String(form.elements.confirmPassword.value||'');
    if(password.length<8){setStatus('Gebruik een wachtwoord van minimaal 8 tekens.');return;}
    if(password!==confirm){setStatus('De twee wachtwoorden zijn niet gelijk.');return;}
    button.disabled=true;button.textContent='Wachtwoord opslaan…';
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session)throw new Error('De herstel-link is verlopen. Vraag een nieuwe herstelmail aan.');
      const {error}=await client.auth.updateUser({password});
      if(error)throw error;
      await client.auth.signOut({scope:'local'});
      sessionStorage.removeItem('fitconnect-password-recovery');
      form.reset();form.hidden=true;back.hidden=false;
      setStatus('Uw wachtwoord is gewijzigd. Log opnieuw in met uw nieuwe wachtwoord.',true);
    }catch(error){setStatus(error.message||'Het wachtwoord kon niet worden gewijzigd.');}
    finally{button.disabled=false;button.textContent='Nieuw wachtwoord opslaan';}
  });

  establishRecoverySession().catch(error=>{form.hidden=true;back.hidden=false;setStatus(error.message||'De herstel-link kon niet worden verwerkt.');});
})();