const client=window.getFitConnectSupabase?.();
const options=[...document.querySelectorAll('.body-option')];
const uploadCard=document.getElementById('uploadCard');
const photoInput=document.getElementById('avatarPhoto');
const photoPreview=document.getElementById('photoPreview');
const silhouette=document.querySelector('.preview-silhouette');
const selectedType=document.getElementById('selectedType');
const avatarStatus=document.getElementById('avatarStatus');
const avatarVersion=document.getElementById('avatarVersion');
const twinStatus=document.getElementById('twinStatus');
const saveButton=document.getElementById('saveChoice');
const generateButton=document.getElementById('generateAvatar');
const MAX_SOURCE_BYTES=50*1024*1024;
const MAX_INTERMEDIATE_BYTES=4*1024*1024;
const MAX_INTERMEDIATE_DIMENSION=2048;
const MAX_DECODE_DIMENSION=12000;
const LOCAL_DECODE_TIMEOUT_MS=20000;
const CANVAS_ENCODE_TIMEOUT_MS=15000;
const EDGE_TIMEOUT_MS=45000;
const ALLOWED_SOURCE_TYPES=new Set(['image/jpeg','image/png','image/webp']);
let selectedBody='male';
let currentUser=null;
let currentAvatar=null;
let storedPhotoUrl=null;
let previewObjectUrl=null;

function setStatus(text,type='error'){
  twinStatus.textContent=text;
  twinStatus.classList.toggle('success',type==='success');
}
function statusLabel(value,avatarType){
  if(avatarType==='standard'&&value==='ready')return 'Standaard actief';
  return {
    draft:'Concept',uploaded:'Foto veilig verwerkt',processing:'In verwerking',ready:'My Twin gereed',failed:'Generatie mislukt'
  }[value]||'Niet ingesteld';
}
function selectBody(value){
  selectedBody=value;
  options.forEach(button=>button.classList.toggle('active',button.dataset.body===value));
  uploadCard.hidden=value!=='personal';
  selectedType.textContent=value==='male'?'Performance Man':value==='female'?'Performance Vrouw':'Persoonlijke AI-avatar';
  if(value!=='personal'){
    photoPreview.hidden=true;
    silhouette.hidden=false;
    document.getElementById('fileName').textContent='Nog geen nieuwe foto geselecteerd';
  }else if(storedPhotoUrl&&!photoInput.files?.[0]){
    photoPreview.src=storedPhotoUrl;
    photoPreview.hidden=false;
    silhouette.hidden=true;
    document.getElementById('fileName').textContent='Opgeslagen beveiligde foto geladen';
  }
}
async function signedUrl(path){
  if(!path)return null;
  const {data,error}=await client.storage.from('avatars').createSignedUrl(path,3600);
  if(error)throw error;
  return data?.signedUrl||null;
}
async function nextVersion(avatarId){
  if(!avatarId)return 1;
  const {data,error}=await client.from('avatar_versions').select('version').eq('avatar_id',avatarId).order('version',{ascending:false}).limit(1);
  if(error)throw error;
  return (data?.[0]?.version||0)+1;
}
async function saveVersion(payload){
  const {error}=await client.from('avatar_versions').insert(payload);
  if(error)throw error;
}
async function saveStandard(){
  const basePayload={
    user_id:currentUser.id,
    avatar_type:'standard',
    gender:selectedBody,
    suit:'performance',
    status:'draft',
    source_photo:null,
    source_sha256:null,
    source_bytes:null,
    processed_bytes:null,
    processed_width:null,
    processed_height:null,
    updated_at:new Date().toISOString()
  };
  const {data:avatar,error:avatarError}=await client.from('user_avatars').upsert(basePayload,{onConflict:'user_id'}).select('*').single();
  if(avatarError||!avatar?.id)throw avatarError||new Error('Avatarprofiel kon niet worden opgeslagen.');
  const version=await nextVersion(avatar.id);
  await saveVersion({avatar_id:avatar.id,version,notes:`FitConnect standaardbody ${selectedBody} geactiveerd`});
  const {data:readyAvatar,error:readyError}=await client.from('user_avatars').update({status:'ready',active_version:version,updated_at:new Date().toISOString()}).eq('id',avatar.id).eq('user_id',currentUser.id).select('*').single();
  if(readyError)throw readyError;
  currentAvatar=readyAvatar;
  storedPhotoUrl=null;
  avatarStatus.textContent='Standaard actief';
  avatarVersion.textContent=`Versie ${version}`;
  generateButton.disabled=true;
  setStatus('Uw standaard FitConnect-avatar is veilig opgeslagen.','success');
}

