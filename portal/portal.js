const client=window.getFitConnectSupabase?.();
const statusEl=document.getElementById('portalStatus');

function setStatus(text,type='error'){
  statusEl.textContent=text;
  statusEl.classList.toggle('success',type==='success');
}
function accountTypeLabel(value){return value==='business'?'Zakelijk account':'Particulier account'}
function tierLabel(value){return value==='gold'?'Gold Member':value==='silver'?'Silver Member':value==='custom'?'Persoonlijk tarief':'Standard'}
function goalLabel(value){return {fat_loss:'Vetverlies',maintain:'Onderhoud',muscle_gain:'Spieropbouw',performance:'Sportprestatie'}[value]||'Nog niet ingesteld'}

async function loadPortal(){
  if(!client){location.replace('../login/?login=required');return;}
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session){location.replace('../login/?login=required');return;}

  const {data:profile,error}=await client
    .from('profiles')
    .select('full_name,role,account_type,company_name,customer_tier,discount_percent,price_display')
    .eq('id',session.user.id)
    .maybeSingle();

  if(error){setStatus(error.message||'Uw profiel kon niet worden geladen.');return;}
  if(!profile){location.replace('../login/?denied=1');return;}
  if(profile.role==='admin'){location.replace('../admin/');return;}

  const displayName=profile.full_name||session.user.email||'klant';
  const tier=tierLabel(profile.customer_tier);
  document.getElementById('customerName').textContent=displayName;
  document.getElementById('sidebarName').textContent=displayName;
  document.getElementById('sidebarTier').textContent=tier;
  document.getElementById('accountTypeBadge').textContent=accountTypeLabel(profile.account_type);
  document.getElementById('tierBadge').textContent=tier;
  document.getElementById('priceBadge').textContent=profile.price_display==='excl_vat'?'Prijzen excl. btw':'Prijzen incl. btw';

  const discount=Number(profile.discount_percent||0);
  document.getElementById('accountSummary').textContent=profile.account_type==='business'
    ? `${profile.company_name||'Uw bedrijf'} is gekoppeld aan uw zakelijke FitConnect-account.${discount>0?` Uw persoonlijke korting is ${discount}%.`:''}`
    : `Uw particuliere FitConnect-account is actief.${discount>0?` Uw persoonlijke korting is ${discount}%.`:''}`;

  const {data:performance,error:performanceError}=await client
    .from('performance_profiles')
    .select('goal')
    .eq('user_id',session.user.id)
    .maybeSingle();

  if(!performanceError&&performance?.goal){
    document.getElementById('sidebarGoal').textContent=goalLabel(performance.goal);
  }

  setStatus('Uw persoonlijke omgeving is veilig geladen.','success');
}

document.getElementById('logoutButton').addEventListener('click',async()=>{
  const button=document.getElementById('logoutButton');
  button.disabled=true;button.textContent='Uitloggen…';
  try{if(client)await client.auth.signOut({scope:'local'});}finally{location.replace('../login/?logout=1')}
});

loadPortal().catch(error=>setStatus(error.message||'De klantomgeving kon niet worden geladen.'));