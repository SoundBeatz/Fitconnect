const client=window.getFitConnectSupabase?.();
const page=document.querySelector('.account-page');
const statusEl=document.getElementById('accountStatus');
const profileForm=document.getElementById('profileForm');
const addressForm=document.getElementById('addressForm');
let session=null;
let addresses=[];
let subscriptions=[];
let plans=[];
let pendingFactorId=null;

function status(message,type='success'){statusEl.textContent=message;statusEl.classList.toggle('success',type==='success')}
function clean(value){return String(value||'').trim()}
function splitName(fullName=''){const parts=clean(fullName).split(/\s+/);return{firstName:parts.shift()||'',lastName:parts.join(' ')}}
function validPhone(value){return !value||/^\+?[0-9][0-9\s().-]{7,19}$/.test(value)}
function validPostal(value,country){return !value||(country==='NL'?/^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(value):value.length>=4)}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function money(value,currency='EUR'){return new Intl.NumberFormat('nl-NL',{style:'currency',currency:String(currency||'EUR').toUpperCase()}).format(Number(value||0))}
function intervalLabel(value){return({month:'maand',quarter:'kwartaal',year:'jaar'})[value]||value}
function stateLabel(value){return({pending:'Wacht op betaling',active:'Actief',paused:'Gepauzeerd',past_due:'Betaling vereist',cancelled:'Opgezegd',expired:'Verlopen'})[value]||value}
function dateLabel(value){if(!value)return'—';return new Intl.DateTimeFormat('nl-NL',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value))}

async function requireCustomer(){
  if(!client){location.replace('../../login/?login=required');return false}
  const result=await client.auth.getSession();session=result.data.session;
  if(!session){location.replace('../../login/?login=required');return false}
  const {data:profile,error}=await client.from('profiles').select('*').eq('id',session.user.id).single();
  if(error||!profile){location.replace('../../login/?denied=1');return false}
  if(!['customer','admin'].includes(profile.role)){location.replace('../');return false}
  const names=splitName(profile.full_name);
  profileForm.elements.firstName.value=profile.first_name||names.firstName;
  profileForm.elements.lastName.value=profile.last_name||names.lastName;
  profileForm.elements.birthDate.value=profile.birth_date||'';
  profileForm.elements.phone.value=profile.phone||'';
  profileForm.elements.addressLine1.value=profile.address_line1||'';
  profileForm.elements.addressLine2.value=profile.address_line2||'';
  profileForm.elements.postalCode.value=profile.postal_code||'';
  profileForm.elements.city.value=profile.city||'';
  profileForm.elements.countryCode.value=profile.country_code||'NL';
  document.getElementById('currentEmail').textContent=session.user.email;
  page.hidden=false;return true;
}

async function loadAddresses(){
  const {data,error}=await client.from('customer_delivery_addresses').select('*').order('is_default',{ascending:false}).order('created_at');
  if(error)throw error;addresses=data||[];renderAddresses();
}
function renderAddresses(){
  const root=document.getElementById('addressList');
  root.innerHTML=addresses.length?addresses.map(item=>`<article class="address-card"><header><h3>${escapeHtml(item.label)}</h3>${item.is_default?'<b>Standaard</b>':''}</header><p><strong>${escapeHtml(item.recipient_name)}</strong><br>${escapeHtml(item.address_line1)}${item.address_line2?`<br>${escapeHtml(item.address_line2)}`:''}<br>${escapeHtml(item.postal_code)} ${escapeHtml(item.city)} · ${escapeHtml(item.country_code)}</p><div class="address-actions"><button class="secondary" data-edit="${item.id}" type="button">Wijzigen</button><button class="secondary" data-delete="${item.id}" type="button">Verwijderen</button></div></article>`).join(''):'<p>U heeft nog geen extra bezorgadressen.</p>';
}
function openAddress(item={}){addressForm.hidden=false;addressForm.reset();for(const [key,value] of Object.entries({id:item.id||'',label:item.label||'',recipientName:item.recipient_name||'',addressLine1:item.address_line1||'',addressLine2:item.address_line2||'',postalCode:item.postal_code||'',city:item.city||'',countryCode:item.country_code||'NL'}))addressForm.elements[key].value=value;addressForm.elements.isDefault.checked=Boolean(item.is_default);addressForm.scrollIntoView({behavior:'smooth',block:'center'})}

