const client=window.getFitConnectSupabase?.();
const statusEl=document.getElementById('pageStatus');
const fromSelect=document.getElementById('fromMeasurement');
const toSelect=document.getElementById('toMeasurement');
const chartMetric=document.getElementById('chartMetric');
let measurements=[];
let profile=null;

const metricDefinitions=[
  {key:'weight_kg',label:'Gewicht',unit:'kg',digits:1,lowerIsBetter:null},
  {key:'bodyfat_percent',label:'Vetpercentage',unit:'%',digits:1,lowerIsBetter:true},
  {key:'bmi',label:'BMI',unit:'',digits:1,lowerIsBetter:true},
  {key:'waist',label:'Taille / buik',unit:'cm',digits:1,lowerIsBetter:true},
  {key:'neck_cm',label:'Nek',unit:'cm',digits:1,lowerIsBetter:null},
  {key:'hip_cm',label:'Heupen',unit:'cm',digits:1,lowerIsBetter:null}
];

function setStatus(text,type='error'){statusEl.textContent=text;statusEl.classList.toggle('success',type==='success')}
function valueFor(item,key){if(key==='waist')return item.waist_cm??item.abdomen_cm??null;return item[key]??null}
function formatValue(value,definition){if(value==null||!Number.isFinite(Number(value)))return '—';return `${Number(value).toFixed(definition.digits)}${definition.unit?` ${definition.unit}`:''}`}
function dateLabel(value){return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}
function shortDate(value){return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(value))}
function daysBetween(a,b){return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000))}
function goalLabel(value){return {fat_loss:'Vetverlies',maintain:'Onderhoud',muscle_gain:'Spieropbouw',performance:'Sportprestatie'}[value]||'Niet ingesteld'}
function scanName(index){return index===0?'0-meting':`Progress ${index}`}
function deltaClass(definition,delta){if(!Number.isFinite(delta)||Math.abs(delta)<.05)return 'neutral';if(definition.key==='weight_kg'){
    if(profile?.goal==='fat_loss')return delta<0?'good':'bad';
    if(profile?.goal==='muscle_gain')return delta>0?'good':'neutral';
    return 'neutral';
  }
  if(definition.lowerIsBetter===true)return delta<0?'good':'bad';
  return 'neutral';
}
function deltaText(delta,definition){if(!Number.isFinite(delta))return '—';const sign=delta>0?'+':'';return `${sign}${delta.toFixed(definition.digits)}${definition.unit?` ${definition.unit}`:''}`}

function populateSelectors(){
  const options=measurements.map((item,index)=>`<option value="${index}">${scanName(index)} · ${dateLabel(item.measured_at)}</option>`).join('');
  fromSelect.innerHTML=options;toSelect.innerHTML=options;
  fromSelect.value='0';toSelect.value=String(measurements.length-1);
}

function renderSummary(){
  const first=measurements[0],last=measurements[measurements.length-1];
  document.getElementById('scanCount').textContent=measurements.length;
  document.getElementById('daysTracked').textContent=daysBetween(first.measured_at,last.measured_at);
  document.getElementById('confidenceValue').textContent=`${last.confidence_score??'—'}%`;
  document.getElementById('goalValue').textContent=goalLabel(profile?.goal);
  const next=new Date(last.measured_at);next.setDate(next.getDate()+14);
  document.getElementById('nextScanDate').textContent=dateLabel(next);
  const diff=Math.ceil((next-new Date())/86400000);
  document.getElementById('nextScanText').textContent=diff>0?`Over ongeveer ${diff} dagen`:'Een nieuwe scan is nu zinvol';
}

function renderComparison(){
  const from=measurements[Number(fromSelect.value)],to=measurements[Number(toSelect.value)];
  const container=document.getElementById('metricComparison');
  container.innerHTML=metricDefinitions.map(definition=>{
    const start=Number(valueFor(from,definition.key));
    const end=Number(valueFor(to,definition.key));
    const validStart=Number.isFinite(start),validEnd=Number.isFinite(end);
    const delta=validStart&&validEnd?end-start:NaN;
    return `<article class="metric-card"><span>${definition.label}</span><div class="metric-values"><div><small>Start</small><strong>${formatValue(validStart?start:null,definition)}</strong></div><div><small>Nu</small><strong>${formatValue(validEnd?end:null,definition)}</strong></div></div><b class="metric-delta ${deltaClass(definition,delta)}">${deltaText(delta,definition)}</b></article>`;
  }).join('');
  renderCoach(from,to);
}

