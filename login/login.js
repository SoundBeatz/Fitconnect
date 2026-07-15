const client=window.getFitConnectSupabase?.();
const form=document.getElementById('loginForm');
const message=document.getElementById('message');
const submit=form.querySelector('[type="submit"]');
const providerButtons=[...document.querySelectorAll('[data-provider]')];
const params=new URLSearchParams(location.search);

function setMessage(text,type='error'){
  message.textContent=text;
  message.classList.toggle('success',type==='success');
}
function setBusy(busy,label='Inloggen…'){
  submit.disabled=busy;
  submit.textContent=busy?label:'Inloggen';
  providerButtons.forEach(button=>button.disabled=busy);
}
function showRouteMessage(){
  if(params.get('logout')==='1')setMessage('U bent succesvol uitgelogd. Tot de volgende keer!','success');
  else if(params.get('expired')==='1')setMessage('Uw sessie is verlopen. Log opnieuw in om verder te gaan.');
  else if(params.get('denied')==='1')setMessage('Deze omgeving is niet beschikbaar voor uw account.');
  else if(params.get('login')==='required')setMessage('Log in om deze pagina te bekijken.');
}
async function ensureProfile(user){
  const fullName=user.user_metadata?.full_name||user.user_metadata?.name||'';
  const {data,error}=await client.from('profiles').select('id,role').eq('id',user.id).maybeSingle();
  if(error)throw error;
  if(data)return data;
  const {data:created,error:createError}=await client.from('profiles').insert({id:user.id,full_name:fullName,role:'customer'}).select('id,role').single();
  if(createError)throw createError;
  return created;
}
async function routeUser(user){
  const profile=await ensureProfile(user);
  location.replace(profile.role==='admin'?'../admin/':'../portal/');
}
async function handleExistingSession(){
  if(!client)return;
  const {data:{session}}=await client.auth.getSession();
  if(session?.user&&!params.has('logout')&&!params.has('expired')&&!params.has('denied'))await routeUser(session.user);
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!client){setMessage('De databasekoppeling ontbreekt.');return;}
  setBusy(true);
  setMessage('Bezig met veilig inloggen…','success');
  try{
    const values=new FormData(form);
    const {data,error}=await client.auth.signInWithPassword({email:String(values.get('email')).trim(),password:String(values.get('password'))});
    if(error)throw error;
    await routeUser(data.user);
  }catch(error){setMessage(error.message||'Inloggen mislukt.');setBusy(false)}
});

providerButtons.forEach(button=>button.addEventListener('click',async()=>{
  if(!client){setMessage('De databasekoppeling ontbreekt.');return;}
  const provider=button.dataset.provider;
  setBusy(true,`Verbinden met ${provider}…`);
  setMessage(`U wordt doorgestuurd naar ${provider}.`,'success');
  const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:`${location.origin}/login/`}});
  if(error){setMessage(error.message||`Inloggen met ${provider} mislukt.`);setBusy(false)}
}));

document.getElementById('forgotPassword').addEventListener('click',async()=>{
  if(!client)return;
  const email=String(form.elements.email.value||'').trim();
  if(!email){setMessage('Vul eerst uw e-mailadres in.');form.elements.email.focus();return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/login/?reset=1`});
  if(error)setMessage(error.message);else setMessage('Controleer uw e-mail voor de herstel-link.','success');
});

document.getElementById('createAccount').addEventListener('click',async()=>{
  if(!client)return;
  const email=String(form.elements.email.value||'').trim();
  const password=String(form.elements.password.value||'');
  if(!email||password.length<8){setMessage('Vul een geldig e-mailadres en een wachtwoord van minimaal 8 tekens in.');return;}
  setBusy(true,'Account aanmaken…');
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/login/`}});
  if(error){setMessage(error.message);setBusy(false);return;}
  if(data.user&&!data.session){setMessage('Account aangemaakt. Bevestig uw e-mailadres om verder te gaan.','success');setBusy(false);return;}
  if(data.user)await routeUser(data.user);
});

showRouteMessage();
if(!client)setMessage('De loginmodule kon niet met Supabase verbinden.');else handleExistingSession().catch(error=>setMessage(error.message||'Sessiecontrole mislukt.'));
