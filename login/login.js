const client=window.getFitConnectSupabase?.();
const form=document.getElementById('loginForm');
const message=document.getElementById('message');
const submit=form.querySelector('[type="submit"]');
const providerButtons=[...document.querySelectorAll('[data-provider]')];
const params=new URLSearchParams(location.search);
const hashParams=new URLSearchParams(location.hash.replace(/^#/,''));
const authContent=document.getElementById('authContent');
const registrationComplete=document.getElementById('registrationComplete');
const activationComplete=document.getElementById('activationComplete');
const loginCard=document.getElementById('loginCard');
let mode=params.get('mode')==='register'?'register':'login';
let activatedUser=null;
let recoveryMode=params.get('reset')==='1'||params.get('type')==='recovery'||hashParams.get('type')==='recovery';

const recoveryPanel=document.createElement('section');
recoveryPanel.className='auth-result';
recoveryPanel.id='passwordRecovery';
recoveryPanel.hidden=true;
recoveryPanel.innerHTML=`
  <div class="result-icon">🔐</div>
  <p class="eyebrow">Wachtwoord herstellen</p>
  <h2>Stel een nieuw wachtwoord in</h2>
  <p>Deze beveiligde herstel-link geeft alleen toegang tot dit formulier. Kies nu een nieuw wachtwoord voordat u verder kunt.</p>
  <form id="recoveryForm">
    <label>Nieuw wachtwoord<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Minimaal 8 tekens"></label>
    <label>Herhaal nieuw wachtwoord<input name="confirmNewPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Herhaal uw nieuwe wachtwoord"></label>
    <button class="primary-login" type="submit">Nieuw wachtwoord opslaan</button>
  </form>
  <p class="message" id="recoveryMessage" role="status" aria-live="polite"></p>
`;
loginCard.appendChild(recoveryPanel);

const mfaPanel=document.createElement('section');
mfaPanel.className='auth-result';
mfaPanel.id='mfaChallenge';
mfaPanel.hidden=true;
mfaPanel.innerHTML=`
  <div class="result-icon">🔐</div>
  <p class="eyebrow">Extra beveiliging</p>
  <h2>Voer uw authenticatorcode in</h2>
  <p>Open uw authenticator-app en vul de actuele zescijferige FitConnect-code in.</p>
  <form id="mfaChallengeForm">
    <label>Beveiligingscode<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="123456"></label>
    <button class="primary-login" type="submit">Veilig inloggen</button>
  </form>
  <p class="message" id="mfaMessage" role="status" aria-live="polite"></p>
`;
loginCard.appendChild(mfaPanel);
let pendingMfaUser=null;

function setMessage(text,type='error'){
  message.textContent=text;
  message.classList.toggle('success',type==='success');
}
function setRecoveryMessage(text,type='error'){
  const el=document.getElementById('recoveryMessage');
  el.textContent=text;
  el.classList.toggle('success',type==='success');
}
function setBusy(busy,label){
  submit.disabled=busy;
  submit.textContent=busy?(label||'Bezig…'):(mode==='register'?'Account aanmaken':'Inloggen');
  providerButtons.forEach(button=>button.disabled=busy);
}
function normalizeAccountType(value){return value==='business'?'business':'private'}
function selectedAccountType(){return normalizeAccountType(form.elements.accountType?.value||'private')}
function syncBusinessFields(){
  const business=mode==='register'&&selectedAccountType()==='business';
  document.querySelectorAll('.business-only').forEach(el=>el.hidden=!business);
  form.elements.companyName.required=business;
  form.elements.chamberOfCommerce.required=business;
}
function showOnly(panel){
  authContent.hidden=panel!==authContent;
  registrationComplete.hidden=panel!==registrationComplete;
  activationComplete.hidden=panel!==activationComplete;
  recoveryPanel.hidden=panel!==recoveryPanel;
  mfaPanel.hidden=panel!==mfaPanel;
}
function showRegistrationComplete(email){
  document.getElementById('registrationEmail').textContent=email;
  showOnly(registrationComplete);
  setBusy(false);
  history.replaceState(null,'','?registration=complete');
}
function showActivationComplete(user){
  activatedUser=user||null;
  showOnly(activationComplete);
  history.replaceState(null,'',location.pathname);
}
function showRecovery(){
  recoveryMode=true;
  showOnly(recoveryPanel);
  history.replaceState(null,'',`${location.pathname}?reset=1`);
  setRecoveryMessage('Vul tweemaal uw nieuwe wachtwoord in.','success');
  recoveryPanel.querySelector('input')?.focus();
}
function setMode(nextMode){
  if(recoveryMode){showRecovery();return;}
  showOnly(authContent);
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
  syncBusinessFields();
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
  const metadata=user.user_metadata||{};
  const accountType=normalizeAccountType(details.accountType||metadata.account_type||'private');
  const fullName=details.fullName||metadata.full_name||metadata.name||'';
  const phone=details.phone||metadata.phone||user.phone||null;
  const {data,error}=await client.from('profiles').select('id,role,account_type,customer_tier,discount_percent,price_display').eq('id',user.id).maybeSingle();
  if(error)throw error;
  if(data)return data;
  const payload={id:user.id,full_name:fullName,phone,role:'customer',account_type:accountType,company_name:details.companyName||metadata.company_name||null,chamber_of_commerce:details.chamberOfCommerce||metadata.chamber_of_commerce||null,vat_number:details.vatNumber||metadata.vat_number||null,customer_tier:'standard',discount_percent:0,price_display:accountType==='business'?'excl_vat':'incl_vat'};
  const {data:created,error:createError}=await client.from('profiles').insert(payload).select('id,role,account_type,customer_tier,discount_percent,price_display').single();
  if(createError)throw createError;
  return created;
}
async function routeUser(user){
  if(recoveryMode){showRecovery();return;}
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error)throw assurance.error;
  if(assurance.data.nextLevel==='aal2'&&assurance.data.currentLevel!=='aal2'){
    pendingMfaUser=user;
    showOnly(mfaPanel);
    mfaPanel.querySelector('input')?.focus();
    return;
  }
  const profile=await ensureProfile(user);
  const isDedicatedCustomer=String(user.email||'').toLowerCase()==='service@fit360.nl';
  location.replace(profile.role==='admin'&&!isDedicatedCustomer?'../admin/':'../portal/');
}

mfaPanel.querySelector('#mfaChallengeForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=event.currentTarget.querySelector('button');
  const messageEl=document.getElementById('mfaMessage');
  button.disabled=true;button.textContent='Controleren…';messageEl.textContent='';
  try{
    const factors=await client.auth.mfa.listFactors();
    if(factors.error)throw factors.error;
    const factor=(factors.data.totp||[]).find(item=>item.status==='verified');
    if(!factor)throw new Error('Er is geen actieve authenticator gevonden.');
    const challenge=await client.auth.mfa.challenge({factorId:factor.id});
    if(challenge.error)throw challenge.error;
    const verified=await client.auth.mfa.verify({factorId:factor.id,challengeId:challenge.data.id,code:event.currentTarget.elements.code.value});
    if(verified.error)throw verified.error;
    await routeUser(pendingMfaUser||verified.data.user);
  }catch(error){messageEl.textContent=error.message||'De beveiligingscode is niet geldig.';button.disabled=false;button.textContent='Veilig inloggen'}
});
async function handleExistingSession(){
  if(!client)return;
  let {data:{session}}=await client.auth.getSession();
  if(recoveryMode){
    if(!session&&params.get('code')){
      const exchanged=await client.auth.exchangeCodeForSession(params.get('code'));
      if(exchanged.error)throw exchanged.error;
      session=exchanged.data.session;
    }
    showRecovery();
    return;
  }
  const isSignupCallback=hashParams.get('type')==='signup'||params.get('type')==='signup';
  if(session?.user&&isSignupCallback){showActivationComplete(session.user);return;}
  if(session?.user&&!params.has('logout')&&!params.has('expired')&&!params.has('denied')&&!params.has('registration'))await routeUser(session.user);
}