function renderCoach(from,to){
  const goal=profile?.goal;
  const weightDelta=(to.weight_kg??NaN)-(from.weight_kg??NaN);
  const bodyfatDelta=(to.bodyfat_percent??NaN)-(from.bodyfat_percent??NaN);
  const waistStart=valueFor(from,'waist'),waistEnd=valueFor(to,'waist');
  const waistDelta=(waistEnd??NaN)-(waistStart??NaN);
  let title='Uw eerste vergelijking is gereed.';
  let text=`Over ${daysBetween(from.measured_at,to.measured_at)} dagen zijn uw gekozen metingen met elkaar vergeleken.`;
  if(goal==='fat_loss'){
    if(Number.isFinite(weightDelta)&&weightDelta<0){title='Uw gewicht beweegt richting uw doel.';text=`U bent ${Math.abs(weightDelta).toFixed(1)} kg lichter binnen deze vergelijking.${Number.isFinite(waistDelta)&&waistDelta<0?` Uw taille of buik nam daarnaast ${Math.abs(waistDelta).toFixed(1)} cm af.`:''} Blijf ook krachttraining en voldoende eiwit gebruiken om vetvrije massa zo goed mogelijk te behouden.`}
    else if(Number.isFinite(weightDelta)){title='Uw vetverlies vraagt mogelijk om een nieuwe controle.';text='Uw gewicht daalde binnen deze periode niet. Kijk eerst naar de trend over meerdere weken, meetomstandigheden en naleving voordat u calorieën verder verlaagt.'}
  }else if(goal==='muscle_gain'){
    if(Number.isFinite(weightDelta)&&weightDelta>0){title='Uw lichaamsgewicht stijgt binnen uw spieropbouwfase.';text=`U bent ${weightDelta.toFixed(1)} kg zwaarder.${Number.isFinite(bodyfatDelta)&&bodyfatDelta>1?` Het geschatte vetpercentage steeg ook ${bodyfatDelta.toFixed(1)} procentpunt; een kleiner calorieoverschot kan dan passend zijn.`:' De trend lijkt beheerst, maar beoordeel ook krachtprogressie en omtrekken.'}`}
    else{title='Uw spieropbouwtrend is nog beperkt zichtbaar.';text='Voor spieropbouw zijn meerdere meetmomenten, krachtprogressie en voldoende energie-inname belangrijker dan één losse gewichtsmeting.'}
  }else if(goal==='performance'){
    title='Gebruik lichaamsdata samen met prestaties.';text='Bij sportprestatie is lichaamsgewicht slechts één onderdeel. Koppel deze trend later aan trainingsvolume, kracht, rusthartslag en herstel.';
  }else{
    title='Uw onderhoudstrend is zichtbaar.';text='Bij onderhoud zijn kleine schommelingen normaal. Kijk vooral naar stabiliteit over meerdere meetmomenten en naar veranderingen in omtrek en vetpercentage.';
  }
  document.getElementById('coachTitle').textContent=title;
  document.getElementById('coachText').textContent=text;
}

function renderJourney(){
  const container=document.getElementById('journeyTimeline');
  container.innerHTML=measurements.slice().reverse().map((item,reverseIndex)=>{
    const index=measurements.length-1-reverseIndex;
    const details=[];
    if(item.weight_kg!=null)details.push(`${Number(item.weight_kg).toFixed(1)} kg`);
    if(item.bodyfat_percent!=null)details.push(`${Number(item.bodyfat_percent).toFixed(1)}% vet`);
    const waist=valueFor(item,'waist');if(waist!=null)details.push(`${Number(waist).toFixed(1)} cm taille/buik`);
    return `<div class="journey-item"><time>${dateLabel(item.measured_at)}</time><div><strong>${scanName(index)}</strong><small>${details.join(' · ')||'BodyScan opgeslagen'}</small></div></div>`;
  }).join('');
}

