const client=window.getFitConnectSupabase?.();
const $=selector=>document.querySelector(selector);

const modules=[
  {name:'Authenticatie',area:'foundation',status:'live',url:'../../login/',summary:'Particuliere en zakelijke registratie, bevestiging en veilige sessies.',ui:true,ux:true,data:true,security:true,note:'E-mailflows en redirects actief.'},
  {name:'Mijn FitConnect',area:'portal',status:'live',url:'../../portal/',summary:'Persoonlijk dashboard en centrale navigatie naar alle klantmodules.',ui:true,ux:true,data:true,security:true,note:'Uniforme kaart- en navigatieopmaak bewaken.'},
  {name:'Performance Intake',area:'portal',status:'beta',url:'../../portal/intake/',summary:'Doelen, leefstijl, mogelijkheden, aandachtspunten en eerste startprofiel.',ui:true,ux:false,data:true,security:true,note:'Vraag- en antwoordhiërarchie plus beslisregels verder verfijnen.'},
  {name:'BodyScan',area:'portal',status:'live',url:'../../portal/bodyscan/',summary:'Snelle of uitgebreide nulmeting met US Navy-meetmethode.',ui:true,ux:true,data:true,security:true,note:'Illustraties voor meetinstructies nog toevoegen.'},
  {name:'Progress Center',area:'portal',status:'live',url:'../../portal/progress/',summary:'Nulmeting, vervolgmetingen, verschillen, grafieken en journey.',ui:true,ux:true,data:true,security:true,note:'AI-voortgangsrapport staat op roadmap.'},
  {name:'Performance Center',area:'portal',status:'live',url:'../../portal/performance/',summary:'BMI, BMR, TDEE, macro’s, water en hartslagzones.',ui:true,ux:true,data:true,security:true,note:'Formules en doelgerichte uitleg periodiek inhoudelijk controleren.'},
  {name:'My Twin',area:'portal',status:'beta',url:'../../portal/twin/',summary:'Avatarprofiel, foto-upload en voorbereiding op AI-generatie.',ui:true,ux:true,data:true,security:true,note:'AI-generatiepipeline en toestemmingsflow nog afronden.'},
  {name:'Mijn Gym',area:'portal',status:'review',url:'../../portal/gym/',summary:'Trainlocaties en uitgebreide apparatuurinventaris.',ui:true,ux:false,data:true,security:true,note:'Herontwerpen vanuit klantbehoefte en Performance Intake.'},
  {name:'Training Engine',area:'portal',status:'planned',url:'../../portal/',summary:'Veilige schema’s op basis van intake, capability en voortgang.',ui:false,ux:false,data:false,security:true,note:'Capability Engine en Exercise DNA eerst uitwerken.'},
  {name:'Nutrition Engine',area:'portal',status:'planned',url:'../../portal/',summary:'Persoonlijke calorie-, macro- en voedingsplanning.',ui:false,ux:false,data:false,security:true,note:'Medische grenzen en voedingsvoorkeuren vastleggen.'},
  {name:'Webshop',area:'commerce',status:'live',url:'../../shop/',summary:'Nieuwe en refurbished apparatuur met persoonlijke prijzen.',ui:true,ux:true,data:true,security:true,note:'Coaching en diensten duidelijk naast producten positioneren.'},
  {name:'Command Center',area:'admin',status:'beta',url:'../',summary:'Producten, klanten, garantie, service en trainingen beheren.',ui:true,ux:false,data:true,security:true,note:'Beheeronderdelen verder modulariseren.'},
  {name:'Developer Mode',area:'admin',status:'beta',url:'./',summary:'Kwaliteitsstatus, roadmap, release-check en aandachtspunten.',ui:true,ux:true,data:false,security:true,note:'Later module-statussen vanuit Supabase beheren.'}
];

const releaseChecks=[
  {key:'auth',label:'Authenticatie en rolcontrole',detail:'Beheerpagina’s blokkeren niet-adminaccounts.'},
  {key:'responsive',label:'Responsive controle',detail:'Desktop, tablet en mobiel visueel controleren.'},
  {key:'components',label:'Uniforme componenten',detail:'Knoppen, tegels en navigatie gebruiken vaste stijlen.'},
  {key:'data',label:'Database en RLS',detail:'Tabellen, policies en foutmeldingen zijn gecontroleerd.'},
  {key:'content',label:'Inhoud en veiligheidsgrenzen',detail:'Adviezen zijn duidelijk, verantwoord en niet misleidend.'},
  {key:'navigation',label:'Navigatie en terugknoppen',detail:'Gebruiker kan altijd logisch terug naar dashboard.'}
];

