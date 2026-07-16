const client=window.getFitConnectSupabase?.();
const form=document.getElementById('performanceForm');
const statusEl=document.getElementById('formStatus');
const saveState=document.getElementById('saveState');
const infoBackdrop=document.getElementById('infoBackdrop');
let currentUser=null;

const infoContent={
  bmi:{title:'Wat is BMI?',body:'BMI vergelijkt uw gewicht met uw lengte. Het is een snelle algemene indicatie, maar maakt geen onderscheid tussen spiermassa en vetmassa. Bij zeer gespierde mensen kan BMI daarom een vertekend beeld geven.'},
  bmr:{title:'Wat is BMR?',body:'BMR is uw geschatte basale energieverbruik: het aantal calorieën dat uw lichaam in volledige rust nodig heeft voor onder meer ademhaling, circulatie, temperatuurregeling en orgaanfunctie.'},
  tdee:{title:'Wat is uw onderhoudsbehoefte?',body:'Uw onderhoudsbehoefte of TDEE is de geschatte hoeveelheid energie die u dagelijks verbruikt. FitConnect combineert uw BMR met uw dagelijkse activiteit. Dit is het uitgangspunt voordat uw doelstelling wordt toegepast.'},
  calories:{title:'Waarom dit caloriedoel?',body:'Uw caloriedoel start bij uw onderhoudsbehoefte. Voor vetverlies wordt een gematigd tekort toegepast, voor spieropbouw een gecontroleerd overschot en voor sportprestatie een kleine energiemarge. Het blijft een startwaarde die op voortgang moet worden bijgesteld.'},
  protein:{title:'Waarom dit eiwitadvies?',body:'Het eiwitadvies wordt gekoppeld aan lichaamsgewicht, geslacht, leeftijd en doelstelling. Bij spieropbouw, vetverlies en hogere leeftijd wordt extra nadruk gelegd op behoud en opbouw van vetvrije massa.'},
  carbs:{title:'Waarom deze hoeveelheid koolhydraten?',body:'Koolhydraten vullen de resterende calorieën nadat eiwit en vet zijn berekend. Ze leveren brandstof voor krachttraining, duurwerk en herstel. Bij een hogere dagelijkse belasting blijft daardoor meer ruimte voor koolhydraten beschikbaar.'},
  fat:{title:'Waarom deze hoeveelheid vet?',body:'Voedingsvet ondersteunt onder meer hormoonproductie, celmembranen en de opname van vetoplosbare vitaminen. FitConnect gebruikt daarom een minimale hoeveelheid per kilogram lichaamsgewicht en laat koolhydraten de resterende energie invullen.'},
  water:{title:'Waarom zoveel water?',body:'De waterinschatting gebruikt ongeveer 35 milliliter per kilogram lichaamsgewicht als praktisch uitgangspunt. Warmte, zweten, zoutinname, training, zwangerschap en medische omstandigheden kunnen uw werkelijke behoefte veranderen.'},
  recommended:{title:'Waarom deze trainingszone?',body:'Uw aanbevolen zone wordt gekoppeld aan uw doelstelling. De kaart benadrukt de zone die het best past als basis, maar vervangt geen compleet trainingsprogramma. Krachttraining zelf kan korte hartslagpieken geven zonder dat langdurige cardio op hoge intensiteit nodig is.'}
};

const zones=[
  {number:1,name:'Zone 1',label:'Wandelen & herstel',low:.50,high:.60,className:'zone-grey',description:'Zeer lichte inspanning. Geschikt voor rustig wandelen, herstel, cooling-down en langer bewegen met weinig vermoeidheid.'},
  {number:2,name:'Zone 2',label:'Warming-up & aerobe basis',low:.60,high:.70,className:'zone-yellow',description:'Lichte tot matige inspanning. Geschikt voor warming-up, rustige duurtraining en het opbouwen van een aerobe basis.'},
  {number:3,name:'Zone 3',label:'Stevige duurinspanning',low:.70,high:.80,className:'zone-green',description:'Matige inspanning waarbij u stevig werkt maar doorgaans nog korte zinnen kunt spreken. Geschikt voor duurvermogen en een hoger totaal energieverbruik.'},
  {number:4,name:'Zone 4',label:'Conditieverbetering',low:.80,high:.90,className:'zone-orange',description:'Zware inspanning. Geschikt voor tempowerk en het verbeteren van conditie en lactaattolerantie. Herstel wordt belangrijker.'},
  {number:5,name:'Zone 5',label:'High intensity',low:.90,high:1,className:'zone-red',description:'Zeer zware tot maximale inspanning. Alleen kort vol te houden en bedoeld voor goed opgebouwde intervallen, met voldoende herstel en passende medische belastbaarheid.'}
];

