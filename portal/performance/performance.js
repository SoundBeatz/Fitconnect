const client=window.getFitConnectSupabase?.();
const form=document.getElementById('performanceForm');
const statusEl=document.getElementById('formStatus');
const saveState=document.getElementById('saveState');
let currentUser=null;

function setStatus(text,type='error'){
  statusEl.textContent=text;
  statusEl.classList.toggle('success',type==='success');
}
function number(name){const value=Number(form.elements[name].value);return Number.isFinite(value)?value:null}
function yearsFrom(dateValue){
  if(!dateValue)return null;
  const birth=new Date(dateValue);const now=new Date();
  let age=now.getFullYear()-birth.getFullYear();
  const beforeBirthday=now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate());
  if(beforeBirthday)age--;
  return age>0?age:null;
}
function round(value,digits=0){const factor=10**digits;return Math.round(value*factor)/factor}
function bmiLabel(value){return value<18.5?'Ondergewicht':value<25?'Gezond bereik':value<30?'Verhoogd':value<35?'Obesitas klasse I':value<40?'Obesitas klasse II':'Obesitas klasse III'}
function activityFactor(value){return {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9}[value]||1.55}
function proteinFactor(goal){return {fat_loss:2.0,maintain:1.6,muscle_gain:1.8,performance:1.8}[goal]||1.6}
function calorieAdjustment(goal){return {fat_loss:-400,maintain:0,muscle_gain:250,performance:150}[goal]||0}
function calculate(){
  const gender=form.elements.gender.value;
  const age=yearsFrom(form.elements.birth_date.value);
  const height=number('height_cm');
  const weight=number('weight_kg');
  const resting=number('resting_hr');
  const enteredMax=number('max_hr');
  const activity=form.elements.activity_level.value;
  const goal=form.elements.goal.value;
  if(!height||!weight){setStatus('Vul minimaal uw lengte en gewicht in.');return null}

  const bmi=weight/((height/100)**2);
  document.getElementById('bmiValue').textContent=round(bmi,1);
  document.getElementById('bmiLabel').textContent=bmiLabel(bmi);

  let bmr=null;
  if(age&&gender){
    const base=10*weight+6.25*height-5*age;
    bmr=gender==='male'?base+5:gender==='female'?base-161:base-78;
  }
  const tdee=bmr?bmr*activityFactor(activity)+calorieAdjustment(goal):null;
  document.getElementById('bmrValue').textContent=bmr?Math.round(bmr):'—';
  document.getElementById('tdeeValue').textContent=tdee?Math.max(1200,Math.round(tdee)):'—';
  document.getElementById('proteinValue').textContent=Math.round(weight*proteinFactor(goal));
  document.getElementById('waterValue').textContent=round(weight*0.035,1);

  const estimatedMax=age?208-(0.7*age):null;
  const maxHr=enteredMax||estimatedMax;
  const zonesEl=document.getElementById('heartRateZones');
  if(resting&&maxHr&&maxHr>resting){
    const reserve=maxHr-resting;
    const ranges=[[.50,.60],[.60,.70],[.70,.80],[.80,.90],[.90,1.00]];
    zonesEl.innerHTML=ranges.map((range,index)=>{
      const low=Math.round(resting+reserve*range[0]);
      const high=Math.round(resting+reserve*range[1]);
      return `<div class="zone-row"><span>Zone ${index+1}</span><strong>${low}–${high} bpm</strong><small>${Math.round(range[0]*100)}–${Math.round(range[1]*100)}% HRR</small></div>`;
    }).join('');
    const zone2Low=Math.round(resting+reserve*.60);const zone2High=Math.round(resting+reserve*.70);
    document.getElementById('zone2Value').textContent=`${zone2Low}–${zone2High}`;
  }else{
    zonesEl.innerHTML='<p>Vul uw rusthartslag en geboortedatum of maximale hartslag in om de zones te berekenen.</p>';
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
  if(error){
    if(error.message?.includes('performance_profiles'))setStatus('De Performance Center-database moet nog eenmalig in Supabase worden geactiveerd.');
    else setStatus(error.message||'Uw profiel kon niet worden geladen.');
    return;
  }
  if(data){
    Object.entries(data).forEach(([key,value])=>{if(form.elements[key]&&value!==null)form.elements[key].value=value});
    saveState.textContent='Profiel geladen';
    calculate();
  }else{
    saveState.textContent='Nieuw profiel';
  }
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const result=calculate();
  if(!result||!currentUser)return;
  const payload={
    user_id:currentUser.id,
    gender:form.elements.gender.value||null,
    birth_date:form.elements.birth_date.value||null,
    height_cm:number('height_cm'),
    weight_kg:number('weight_kg'),
    bodyfat_percent:number('bodyfat_percent'),
    activity_level:form.elements.activity_level.value,
    goal:form.elements.goal.value,
    resting_hr:number('resting_hr'),
    max_hr:number('max_hr'),
    updated_at:new Date().toISOString()
  };
  saveState.textContent='Opslaan…';
  const {error}=await client.from('performance_profiles').upsert(payload,{onConflict:'user_id'});
  if(error){setStatus(error.message||'Opslaan is mislukt.');saveState.textContent='Niet opgeslagen';return}
  saveState.textContent='Opgeslagen';
  setStatus('Uw Performance-profiel is veilig opgeslagen.','success');
});

document.getElementById('calculateOnly').addEventListener('click',calculate);
form.addEventListener('input',()=>{saveState.textContent='Niet-opgeslagen wijziging';calculate()});
document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});
loadProfile().catch(error=>setStatus(error.message||'Het Performance Center kon niet worden geladen.'));