function canvasToJpeg(canvas,quality){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>{
      if(settled)return;
      settled=true;
      reject(new Error('Het lokaal beveiligen van de foto duurde te lang. Probeer de foto opnieuw.'));
    },CANVAS_ENCODE_TIMEOUT_MS);
    canvas.toBlob(blob=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      blob?resolve(blob):reject(new Error('De foto kon niet veilig worden voorbereid.'));
    },'image/jpeg',quality);
  });
}

function decodeSourceElement(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const image=new Image();
    let settled=false;
    const cleanup=()=>URL.revokeObjectURL(url);
    const finishError=(message)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      cleanup();
      reject(new Error(message));
    };
    const timer=setTimeout(()=>finishError('De browser kon deze foto niet binnen 20 seconden openen. Probeer een andere foto of sla hem opnieuw op als JPG.'),LOCAL_DECODE_TIMEOUT_MS);
    image.onload=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      const width=image.naturalWidth||image.width;
      const height=image.naturalHeight||image.height;
      if(!width||!height){cleanup();reject(new Error('De foto bevat geen geldige afbeeldingsafmetingen.'));return}
      resolve({image,width,height,cleanup});
    };
    image.onerror=()=>finishError('De browser kon deze afbeelding niet openen. Gebruik een geldige JPG-, PNG- of WebP-foto.');
    image.decoding='async';
    image.src=url;
  });
}

