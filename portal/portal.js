(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='../shared/typography.css?v=20260716-1';document.head.appendChild(link);const script=document.createElement('script');script.src='../shared/typography.js?v=20260716-1';script.defer=true;document.head.appendChild(script)})();
const client=window.getFitConnectSupabase?.();
const statusEl=document.getElementById('portalStatus');

function setStatus(text,type='error'){
  statusEl.textContent=text;
  statusEl.classList.toggle('success',type==='success');
}
function accountTypeLabel(value){return value==='business'?'Zakelijk account':'Particulier account'}
function tierLabel(value){return value==='gold'?'Gold Member':value==='silver'?'Silver Member':value==='custom'?'Persoonlijk tarief':'Standard'}
function goalLabel(value){return {fat_loss:'Vetverlies',maintain:'Onderhoud',muscle_gain:'Spieropbouw',performance:'Sportprestatie'}[value]||'Nog niet ingesteld'}
function avatarLabel(value){return {draft:'Concept',standard_active:'Standaard actief',uploaded:'Foto geüpload',processing:'In verwerking',ready:'My Twin gereed',failed:'Generatie mislukt'}[value]||'Nog niet ingesteld'}

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
  const isDedicatedCustomer=String(session.user.email||'').toLowerCase()==='service@fit360.nl';
  const isAdmin=profile.role==='admin'&&!isDedicatedCustomer;
  if(isAdmin){
    document.getElementById('adminReturnLink').hidden=false;
    document.getElementById('accountSummary').textContent='Beheerdersweergave: u kunt het klantportaal bekijken zonder uw Command Center-sessie te verlaten.';
  }

  const displayName=profile.full_name||session.user.email||'klant';
  const tier=tierLabel(profile.customer_tier);
  document.getElementById('customerName').textContent=displayName;
  document.getElementById('sidebarName').textContent=displayName;
  document.getElementById('sidebarTier').textContent=tier;
  document.getElementById('accountTypeBadge').textContent=accountTypeLabel(profile.account_type);
  document.getElementById('tierBadge').textContent=tier;
  document.getElementById('priceBadge').textContent=profile.price_display==='excl_vat'?'Prijzen excl. btw':'Prijzen incl. btw';

  const discount=Number(profile.discount_percent||0);
  if(!isAdmin){
    document.getElementById('accountSummary').textContent=profile.account_type==='business'
      ? `${profile.company_name||'Uw bedrijf'} is gekoppeld aan uw zakelijke FitConnect-account.${discount>0?` Uw persoonlijke korting is ${discount}%.`:''}`
      : `Uw particuliere FitConnect-account is actief.${discount>0?` Uw persoonlijke korting is ${discount}%.`:''}`;
  }

  const [{data:performance,error:performanceError},{data:avatar,error:avatarError},{data:rewardsModule},{data:coinAccount}]=await Promise.all([
    client.from('performance_profiles').select('goal').eq('user_id',session.user.id).maybeSingle(),
    client.from('user_avatars').select('status,current_version,body_type').eq('user_id',session.user.id).maybeSingle(),
    client.from('platform_modules').select('enabled,name').eq('module_key','rewards').maybeSingle(),
    client.from('fitcoin_accounts').select('balance').eq('user_id',session.user.id).maybeSingle()
  ]);

  if(rewardsModule?.enabled){
    document.getElementById('rewardsNavLink').hidden=false;
    document.getElementById('rewardsCard').hidden=false;
    document.getElementById('rewardsBalance').textContent=`${new Intl.NumberFormat('nl-NL').format(coinAccount?.balance||0)} FitCoins`;
  }

  if(!performanceError&&performance?.goal){
    document.getElementById('sidebarGoal').textContent=goalLabel(performance.goal);
  }

  if(!avatarError&&avatar){
    const label=avatarLabel(avatar.status);
    document.getElementById('avatarStatus').textContent=label;
    document.getElementById('avatarFeatureStatus').textContent=`${label} · versie ${avatar.current_version||1}`;
  }else{
    document.getElementById('avatarStatus').textContent='Avatar instellen';
    document.getElementById('avatarFeatureStatus').textContent='Nog geen avatar opgeslagen';
  }

  setStatus(isAdmin?'Beheerdersweergave van het klantportaal is actief.':'Uw persoonlijke omgeving is veilig geladen.','success');
}

document.getElementById('logoutButton').addEventListener('click',async()=>{
  const button=document.getElementById('logoutButton');
  button.disabled=true;button.textContent='Uitloggen…';
  try{if(client)await client.auth.signOut({scope:'local'});}finally{location.replace('../login/?logout=1')}
});

loadPortal().catch(error=>setStatus(error.message||'De klantomgeving kon niet worden geladen.'));