function renderChart(){
  const key=chartMetric.value;
  const definition=metricDefinitions.find(item=>item.key===key)||metricDefinitions[0];
  const points=measurements.map((item,index)=>({index,date:item.measured_at,value:Number(valueFor(item,key))})).filter(point=>Number.isFinite(point.value));
  const svg=document.getElementById('progressChart');
  const legend=document.getElementById('chartLegend');
  if(points.length<2){svg.innerHTML='<text x="450" y="180" text-anchor="middle" class="chart-label">Minimaal twee bruikbare metingen nodig voor een trend.</text>';legend.innerHTML='';return}
  const width=900,height=360,pad={left:62,right:34,top:36,bottom:56};
  let min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value));
  if(min===max){min-=1;max+=1}else{const extra=(max-min)*.15;min-=extra;max+=extra}
  const x=index=>pad.left+(index/(points.length-1))*(width-pad.left-pad.right);
  const y=value=>pad.top+(max-value)/(max-min)*(height-pad.top-pad.bottom);
  const line=points.map((p,i)=>`${i?'L':'M'} ${x(i)} ${y(p.value)}`).join(' ');
  const area=`${line} L ${x(points.length-1)} ${height-pad.bottom} L ${x(0)} ${height-pad.bottom} Z`;
  let grid='';for(let i=0;i<5;i++){const gy=pad.top+i*(height-pad.top-pad.bottom)/4;const value=max-i*(max-min)/4;grid+=`<line class="chart-grid" x1="${pad.left}" y1="${gy}" x2="${width-pad.right}" y2="${gy}"></line><text class="chart-label" x="${pad.left-12}" y="${gy+4}" text-anchor="end">${value.toFixed(definition.digits)}</text>`}
  const circles=points.map((p,i)=>`<circle class="chart-point" cx="${x(i)}" cy="${y(p.value)}" r="7"></circle><text class="chart-value" x="${x(i)}" y="${y(p.value)-16}" text-anchor="middle">${p.value.toFixed(definition.digits)}</text><text class="chart-label" x="${x(i)}" y="${height-pad.bottom+28}" text-anchor="middle">${shortDate(p.date)}</text>`).join('');
  svg.innerHTML=`${grid}<path class="chart-area" d="${area}"></path><path class="chart-line" d="${line}"></path>${circles}`;
  legend.innerHTML=points.map((point,index)=>`<span>${scanName(measurements.indexOf(measurements.find(m=>m.measured_at===point.date)))} · ${point.value.toFixed(definition.digits)} ${definition.unit}</span>`).join('');
}

async function init(){
  if(!client){location.replace('../../login/?login=required');return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){location.replace('../../login/?login=required');return}
  const [measurementResponse,profileResponse]=await Promise.all([
    client.from('body_measurements').select('*').eq('user_id',session.user.id).order('measured_at',{ascending:true}),
    client.from('performance_profiles').select('goal').eq('user_id',session.user.id).maybeSingle()
  ]);
  if(measurementResponse.error){setStatus(measurementResponse.error.message||'Uw metingen konden niet worden geladen.');return}
  measurements=measurementResponse.data||[];profile=profileResponse.data||null;
  if(!measurements.length){document.getElementById('emptyState').hidden=false;document.getElementById('progressContent').hidden=true;setStatus('Nog geen nulmeting gevonden.');return}
  document.getElementById('emptyState').hidden=true;document.getElementById('progressContent').hidden=false;
  populateSelectors();renderSummary();renderComparison();renderJourney();renderChart();
  setStatus('Uw Progress Center is bijgewerkt.','success');
}

fromSelect.addEventListener('change',renderComparison);
toSelect.addEventListener('change',renderComparison);
chartMetric.addEventListener('change',renderChart);
document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});
init().catch(error=>setStatus(error.message||'Progress Center kon niet worden geladen.'));