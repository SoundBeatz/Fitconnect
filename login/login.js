const client=window.getFitConnectSupabase?.();
const form=document.getElementById('loginForm');
const message=document.getElementById('message');
const submit=form.querySelector('[type="submit"]');
const providerButtons=[...document.querySelectorAll('[data-provider]')];
const params=new URLSearchParams(location.search);
let mode=params.get('mode')==='register'?'register':'login';

function setMessage(text,type='error'){
  message.textContent=text;
  message.classList.toggle('success',type==='success');
}
function setBusy(busy,label){
  submit.disabled=busy;
  submit.textContent=busy?(label||'Bezig…'):(mode==='register'?'Account aanmaken':'Inloggen');
  providerButtons.forEach(button=>button.disabled=busy);
}
function setMode(nextMode){
  mode=nextMode==='register'?'register':'login';
  document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  document.querySelectorAll('.register-only').forEach(el=>el.hidden=mode!=='register');
  document.querySelectorAll('.login-only').forEach(el=>el.hidden=mode!=='login');
  document.getElementById('cardEyebrow').textContent=mode==='register'?'Nieuw klantaccount':'Beveiligd inloggen';
  document.getElementById('loginTitle').textContent=mode==='register'?'Maak uw account aan':'Welkom terug';
  form.elements.password.autocomplete=mode==='register'?'new-password':'current-password';
  form.elements.fullName.required=mode==='register';
  form.elements.confirmPassword.required=mode==='register';
  form.elements.terms.required=mode==='register';
  submit.textContent=mode==='register'?'Account aanmaken':'Inloggen';
  setMessage('');
  history.replaceState(null,'',mode==='register'?'?mode=register':'./');
}
function showRouteMessage(){
  if(params.get('logout')==='1')setMessage('U bent succesvol uitgelogd. Tot de volgende keer!','success');
  else if(params.get('expired')==='1')setMessage('Uw sessie is verlopen. Log opnieuw in om verder te gaan.');
  else if(params.get('denied')==='1')setMessage('Deze omgeving is niet beschikbaar voor uw account.');
  else if(params.get('login')==='required')setMessage('Log in om deze pagina te bekijken.');
}
async function ensureProfile(user,details={}){
  const fullName=details.fullName||user.user_metadata?.full_name||user.user_metadata?.name||'';
  const phone=details.phone||user.phone||null;
  const {data,error}=await client.from('profiles').select('id,role').eq('id',user.id).maybeSingle();
  if(error)throw error;
  if(data)return data;
  const {data:created,error:createError}=await client.from('profiles').insert({id:user.id,full_name:fullName,phone,role:'customer'}).select('id,role').single();
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
  const values=new FormData(form);
  const email=String(values.get('email')||'').trim();
  const password=String(values.get('password')||'');
  try{
    if(mode==='register'){
      const fullName=String(values.get('fullName')||'').trim();
      const phone=String(values.get('phone')||'').trim();
      const confirmPassword=String(values.get('confirmPassword')||'');
      if(fullName.length<2)throw new Error('Vul uw volledige naam in.');
      if(password.length<8)throw new Error('Gebruik een wachtwoord van minimaal 8 tekens.');
      if(password!==confirmPassword)throw new Error('De wachtwoorden zijn niet gelijk.');
      if(!values.get('terms'))throw new Error('U moet akkoord gaan met de voorwaarden en het privacybeleid.');
      setBusy(true,'Account aanmaken…');
      setMessage('Uw klantaccount wordt veilig aangemaakt…','success');
      const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/login/`,data:{full_name:fullName,phone}}});
      if(error)throw error;
      if(data.user&&data.session){await ensureProfile(data.user,{fullName,phone});location.replace('../portal/');return;}
      setMessage('Account aangemaakt. Controleer uw e-mail en bevestig uw account om in te loggen.','success');
      form.reset();setMode('login');
    }else{
      setBusy(true,'Inloggen…');
      setMessage('Bezig met veilig inloggen…','success');
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      await routeUser(data.user);
    }
  }catch(error){setMessage(error.message||'Deze actie is mislukt.');setBusy(false)}
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

document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
document.querySelectorAll('[data-switch]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.switch)));

setMode(mode);
showRouteMessage();
if(!client)setMessage('De loginmodule kon niet met Supabase verbinden.');else handleExistingSession().catch(error=>setMessage(error.message||'Sessiecontrole mislukt.'));