async function loadSubscriptions(){
  const [{data:subscriptionRows,error:subscriptionError},{data:planRows,error:planError}]=await Promise.all([
    client.from('customer_subscriptions').select('id,status,provider,current_period_start,current_period_end,cancel_at_period_end,plan_id,created_at,updated_at,customer_subscription_plans(id,name,description,price,currency,billing_interval,credits_per_cycle)').order('created_at',{ascending:false}),
    client.from('customer_subscription_plans').select('id,organization_id,name,description,price,currency,billing_interval,credits_per_cycle').eq('active',true).order('price',{ascending:true})
  ]);
  if(subscriptionError)throw subscriptionError;if(planError)throw planError;
  subscriptions=subscriptionRows||[];plans=planRows||[];renderSubscriptions();
}
function renderSubscriptions(){
  const subscriptionRoot=document.getElementById('subscriptionList');
  const planRoot=document.getElementById('planList');
  subscriptionRoot.innerHTML=subscriptions.length?subscriptions.map(item=>{
    const plan=item.customer_subscription_plans||{};
    const canPay=['pending','past_due'].includes(item.status);
    const canCancel=['active','pending','past_due','paused'].includes(item.status);
    return `<article class="subscription-card"><header><div><h4>${escapeHtml(plan.name||'FitConnect abonnement')}</h4><p>${money(plan.price,plan.currency)} per ${escapeHtml(intervalLabel(plan.billing_interval))}</p></div><span class="subscription-state" data-state="${escapeHtml(item.status)}">${escapeHtml(stateLabel(item.status))}</span></header><div class="subscription-meta"><span>Periode t/m ${escapeHtml(dateLabel(item.current_period_end))}</span>${Number(plan.credits_per_cycle||0)>0?`<span>${escapeHtml(plan.credits_per_cycle)} credits/cyclus</span>`:''}${item.provider?`<span>${escapeHtml(item.provider)}</span>`:''}</div><div class="subscription-actions">${canPay?`<button class="primary" type="button" data-pay-sub="${item.id}">${item.status==='past_due'?'Betaling herstellen':'Betaling afronden'}</button>`:''}${canCancel?`<button class="secondary" type="button" data-cancel-sub="${item.id}">Abonnement opzeggen</button>`:''}</div></article>`;
  }).join(''):'<p>U heeft nog geen abonnement.</p>';
  const occupied=new Set(subscriptions.filter(item=>['pending','active','paused','past_due'].includes(item.status)).map(item=>item.plan_id));
  const available=plans.filter(plan=>!occupied.has(plan.id));
  planRoot.innerHTML=available.length?available.map(plan=>`<article class="plan-card"><header><div><h4>${escapeHtml(plan.name)}</h4><p>${escapeHtml(plan.description||'FitConnect abonnement')}</p></div><strong>${escapeHtml(money(plan.price,plan.currency))}</strong></header><div class="subscription-meta"><span>Per ${escapeHtml(intervalLabel(plan.billing_interval))}</span>${Number(plan.credits_per_cycle||0)>0?`<span>${escapeHtml(plan.credits_per_cycle)} credits/cyclus</span>`:''}</div><div class="subscription-actions"><button class="primary" type="button" data-start-plan="${plan.id}">Abonnement starten</button></div></article>`).join(''):'<p>Er zijn op dit moment geen andere abonnementen beschikbaar.</p>';
}
async function startSubscription(payload,button){
  const old=button?.textContent;if(button){button.disabled=true;button.textContent='Mollie openen…'}
  try{
    const {data,error}=await client.functions.invoke('subscription-mollie-start',{body:payload});
    if(error)throw error;if(!data?.checkoutUrl)throw new Error(data?.error||'Geen betaallink ontvangen.');
    location.assign(data.checkoutUrl);
  }catch(error){status(error.message||'De betaling kon niet worden gestart.','error');if(button){button.disabled=false;button.textContent=old}}
}
async function cancelSubscription(id,button){
  if(!confirm('Wilt u dit abonnement opzeggen? Deze actie stopt de automatische incasso.'))return;
  const old=button.textContent;button.disabled=true;button.textContent='Opzeggen…';
  try{const {data,error}=await client.functions.invoke('subscription-mollie-cancel',{body:{subscriptionId:id}});if(error)throw error;if(!data?.cancelled)throw new Error(data?.error||'Opzeggen is niet bevestigd.');await loadSubscriptions();status('Uw abonnement is opgezegd.')}catch(error){status(error.message||'Het abonnement kon niet worden opgezegd.','error');button.disabled=false;button.textContent=old}
}
async function handleSubscriptionReturn(){
  const subscriptionId=new URLSearchParams(location.search).get('subscription');if(!subscriptionId)return;
  const box=document.getElementById('subscriptionReturn');box.hidden=false;box.textContent='Uw betaling is ontvangen door Mollie. We controleren de abonnementsstatus…';
  document.getElementById('subscriptions').scrollIntoView({behavior:'smooth',block:'start'});
  for(let attempt=0;attempt<5;attempt+=1){await loadSubscriptions();const item=subscriptions.find(row=>row.id===subscriptionId);if(item?.status==='active'){box.textContent='Betaling geslaagd. Uw abonnement is actief.';box.classList.add('success');history.replaceState({},'',location.pathname+'#subscriptions');return}if(item&&['cancelled','expired'].includes(item.status)){box.textContent=`Uw abonnement heeft status: ${stateLabel(item.status)}.`;history.replaceState({},'',location.pathname+'#subscriptions');return}await new Promise(resolve=>setTimeout(resolve,1800))}
  box.textContent='De betaling wordt nog verwerkt. Ververs deze pagina over enkele ogenblikken; een openstaande betaling kan hier opnieuw worden afgerond.';
  history.replaceState({},'',location.pathname+'#subscriptions');
}