const goalPlans={
  fat_loss:{primary:3,secondary:2,title:'Zone 3',label:'Stevige duurinspanning',className:'zone-green',text:'Gebruik Zone 3 voor doelgerichte duurblokken en Zone 2 voor langere rustige sessies en herstel.'},
  maintain:{primary:2,secondary:3,title:'Zone 2',label:'Aerobe basis',className:'zone-yellow',text:'Zone 2 is een sterke basis voor algemene fitheid; wissel af met Zone 3 wanneer u meer duurprikkel wilt.'},
  muscle_gain:{primary:2,secondary:3,title:'Zone 2–3',label:'Beperkte cardio naast krachttraining',className:'zone-yellow',text:'Houd langdurige cardio vooral in Zone 2 en eventueel kort in Zone 3. Hogere zones gebruikt u beperkt en doelgericht, zodat herstel en krachtprestatie centraal blijven.'},
  performance:{primary:4,secondary:5,title:'Zone 4',label:'Conditie & prestatie',className:'zone-orange',text:'Zone 4 is de hoofdprikkel voor conditieverbetering. Zone 5 wordt kort en gecontroleerd ingezet als intervalprikkel.'}
};

function setStatus(text,type='error'){statusEl.textContent=text;statusEl.classList.toggle('success',type==='success')}
function number(name){const value=Number(form.elements[name].value);return Number.isFinite(value)&&form.elements[name].value!==''?value:null}
function yearsFrom(dateValue){if(!dateValue)return null;const birth=new Date(`${dateValue}T00:00:00`);const now=new Date();let age=now.getFullYear()-birth.getFullYear();const before=now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate());if(before)age--;return age>0?age:null}
function round(value,digits=0){const factor=10**digits;return Math.round(value*factor)/factor}
function bmiLabel(value){return value<18.5?'Ondergewicht':value<25?'Gezond bereik':value<30?'Verhoogd':value<35?'Obesitas klasse I':value<40?'Obesitas klasse II':'Obesitas klasse III'}
function activityFactor(value){return {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9}[value]||1.55}
function calorieAdjustment(goal){return {fat_loss:-400,maintain:0,muscle_gain:250,performance:150}[goal]||0}
function estimateMaxHr(age){return age?220-age:null}
function updateEstimatedMax(){const age=yearsFrom(form.elements.birth_date.value);const estimate=estimateMaxHr(age);document.getElementById('estimatedMaxHr').value=estimate?`${estimate} bpm · 220 − ${age}`:'Vul uw geboortedatum in';return estimate}
function openInfo(title,body,eyebrow='Uitleg'){document.getElementById('infoTitle').textContent=title;document.getElementById('infoBody').innerHTML=`<p>${body}</p>`;document.getElementById('infoEyebrow').textContent=eyebrow;infoBackdrop.hidden=false;document.body.classList.add('modal-open')}
function closeInfo(){infoBackdrop.hidden=true;document.body.classList.remove('modal-open')}