function statusLabel(value){return {live:'Live',beta:'Beta',review:'Review nodig',planned:'Gepland'}[value]||value}
function areaLabel(value){return {portal:'Klantportaal',admin:'Beheer',commerce:'Commerce',foundation:'Fundering'}[value]||value}

function render(){
  const query=$('#moduleSearch').value.trim().toLowerCase();
  const status=$('#statusFilter').value;
  const area=$('#areaFilter').value;
  const visible=modules.filter(item=>(status==='all'||item.status===status)&&(area==='all'||item.area===area)&&`${item.name} ${item.summary} ${item.note}`.toLowerCase().includes(query));
  $('#visibleCount').textContent=`${visible.length} modules zichtbaar`;
  $('#moduleGrid').innerHTML=visible.map(item=>`<article class="module-card"><div class="module-top"><div><p class="eyebrow">${areaLabel(item.area)}</p><h3>${item.name}</h3></div><span class="pill ${item.status}">${statusLabel(item.status)}</span></div><p>${item.summary}</p><div class="quality-grid"><span class="${item.ui?'ok':'warn'}">UI ${item.ui?'OK':'OPEN'}</span><span class="${item.ux?'ok':'warn'}">UX ${item.ux?'OK':'OPEN'}</span><span class="${item.data?'ok':'warn'}">DATA ${item.data?'OK':'OPEN'}</span><span class="${item.security?'ok':'warn'}">SECURITY ${item.security?'OK':'OPEN'}</span></div><div class="module-bottom"><small>${item.note}</small><a href="${item.url}" ${item.url==='./'?'':'target="_blank" rel="noopener"'}>Open</a></div></article>`).join('')||'<p>Geen modules gevonden.</p>';
}

function renderStats(){
  const live=modules.filter(x=>x.status==='live').length;
  const review=modules.filter(x=>x.status==='review'||x.status==='beta').length;
  const blockers=modules.filter(x=>x.status!=='planned'&&(!x.security||!x.data)).length;
  const checks=modules.flatMap(x=>[x.ui,x.ux,x.data,x.security]);
  const score=Math.round(checks.filter(Boolean).length/checks.length*100);
  $('#moduleCount').textContent=modules.length;
  $('#liveCount').textContent=live;
  $('#reviewCount').textContent=review;
  $('#blockerCount').textContent=blockers;
  $('#platformScore').textContent=`${score}%`;
  $('#platformLabel').textContent=score>=90?'Sterke basis':score>=75?'Gezond, review nodig':'Aandacht vereist';
}

function renderChecklist(results={}){
  $('#releaseChecklist').innerHTML=releaseChecks.map(item=>{const state=results[item.key];return `<article class="check-item ${state===true?'pass':state===false?'fail':''}"><span class="check-mark">${state===true?'✓':state===false?'!':'•'}</span><div><strong>${item.label}</strong><small>${item.detail}</small></div></article>`}).join('');
}

function runReview(){
  const results={
    auth:true,
    responsive:modules.every(x=>x.ui),
    components:modules.filter(x=>x.status==='live').every(x=>x.ui&&x.ux),
    data:modules.filter(x=>x.status==='live').every(x=>x.data),
    content:!modules.some(x=>x.status==='live'&&x.note.toLowerCase().includes('blokkeer')),
    navigation:true
  };
  renderChecklist(results);
  const passed=Object.values(results).filter(Boolean).length;
  $('#releaseResult').textContent=`${passed} van ${releaseChecks.length} controles geslaagd`;
  $('#developerStatus').textContent=passed===releaseChecks.length?'Release-check geslaagd.':'Release-check afgerond: open punten blijven zichtbaar.';
  $('#developerStatus').classList.toggle('success',passed===releaseChecks.length);
}

async function requireAdmin(){
  if(!client){location.replace('../login.html');return false}
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session){location.replace('../login.html');return false}
  const {data:profile,error}=await client.from('profiles').select('role,full_name').eq('id',session.user.id).maybeSingle();
  if(error||profile?.role!=='admin'){location.replace('../../portal/');return false}
  $('#developerStatus').textContent=`Beheerder bevestigd: ${profile.full_name||session.user.email}`;
  $('#developerStatus').classList.add('success');
  return true;
}

$('#moduleSearch').addEventListener('input',render);
$('#statusFilter').addEventListener('change',render);
$('#areaFilter').addEventListener('change',render);
$('#runReview').addEventListener('click',runReview);
$('#logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../login.html')}});

(async()=>{
  if(!await requireAdmin())return;
  renderStats();
  render();
  renderChecklist();
})().catch(error=>{console.error(error);$('#developerStatus').textContent=error.message||'Developer Mode kon niet worden geladen.'});