async function normalizeSourceImage(file){
  if(!file)throw new Error('Selecteer eerst een foto.');
  if(file.size<=0||file.size>MAX_SOURCE_BYTES)throw new Error('Gebruik een foto van maximaal 50 MB.');
  if(!ALLOWED_SOURCE_TYPES.has(file.type))throw new Error('Gebruik een JPG-, PNG- of WebP-afbeelding.');

  setStatus('Stap 1/3 · Foto veilig openen op uw apparaat…','success');
  const decoded=await decodeSourceElement(file);
  try{
    if(decoded.width<256||decoded.height<256)throw new Error('De foto heeft onvoldoende resolutie. Gebruik minimaal 256 × 256 pixels.');
    if(decoded.width>MAX_DECODE_DIMENSION||decoded.height>MAX_DECODE_DIMENSION)throw new Error('De foto heeft extreem grote pixelafmetingen. Verklein de foto eerst en probeer opnieuw.');

    setStatus('Stap 2/3 · Foto verkleinen en metadata verwijderen…','success');
    const maxSide=Math.max(decoded.width,decoded.height);
    const scale=Math.min(1,MAX_INTERMEDIATE_DIMENSION/maxSide);
    const width=Math.max(1,Math.round(decoded.width*scale));
    const height=Math.max(1,Math.round(decoded.height*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d',{alpha:false});
    if(!context)throw new Error('Uw browser kan deze foto niet veilig verwerken.');
    context.fillStyle='#fff';
    context.fillRect(0,0,width,height);
    context.drawImage(decoded.image,0,0,width,height);

    let quality=.88;
    let blob=await canvasToJpeg(canvas,quality);
    while(blob.size>MAX_INTERMEDIATE_BYTES&&quality>.58){
      quality-=.08;
      blob=await canvasToJpeg(canvas,quality);
    }
    if(blob.size>MAX_INTERMEDIATE_BYTES)throw new Error('De foto kon niet binnen de veilige verwerkingslimiet worden gebracht.');
    return new File([blob],'my-twin-secure-upload.jpg',{type:'image/jpeg',lastModified:Date.now()});
  }finally{
    decoded.cleanup();
  }
}

async function edgeErrorMessage(error){
  try{
    const response=error?.context;
    if(response?.clone){
      const body=await response.clone().json();
      if(body?.error)return body.error;
    }
  }catch{}
  return error?.message||'Veilige beeldverwerking is mislukt.';
}

async function invokeImageIngest(formData){
  let timeoutId;
  const timeout=new Promise((_,reject)=>{
    timeoutId=setTimeout(()=>reject(new Error('De beveiligde upload duurde te lang. Controleer uw verbinding en probeer opnieuw.')),EDGE_TIMEOUT_MS);
  });
  try{
    return await Promise.race([
      client.functions.invoke('my-twin-image-ingest',{body:formData}),
      timeout
    ]);
  }finally{
    clearTimeout(timeoutId);
  }
}

async function uploadPersonal(){
  const file=photoInput.files?.[0];
  if(!file){setStatus('Selecteer eerst een nieuwe foto.');return}
  if(file.size>MAX_SOURCE_BYTES){setStatus('De foto is groter dan 50 MB. Kies een kleiner bestand.');return}
  if(!ALLOWED_SOURCE_TYPES.has(file.type)){setStatus('Gebruik een JPG-, PNG- of WebP-afbeelding.');return}
  if(!document.getElementById('avatarConsent').checked){setStatus('Geef eerst toestemming voor veilige opslag en AI-verwerking.');return}

  avatarStatus.textContent='Veilig verwerken…';
  const securedFile=await normalizeSourceImage(file);
  setStatus('Stap 3/3 · Beveiligde versie privé opslaan…','success');
  const formData=new FormData();
  formData.append('file',securedFile);
  formData.append('consent','true');
  const {data,error}=await invokeImageIngest(formData);
  if(error)throw new Error(await edgeErrorMessage(error));
  if(!data?.ok||!data?.path)throw new Error(data?.error||'De server heeft de foto niet geaccepteerd.');

  currentAvatar={
    ...(currentAvatar||{}),
    user_id:currentUser.id,
    avatar_type:'ai',
    gender:null,
    suit:'performance',
    status:data.status||'uploaded',
    source_photo:data.path,
    active_version:data.version
  };
  storedPhotoUrl=await signedUrl(data.path);
  if(storedPhotoUrl){
    photoPreview.src=storedPhotoUrl;
    photoPreview.hidden=false;
    silhouette.hidden=true;
  }
  avatarStatus.textContent='Foto veilig verwerkt';
  avatarVersion.textContent=`Versie ${data.version}`;
  generateButton.disabled=false;
  document.getElementById('fileName').textContent=`Veilig verwerkt · ${Math.max(1,Math.round((data.processedBytes||0)/1024))} KB`;
  setStatus('Uw bronfoto is lokaal verkleind; metadata is verwijderd en alleen de beveiligde privéversie is opgeslagen.','success');
}
async function loadAvatar(){
  const {data,error}=await client.from('user_avatars').select('*').eq('user_id',currentUser.id).maybeSingle();
  if(error){
    if(error.message?.includes('user_avatars'))setStatus('My Twin kon het avatarprofiel niet laden.');
    else setStatus(error.message||'Uw avatar kon niet worden geladen.');
    return;
  }
  if(!data){
    avatarStatus.textContent='Niet ingesteld';
    avatarVersion.textContent='Versie —';
    selectBody('male');
    return;
  }
  currentAvatar=data;
  avatarStatus.textContent=statusLabel(data.status,data.avatar_type);
  avatarVersion.textContent=`Versie ${data.active_version||1}`;
  const body=data.avatar_type==='ai'&&data.source_photo?'personal':(data.gender||'male');
  selectBody(body);
  generateButton.disabled=!(data.avatar_type==='ai'&&['uploaded','failed'].includes(data.status));
  if(data.source_photo){
    try{
      storedPhotoUrl=await signedUrl(data.source_photo);
      if(body==='personal'&&storedPhotoUrl){photoPreview.src=storedPhotoUrl;photoPreview.hidden=false;silhouette.hidden=true;document.getElementById('fileName').textContent='Opgeslagen beveiligde foto geladen'}
    }catch(error){setStatus('De opgeslagen foto kon niet tijdelijk worden geladen.')}
  }
}

options.forEach(button=>button.addEventListener('click',()=>selectBody(button.dataset.body)));
photoInput.addEventListener('change',()=>{
  const file=photoInput.files?.[0];
  if(!file)return;
  if(file.size>MAX_SOURCE_BYTES){
    photoInput.value='';
    setStatus('De foto is groter dan 50 MB. Kies een kleiner bestand.');
    return;
  }
  if(!ALLOWED_SOURCE_TYPES.has(file.type)){
    photoInput.value='';
    setStatus('Gebruik een JPG-, PNG- of WebP-afbeelding.');
    return;
  }
  document.getElementById('fileName').textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;
  if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl=URL.createObjectURL(file);
  photoPreview.src=previewObjectUrl;
  photoPreview.hidden=false;
  silhouette.hidden=true;
  avatarStatus.textContent='Nieuwe foto geselecteerd';
  setStatus('Controleer de voorvertoning. Bij opslaan wordt de foto automatisch verkleind en beveiligd.','success');
});

saveButton.addEventListener('click',async()=>{
  if(!currentUser)return;
  saveButton.disabled=true;
  saveButton.textContent='Veilig opslaan…';
  try{
    if(selectedBody==='personal')await uploadPersonal();
    else await saveStandard();
  }catch(error){setStatus(error.message||'Opslaan is mislukt.');avatarStatus.textContent='Opslaan mislukt'}
  finally{saveButton.disabled=false;saveButton.textContent='Keuze opslaan'}
});

generateButton.addEventListener('click',()=>{
  setStatus('De beveiligde foto en versiegeschiedenis staan klaar. De daadwerkelijke AI-generator wordt in de volgende bouwstap aangesloten.','success');
});

document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});
window.addEventListener('beforeunload',()=>{if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl)});

async function guard(){
  if(!client){location.replace('../../login/?login=required');return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){location.replace('../../login/?login=required');return}
  currentUser=session.user;
  await loadAvatar();
}

guard().catch(error=>setStatus(error.message||'My Twin kon niet worden geladen.'));