client?.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY')showRecovery();
});

recoveryPanel.querySelector('#recoveryForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const recoveryForm=event.currentTarget;
  const button=recoveryForm.querySelector('[type="submit"]');
  const newPassword=String(recoveryForm.elements.newPassword.value||'');
  const confirmPassword=String(recoveryForm.elements.confirmNewPassword.value||'');
  if(newPassword.length<8){setRecoveryMessage('Gebruik een wachtwoord van minimaal 8 tekens.');return;}
  if(newPassword!==confirmPassword){setRecoveryMessage('De twee wachtwoorden zijn niet gelijk.');return;}
  button.disabled=true;
  button.textContent='Wachtwoord opslaan…';
  setRecoveryMessage('Uw nieuwe wachtwoord wordt veilig opgeslagen.','success');
  try{
    const {data:{session}}=await client.auth.getSession();
    if(!session)throw new Error('De herstel-link is verlopen of ongeldig. Vraag een nieuwe herstelmail aan.');
    const {error}=await client.auth.updateUser({password:newPassword});
    if(error)throw error;
    await client.auth.signOut({scope:'local'});
    recoveryMode=false;
    recoveryForm.reset();
    showOnly(authContent);
    setMode('login');
    setMessage('Uw wachtwoord is gewijzigd. Log nu opnieuw in met uw nieuwe wachtwoord.','success');
    history.replaceState(null,'',location.pathname);
  }catch(error){
    setRecoveryMessage(error.message||'Het nieuwe wachtwoord kon niet worden opgeslagen.');
  }finally{
    button.disabled=false;
    button.textContent='Nieuw wachtwoord opslaan';
  }
});

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(recoveryMode){showRecovery();return;}
  if(!client){setMessage('De databasekoppeling ontbreekt.');return;}
  const values=new FormData(form);
  const email=String(values.get('email')||'').trim();
  const password=String(values.get('password')||'');
  try{
    if(mode==='register'){
      const fullName=String(values.get('fullName')||'').trim();
      const phone=String(values.get('phone')||'').trim();
      const accountType=normalizeAccountType(String(values.get('accountType')||'private'));
      const companyName=String(values.get('companyName')||'').trim();
      const chamberOfCommerce=String(values.get('chamberOfCommerce')||'').trim();
      const vatNumber=String(values.get('vatNumber')||'').trim().toUpperCase();
      const confirmPassword=String(values.get('confirmPassword')||'');
      if(fullName.length<2)throw new Error('Vul uw volledige naam in.');
      if(accountType==='business'&&!companyName)throw new Error('Vul de bedrijfsnaam in.');
      if(accountType==='business'&&!chamberOfCommerce)throw new Error('Vul het KvK-nummer in.');
      if(password.length<8)throw new Error('Gebruik een wachtwoord van minimaal 8 tekens.');
      if(password!==confirmPassword)throw new Error('De wachtwoorden zijn niet gelijk.');
      if(!values.get('terms'))throw new Error('U moet akkoord gaan met de voorwaarden en het privacybeleid.');
      setBusy(true,'Account aanmaken…');
      setMessage('Uw account wordt veilig aangemaakt…','success');
      const metadata={full_name:fullName,phone,account_type:accountType,company_name:companyName,chamber_of_commerce:chamberOfCommerce,vat_number:vatNumber};
      const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/login/`,data:metadata}});
      if(error)throw error;
      if(data.user&&data.session){await ensureProfile(data.user,{fullName,phone,accountType,companyName,chamberOfCommerce,vatNumber});location.replace('../portal/');return;}
      form.reset();
      showRegistrationComplete(email);
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
  if(recoveryMode){showRecovery();return;}
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

document.getElementById('backToLogin').addEventListener('click',()=>setMode('login'));
document.getElementById('continueAfterActivation').addEventListener('click',async()=>{if(activatedUser){await routeUser(activatedUser);return;}setMode('login');});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
document.querySelectorAll('[data-switch]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.switch)));
document.querySelectorAll('input[name="accountType"]').forEach(input=>input.addEventListener('change',syncBusinessFields));

if(recoveryMode)showRecovery();else setMode(mode);
showRouteMessage();
if(!client)setMessage('De loginmodule kon niet met Supabase verbinden.');else handleExistingSession().catch(error=>recoveryMode?setRecoveryMessage(error.message||'Herstel-link kon niet worden verwerkt.'):setMessage(error.message||'Sessiecontrole mislukt.'));
