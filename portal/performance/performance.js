const client=window.getFitConnectSupabase?.();
const form=document.getElementById('performanceForm');
const statusEl=document.getElementById('formStatus');
const saveState=document.getElementById('saveState');
const infoBackdrop=document.getElementById('infoBackdrop');
let currentUser=null;

const infoContent={
  bmi:{title:'Wat is BMI?',body:'BMI vergelijkt uw gewicht met uw lengte. Het is een snelle algemene indicatie, maar maakt geen onderscheid tussen spiermassa en vetmassa. Bij zeer gespierde mensen kan BMI daarom een vertekend beeld geven.'},
  bmr:{title:'Wat is BMR?',body:'BMR is uw geschatte basale energieverbruik: het aantal calorieën dat uw lichaam in volledige rust nodig heeft voor onder meer ademhaling, circulatie, temperatuurregeling en orgaanfunctie.'},
  tdee:{title:'Wat is TDEE?',body:'TDEE is uw geschatte totale dagelijkse energieverbruik. FitConnect vermenigvuldigt uw BMR met een activiteitsfactor die aansluit bij bureauwerk, veel lopen, fysiek werk of zeer zware dagelijkse inspanning en past dit aan uw doelstelling aan.'},
  protein:{title:'Waarom dit eiwitadvies?',body:'Het eiwitadvies is gebaseerd op uw lichaamsgewicht en doel. Bij vetverlies helpt een hogere eiwitinname om vetvrije massa te behouden. Bij spieropbouw en sportprestatie ondersteunt eiwit herstel en spieropbouw.'},
  water:{title:'Waarom zoveel water?',body:'De waterinschatting gebruikt ongeveer 35 milliliter per kilogram lichaamsgewicht als praktisch uitgangspunt. Warmte, zweten, zoutinname, training, zwangerschap en medische omstandigheden kunnen uw werkelijke behoefte veranderen.'},
  karvonen:{title:'Wat is de Karvonen-methode?',body:'De Karvonen-methode gebruikt uw hartslagreserve: maximale hartslag minus rusthartslag. Daardoor zijn de zones persoonlijker dan alleen een percentage van uw maximale hartslag. Een gemeten maximale hartslag is nauwkeuriger dan een leeftijdsschatting.'}
};

const zones=[
  {name:'Zone 1',label:'Wandelen & herstel',low:.50,high:.60,className:'zone-grey',description:'Zeer lichte inspanning. Geschikt voor rustig wandelen, herstel, cooling-down en langer bewegen met weinig vermoeidheid.'},
  {name:'Zone 2',label:'Warming-up',low:.60,high:.70,className:'zone-yellow',description:'Lichte tot matige inspanning. Geschikt voor warming-up, rustige duurtraining en het opbouwen van een aerobe basis.'},
  {name:'Zone 3',label:'Vetverbranding',low:.70,high:.80,className:'zone-green',description:'Matige inspanning waarbij u stevig werkt maar doorgaans nog korte zinnen kunt spreken. Geschikt voor duurvermogen en een hoog totaal energieverbruik.'},
  {name:'Zone 4',label:'Conditieverbetering',low:.80,high:.90,className:'zone-orange',description:'Zware inspanning. Geschikt voor tempowerk en het verbeteren van conditie en lactaattolerantie. Herstel wordt belangrijker.'},
  {name:'Zone 5',label:'High intensity',low:.90,high:1,className:'zone-red',description:'Zeer zware tot maximale inspanning. Alleen kort vol te houden en bedoeld voor goed opgebouwde intervallen, met voldoende herstel en passende medische belastbaarheid.'}
];

function setStatus(text,type='error'){statusEl.textContent=text;statusEl.classList.toggle('success',type==='success')}
function number(name){const value=Number(form.elements[name].value);return Number.isFinite(value)&&form.elements[name].value!==''?value:null}
function yearsFrom(dateValue){if(!dateValue)return null;const birth=new Date(`${dateValue}T00:00:00`);const now=new Date();let age=now.getFullYear()-birth.getFullYear();const before=now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate());if(before)age--;return age>0?age:null}
function round(value,digits=0){const factor=10**digits;return Math.round(value*factor)/factor}
function bmiLabel(value){return value<18.5?'Ondergewicht':value<25?'Gezond bereik':value<30?'Verhoogd':value<35?'Obesitas klasse I':value<40?'Obesitas klasse II':'Obesitas klasse III'}
function activityFactor(value){return {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9}[value]||1.55}
function proteinFactor(goal){return {fat_loss:2,maintain:1.6,muscle_gain:1.8,performance:1.8}[goal]||1.6}
function calorieAdjustment(goal){return {fat_loss:-400,maintain:0,muscle_gain:250,performance:150}[goal]||0}
function estimateMaxHr(age){return age?220-age:null}
function updateEstimatedMax(){const age=yearsFrom(form.elements.birth_date.value);const estimate=estimateMaxHr(age);document.getElementById('estimatedMaxHr').value=estimate?`${estimate} bpm · 220 − ${age}`:'Vul uw geboortedatum in';return estimate}
function openInfo(title,body,eyebrow='Uitleg'){document.getElementById('infoTitle').textContent=title;document.getElementById('infoBody').innerHTML=`<p>${body}</p>`;document.getElementById('infoEyebrow').textContent=eyebrow;infoBackdrop.hidden=false;document.body.classList.add('modal-open')}
function closeInfo(){infoBackdrop.hidden=true;document.body.classList.remove('modal-open')}

