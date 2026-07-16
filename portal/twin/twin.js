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
let selectedBody='male';
let currentUser=null;
let currentAvatar=null;
let storedPhotoUrl=null;

function setStatus(text,type='error'){
  twinStatus.textContent=text;
  twinStatus.classList.toggle('success',type==='success');
}
function statusLabel(value){
  return {
    draft:'Concept',standard_active:'Standaard actief',uploaded:'Foto geüpload',processing:'In verwerking',ready:'My Twin gereed',failed:'Generatie mislukt'
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
    document.getElementById('fileName').textContent='Opgeslagen bronfoto geladen';
  }
}
function extensionFor(file){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  return ['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
}
async function signedUrl(path){
  if(!path)return null;
  const {data,error}=await client.storage.from('avatars').createSignedUrl(path,3600);
  if(error)throw error;
  return data?.signedUrl||null;
}
async function nextVersion(){
  const {data,error}=await client.from('avatar_versions').select('version').eq('user_id',currentUser.id).order('version',{ascending:false}).limit(1);
  if(error)throw error;
  return (data?.[0]?.version||0)+1;
}
async function saveVersion(payload){
  const {error}=await client.from('avatar_versions').insert(payload);
  if(error)throw error;
}
async function saveStandard(){
  const version=await nextVersion();
  const payload={
    user_id:currentUser.id,
    avatar_type:'standard',
    body_type:selectedBody,
    suit_style:'performance_black',
    status:'standard_active',
    source_photo_path:null,
    active_avatar_path:null,
    current_version:version,
    consent_at:null,
    updated_at:new Date().toISOString()
  };
  const {error}=await client.from('user_avatars').upsert(payload,{onConflict:'user_id'});
  if(error)throw error;
  await saveVersion({user_id:currentUser.id,version,avatar_type:'standard',body_type:selectedBody,status:'standard_active',notes:'FitConnect standaardbody geactiveerd'});
  currentAvatar=payload;
  avatarStatus.textContent='Standaard actief';
  avatarVersion.textContent=`Versie ${version}`;
  generateButton.disabled=true;
  setStatus('Uw standaard FitConnect-avatar is veilig opgeslagen.','success');
}
async function uploadPersonal(){
  const file=photoInput.files?.[0];
  if(!file){setStatus('Selecteer eerst een nieuwe foto.');return}
  if(file.size>10*1024*1024){setStatus('De foto is groter dan 10 MB. Kies een kleiner bestand.');return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('Gebruik een JPG-, PNG- of WebP-afbeelding.');return}
  if(!document.getElementById('avatarConsent').checked){setStatus('Geef eerst toestemming voor veilige opslag en AI-verwerking.');return}

  const version=await nextVersion();
  const path=`${currentUser.id}/source/v${version}-${Date.now()}.${extensionFor(file)}`;
  const {error:uploadError}=await client.storage.from('avatars').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(uploadError)throw uploadError;

  const now=new Date().toISOString();
  const payload={
    user_id:currentUser.id,
    avatar_type:'ai',
    body_type:'personal',
    suit_style:'performance_black',
    status:'uploaded',
    source_photo_path:path,
    active_avatar_path:currentAvatar?.active_avatar_path||null,
    current_version:version,
    consent_at:now,
    updated_at:now
  };
  const {error}=await client.from('user_avatars').upsert(payload,{onConflict:'user_id'});
  if(error)throw error;
  await saveVersion({user_id:currentUser.id,version,avatar_type:'ai',body_type:'personal',status:'uploaded',source_photo_path:path,notes:'Bronfoto veilig geüpload; wacht op AI-generatie'});

  currentAvatar=payload;
  storedPhotoUrl=await signedUrl(path);
  if(storedPhotoUrl){photoPreview.src=storedPhotoUrl;photoPreview.hidden=false;silhouette.hidden=true}
  avatarStatus.textContent='Foto geüpload';
  avatarVersion.textContent=`Versie ${version}`;
  generateButton.disabled=false;
  setStatus('Uw foto is veilig opgeslagen. My Twin is klaar voor de toekomstige AI-generatiestap.','success');
}
async function loadAvatar(){
  const {data,error}=await client.from('user_avatars').select('*').eq('user_id',currentUser.id).maybeSingle();
  if(error){
    if(error.message?.includes('user_avatars'))setStatus('Voer eerst de Avatar Foundation SQL uit in Supabase.');
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
  avatarStatus.textContent=statusLabel(data.status);
  avatarVersion.textContent=`Versie ${data.current_version||1}`;
  selectBody(data.body_type||'male');
  generateButton.disabled=!(data.avatar_type==='ai'&&['uploaded','failed'].includes(data.status));
  if(data.source_photo_path){
    try{
      storedPhotoUrl=await signedUrl(data.source_photo_path);
      if(selectedBody==='personal'&&storedPhotoUrl){photoPreview.src=storedPhotoUrl;photoPreview.hidden=false;silhouette.hidden=true;document.getElementById('fileName').textContent='Opgeslagen bronfoto geladen'}
    }catch(error){setStatus('De opgeslagen foto kon niet tijdelijk worden geladen.')}
  }
}

options.forEach(button=>button.addEventListener('click',()=>selectBody(button.dataset.body)));
photoInput.addEventListener('change',()=>{
  const file=photoInput.files?.[0];
  if(!file)return;
  document.getElementById('fileName').textContent=file.name;
  const localUrl=URL.createObjectURL(file);
  photoPreview.src=localUrl;
  photoPreview.hidden=false;
  silhouette.hidden=true;
  avatarStatus.textContent='Nieuwe foto geselecteerd';
  setStatus('Controleer de voorvertoning en klik daarna op Keuze opslaan.','success');
});

saveButton.addEventListener('click',async()=>{
  if(!currentUser)return;
  saveButton.disabled=true;
  saveButton.textContent='Opslaan…';
  try{
    if(selectedBody==='personal')await uploadPersonal();
    else await saveStandard();
  }catch(error){setStatus(error.message||'Opslaan is mislukt.')}
  finally{saveButton.disabled=false;saveButton.textContent='Keuze opslaan'}
});

generateButton.addEventListener('click',()=>{
  setStatus('De foto en versiegeschiedenis staan klaar. De daadwerkelijke AI-generator wordt in de volgende bouwstap aangesloten.','success');
});

document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});

async function guard(){
  if(!client){location.replace('../../login/?login=required');return}
  const {data:{session}}=await client.auth.getSession();
  if(!session){location.replace('../../login/?login=required');return}
  currentUser=session.user;
  await loadAvatar();
}

guard().catch(error=>setStatus(error.message||'My Twin kon niet worden geladen.'));