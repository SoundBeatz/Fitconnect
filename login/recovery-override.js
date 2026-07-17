(()=>{
  const button=document.getElementById('forgotPassword');
  const form=document.getElementById('loginForm');
  const message=document.getElementById('message');
  if(!button||!form)return;
  button.addEventListener('click',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const client=window.getFitConnectSupabase?.();
    const email=String(form.elements.email?.value||'').trim();
    if(!email){message.textContent='Vul eerst uw e-mailadres in.';form.elements.email?.focus();return;}
    button.disabled=true;
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password/`});
      if(error)throw error;
      message.textContent='Controleer uw e-mail voor de beveiligde herstel-link.';
      message.classList.add('success');
    }catch(error){message.textContent=error.message||'De herstelmail kon niet worden verzonden.';message.classList.remove('success');}
    finally{button.disabled=false;}
  },true);
})();