function calculate(){
  const gender=form.elements.gender.value;
  const age=yearsFrom(form.elements.birth_date.value);
  const height=number('height_cm');
  const weight=number('weight_kg');
  const resting=number('resting_hr');
  const enteredMax=number('max_hr');
  const estimatedMax=updateEstimatedMax();
  const activity=form.elements.activity_level.value;
  const goal=form.elements.goal.value;
  if(!height||!weight){setStatus('Vul minimaal uw lengte en gewicht in.');return null}

  const bmi=weight/((height/100)**2);
  document.getElementById('bmiValue').textContent=round(bmi,1);
  document.getElementById('bmiLabel').textContent=bmiLabel(bmi);

  let bmr=null;
  if(age&&gender){const base=10*weight+6.25*height-5*age;bmr=gender==='male'?base+5:gender==='female'?base-161:base-78}
  const tdee=bmr?bmr*activityFactor(activity)+calorieAdjustment(goal):null;
  document.getElementById('bmrValue').textContent=bmr?Math.round(bmr):'—';
  document.getElementById('tdeeValue').textContent=tdee?Math.max(1200,Math.round(tdee)):'—';
  document.getElementById('proteinValue').textContent=Math.round(weight*proteinFactor(goal));
  document.getElementById('waterValue').textContent=round(weight*.035,1);

  const maxHr=enteredMax||estimatedMax;
  const zonesEl=document.getElementById('heartRateZones');
  if(resting&&maxHr&&maxHr>resting){
    const reserve=maxHr-resting;
    zonesEl.innerHTML=zones.map(zone=>{
      const low=Math.round(resting+reserve*zone.low);
      const high=Math.round(resting+reserve*zone.high);
      return `<button type="button" class="zone-row ${zone.className}" data-zone-title="${zone.name} · ${zone.label}" data-zone-body="${zone.description}"><span><b>${zone.name}</b><em>${zone.label}</em></span><strong>${low}–${high} bpm</strong><small>${Math.round(zone.low*100)}–${Math.round(zone.high*100)}% HRR</small></button>`;
    }).join('');
    const zone2Low=Math.round(resting+reserve*.60),zone2High=Math.round(resting+reserve*.70);
    document.getElementById('zone2Value').textContent=`${zone2Low}–${zone2High}`;
    zonesEl.querySelectorAll('[data-zone-title]').forEach(button=>button.addEventListener('click',()=>openInfo(button.dataset.zoneTitle,button.dataset.zoneBody,'Hartslagzone')));
  }else{
    zonesEl.innerHTML='<p>Vul uw rusthartslag en geboortedatum of gemeten maximale hartslag in om de zones te berekenen.</p>';
    document.getElementById('zone2Value').textContent='—';
  }

  const completed=['gender','birth_date','height_cm','weight_kg','activity_level','goal','resting_hr'].filter(name=>String(form.elements[name].value||'').trim()).length;
  const score=Math.round(completed/7*100);
  document.getElementById('profileScore').textContent=`${score}%`;
  document.getElementById('profileScoreText').textContent=score===100?'Profiel compleet':score>=70?'Bijna compleet':'Vul uw gegevens aan';
  setStatus('Berekeningen bijgewerkt.','success');
  return {gender,age,height,weight,bmi,bmr,tdee,maxHr};
}

async function loadProfile(){
  if(!client){location.replace('../../login/?login=required');return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){location.replace('../../login/?login=required');return}
  currentUser=session.user;
  const {data,error}=await client.from('performance_profiles').select('*').eq('user_id',currentUser.id).maybeSingle();
  if(error){if(error.message?.includes('performance_profiles'))setStatus('De Performance Center-database moet nog eenmalig in Supabase worden geactiveerd.');else setStatus(error.message||'Uw profiel kon niet worden geladen.');return}
  if(data){Object.entries(data).forEach(([key,value])=>{if(form.elements[key]&&value!==null)form.elements[key].value=value});saveState.textContent='Profiel geladen';calculate()}else{saveState.textContent='Nieuw profiel';updateEstimatedMax()}
}

form.addEventListener('submit',async event=>{
  event.preventDefault();const result=calculate();if(!result||!currentUser)return;
  const payload={user_id:currentUser.id,gender:form.elements.gender.value||null,birth_date:form.elements.birth_date.value||null,height_cm:number('height_cm'),weight_kg:number('weight_kg'),bodyfat_percent:number('bodyfat_percent'),activity_level:form.elements.activity_level.value,goal:form.elements.goal.value,resting_hr:number('resting_hr'),max_hr:number('max_hr'),updated_at:new Date().toISOString()};
  saveState.textContent='Opslaan…';
  const {error}=await client.from('performance_profiles').upsert(payload,{onConflict:'user_id'});
  if(error){setStatus(error.message||'Opslaan is mislukt.');saveState.textContent='Niet opgeslagen';return}
  saveState.textContent='Opgeslagen';setStatus('Uw Performance-profiel is veilig opgeslagen.','success');
});

document.getElementById('calculateOnly').addEventListener('click',calculate);
form.addEventListener('input',()=>{saveState.textContent='Niet-opgeslagen wijziging';calculate()});
document.querySelectorAll('[data-info]').forEach(button=>button.addEventListener('click',()=>{const info=infoContent[button.dataset.info];if(info)openInfo(info.title,info.body)}));
document.getElementById('infoClose').addEventListener('click',closeInfo);
infoBackdrop.addEventListener('click',event=>{if(event.target===infoBackdrop)closeInfo()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeInfo()});
document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});
loadProfile().catch(error=>setStatus(error.message||'Het Performance Center kon niet worden geladen.'));