function proteinFactor(goal,gender,age){
  const table={
    male:{fat_loss:2,maintain:1.6,muscle_gain:2,performance:1.8},
    female:{fat_loss:1.6,maintain:1.3,muscle_gain:1.5,performance:1.6},
    other:{fat_loss:1.8,maintain:1.45,muscle_gain:1.75,performance:1.7}
  };
  let factor=(table[gender]||table.other)[goal]||1.6;
  if(age>=50)factor+=.1;
  return round(factor,2);
}
function fatFactor(goal,gender){
  const base=gender==='female'?.9:gender==='male'?.8:.85;
  return goal==='muscle_gain'?base+.05:goal==='fat_loss'?Math.max(.75,base-.05):base;
}
function recommendedPlan(goal){return goalPlans[goal]||goalPlans.maintain}

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
  const tdee=bmr?bmr*activityFactor(activity):null;
  const calorieTarget=tdee?Math.max(1200,Math.round(tdee+calorieAdjustment(goal))):null;
  const proteinPerKg=proteinFactor(goal,gender,age);
  const protein=Math.round(weight*proteinPerKg);
  const fat=Math.round(weight*fatFactor(goal,gender));
  const carbs=calorieTarget?Math.max(0,Math.round((calorieTarget-protein*4-fat*9)/4)):null;

  document.getElementById('bmrValue').textContent=bmr?Math.round(bmr):'—';
  document.getElementById('tdeeValue').textContent=tdee?Math.round(tdee):'—';
  document.getElementById('calorieValue').textContent=calorieTarget||'—';
  document.getElementById('calorieLabel').textContent=goal==='fat_loss'?'gematigd calorietekort':goal==='muscle_gain'?'gecontroleerd calorieoverschot':goal==='performance'?'prestatiegerichte energie-inname':'gewicht onderhouden';
  document.getElementById('proteinValue').textContent=protein;
  document.getElementById('proteinLabel').textContent=`${proteinPerKg} g per kg lichaamsgewicht`;
  document.getElementById('carbsValue').textContent=carbs??'—';
  document.getElementById('fatValue').textContent=fat;
  document.getElementById('waterValue').textContent=round(weight*.035,1);

  const plan=recommendedPlan(goal);
  const recommendedCard=document.getElementById('recommendedZoneCard');
  recommendedCard.classList.remove('zone-grey','zone-yellow','zone-green','zone-orange','zone-red');
  recommendedCard.classList.add(plan.className);
  document.getElementById('recommendedZoneValue').textContent=plan.title;
  document.getElementById('recommendedZoneLabel').textContent=plan.label;
  infoContent.recommended.body=plan.text;

  const maxHr=enteredMax||estimatedMax;
  const zonesEl=document.getElementById('heartRateZones');
  if(resting&&maxHr&&maxHr>resting){
    const reserve=maxHr-resting;
    zonesEl.innerHTML=zones.map(zone=>{
      const low=Math.round(resting+reserve*zone.low);
      const high=Math.round(resting+reserve*zone.high);
      const priority=zone.number===plan.primary?' is-primary':zone.number===plan.secondary?' is-secondary':'';
      const badge=zone.number===plan.primary?'<i>Hoofdzone</i>':zone.number===plan.secondary?'<i>Ondersteunend</i>':'';
      return `<button type="button" class="zone-row ${zone.className}${priority}" data-zone-title="${zone.name} · ${zone.label}" data-zone-body="${zone.description}"><span><b>${zone.name}</b><em>${zone.label}</em></span><strong>${low}–${high} bpm</strong><small>${Math.round(zone.low*100)}–${Math.round(zone.high*100)}% HRR</small>${badge}</button>`;
    }).join('');
    zonesEl.querySelectorAll('[data-zone-title]').forEach(button=>button.addEventListener('click',()=>openInfo(button.dataset.zoneTitle,button.dataset.zoneBody,'Hartslagzone')));
  }else{
    zonesEl.innerHTML='<p>Vul uw rusthartslag en geboortedatum of gemeten maximale hartslag in om de zones te berekenen.</p>';
  }

  const completed=['gender','birth_date','height_cm','weight_kg','activity_level','goal','resting_hr'].filter(name=>String(form.elements[name].value||'').trim()).length;
  const score=Math.round(completed/7*100);
  document.getElementById('profileScore').textContent=`${score}%`;
  document.getElementById('profileScoreText').textContent=score===100?'Profiel compleet':score>=70?'Bijna compleet':'Vul uw gegevens aan';
  setStatus('Berekeningen bijgewerkt.','success');
  return {gender,age,height,weight,bmi,bmr,tdee,calorieTarget,protein,carbs,fat,maxHr};
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