document.getElementById('subscriptionList').addEventListener('click',event=>{const pay=event.target.closest('[data-pay-sub]'),cancel=event.target.closest('[data-cancel-sub]');if(pay)startSubscription({subscriptionId:pay.dataset.paySub},pay);else if(cancel)cancelSubscription(cancel.dataset.cancelSub,cancel)});
document.getElementById('planList').addEventListener('click',event=>{const button=event.target.closest('[data-start-plan]');if(button)startSubscription({planId:button.dataset.startPlan},button)});

profileForm.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const phone=clean(form.elements.phone.value);const postal=clean(form.elements.postalCode.value).toUpperCase();const country=form.elements.countryCode.value;
  if(!validPhone(phone)){status('Vul een geldig telefoonnummer in.','error');return}if(!validPostal(postal,country)){status('Vul een geldige postcode in.','error');return}
  const firstName=clean(form.elements.firstName.value),lastName=clean(form.elements.lastName.value);const payload={first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`.trim(),birth_date:form.elements.birthDate.value||null,phone:phone||null,address_line1:clean(form.elements.addressLine1.value)||null,address_line2:clean(form.elements.addressLine2.value)||null,postal_code:postal||null,city:clean(form.elements.city.value)||null,country_code:country,updated_at:new Date().toISOString()};
  const {error}=await client.from('profiles').update(payload).eq('id',session.user.id);if(error){status(error.message,'error');return}await client.auth.updateUser({data:{full_name:payload.full_name,phone:payload.phone}});status('Uw profiel is bijgewerkt.');
});

document.getElementById('newAddress').addEventListener('click',()=>openAddress());document.getElementById('cancelAddress').addEventListener('click',()=>{addressForm.hidden=true});
document.getElementById('addressList').addEventListener('click',async event=>{const edit=event.target.closest('[data-edit]'),remove=event.target.closest('[data-delete]');if(edit){openAddress(addresses.find(item=>item.id===edit.dataset.edit));return}if(remove&&confirm('Wilt u dit bezorgadres verwijderen?')){const {error}=await client.from('customer_delivery_addresses').delete().eq('id',remove.dataset.delete);if(error)status(error.message,'error');else{await loadAddresses();status('Bezorgadres verwijderd.')}}});
addressForm.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const id=form.elements.id.value;const postal=clean(form.elements.postalCode.value).toUpperCase(),country=form.elements.countryCode.value;if(!validPostal(postal,country)){status('Vul een geldige postcode in.','error');return}const payload={user_id:session.user.id,label:clean(form.elements.label.value),recipient_name:clean(form.elements.recipientName.value),address_line1:clean(form.elements.addressLine1.value),address_line2:clean(form.elements.addressLine2.value)||null,postal_code:postal,city:clean(form.elements.city.value),country_code:country,is_default:form.elements.isDefault.checked,updated_at:new Date().toISOString()};if(payload.is_default)await client.from('customer_delivery_addresses').update({is_default:false}).eq('user_id',session.user.id);const result=id?await client.from('customer_delivery_addresses').update(payload).eq('id',id):await client.from('customer_delivery_addresses').insert(payload);if(result.error){status(result.error.message,'error');return}form.hidden=true;await loadAddresses();status('Bezorgadres opgeslagen.')});

document.getElementById('emailForm').addEventListener('submit',async event=>{event.preventDefault();const email=clean(event.currentTarget.elements.email.value).toLowerCase();const {error}=await client.auth.updateUser({email},{emailRedirectTo:`${location.origin}/portal/account/`});if(error)status(error.message,'error');else status(`We hebben bevestigingsmails verstuurd. Rond de wijziging af via ${email}.`)});
document.getElementById('passwordForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,password=form.elements.password.value;if(password.length<10){status('Gebruik minimaal 10 tekens.','error');return}if(password!==form.elements.confirmPassword.value){status('De wachtwoorden zijn niet gelijk.','error');return}const {error}=await client.auth.updateUser({password});if(error)status(error.message,'error');else{form.reset();status('Uw wachtwoord is gewijzigd.')}});

async function loadFactors(){const {data,error}=await client.auth.mfa.listFactors();if(error)throw error;const verified=(data.totp||[]).filter(f=>f.status==='verified');document.getElementById('mfaStatus').textContent=verified.length?'MFA is actief op dit account.':'MFA is nog niet geactiveerd.';document.getElementById('securityBadge').textContent=verified.length?'MFA actief':'MFA aanbevolen';document.getElementById('factorList').innerHTML=verified.map(f=>`<div class="factor"><span>Authenticator · ${escapeHtml(f.friendly_name||'FitConnect')}</span><button class="secondary" data-factor="${f.id}" type="button">Verwijderen</button></div>`).join('');document.getElementById('startMfa').hidden=verified.length>0}
document.getElementById('startMfa').addEventListener('click',async()=>{const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'FitConnect Authenticator'});if(error){status(error.message,'error');return}pendingFactorId=data.id;document.getElementById('mfaQr').src=data.totp.qr_code;document.getElementById('mfaSecret').textContent=`Handmatige code: ${data.totp.secret}`;document.getElementById('mfaSetup').hidden=false});
document.getElementById('mfaForm').addEventListener('submit',async event=>{event.preventDefault();const code=clean(event.currentTarget.elements.code.value);const challenge=await client.auth.mfa.challenge({factorId:pendingFactorId});if(challenge.error){status(challenge.error.message,'error');return}const result=await client.auth.mfa.verify({factorId:pendingFactorId,challengeId:challenge.data.id,code});if(result.error){status(result.error.message,'error');return}document.getElementById('mfaSetup').hidden=true;event.currentTarget.reset();await loadFactors();status('MFA is geactiveerd. Bij een volgende login wordt om uw authenticatorcode gevraagd.')});
document.getElementById('factorList').addEventListener('click',async event=>{const button=event.target.closest('[data-factor]');if(!button||!confirm('MFA verwijderen van dit account?'))return;const {error}=await client.auth.mfa.unenroll({factorId:button.dataset.factor});if(error)status(error.message,'error');else{await loadFactors();status('MFA is verwijderd.')}});
document.getElementById('logoutButton').addEventListener('click',async()=>{await client?.auth.signOut({scope:'local'});location.replace('../../login/?logout=1')});

(async()=>{try{if(!await requireCustomer())return;await Promise.all([loadAddresses(),loadFactors(),loadSubscriptions()]);await handleSubscriptionReturn();status('Uw account is veilig geladen.')}catch(error){status(error.message||'Uw account kon niet worden geladen.','error')}})();
