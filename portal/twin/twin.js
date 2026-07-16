const client=window.getFitConnectSupabase?.();
const options=[...document.querySelectorAll('.body-option')];
const uploadCard=document.getElementById('uploadCard');
const photoInput=document.getElementById('avatarPhoto');
const photoPreview=document.getElementById('photoPreview');
const silhouette=document.querySelector('.preview-silhouette');
const selectedType=document.getElementById('selectedType');
const avatarStatus=document.getElementById('avatarStatus');
const twinStatus=document.getElementById('twinStatus');
let selectedBody='male';
let currentUser=null;

function setStatus(text,type='error'){twinStatus.textContent=text;twinStatus.classList.toggle('success',type==='success')}
function selectBody(value){selectedBody=value;options.forEach(button=>button.classList.toggle('active',button.dataset.body===value));uploadCard.hidden=value!=='personal';selectedType.textContent=value==='male'?'Performance Man':value==='female'?'Performance Vrouw':'Persoonlijke AI-avatar';if(value!=='personal'){photoPreview.hidden=true;silhouette.hidden=false;document.getElementById('fileName').textContent='Nog geen foto geselecteerd'}}

options.forEach(button=>button.addEventListener('click',()=>selectBody(button.dataset.body)));
photoInput.addEventListener('change',()=>{const file=photoInput.files?.[0];if(!file)return;document.getElementById('fileName').textContent=file.name;const reader=new FileReader();reader.onload=()=>{photoPreview.src=reader.result;photoPreview.hidden=false;silhouette.hidden=true;avatarStatus.textContent='Foto voorbereid';setStatus('De foto is alleen lokaal voorvertoond en nog niet geüpload.','success')};reader.readAsDataURL(file)});

document.getElementById('saveChoice').addEventListener('click',()=>{if(selectedBody==='personal'){if(!photoInput.files?.[0]){setStatus('Selecteer eerst een foto voor uw persoonlijke AI-avatar.');return}if(!document.getElementById('avatarConsent').checked){setStatus('Geef eerst toestemming voor het gebruik van de foto.');return}avatarStatus.textContent='Klaar voor upload';setStatus('Uw keuze is voorbereid. In de volgende stap koppelen we veilige opslag en AI-generatie.','success')}else{avatarStatus.textContent='Standaardavatar gekozen';setStatus('Uw standaard FitConnect-body is gekozen. Database-opslag volgt in de volgende stap.','success')}});

document.getElementById('logoutButton').addEventListener('click',async()=>{try{if(client)await client.auth.signOut({scope:'local'})}finally{location.replace('../../login/?logout=1')}});

async function guard(){if(!client){location.replace('../../login/?login=required');return}const {data:{session}}=await client.auth.getSession();if(!session){location.replace('../../login/?login=required');return}currentUser=session.user}

guard().catch(error=>setStatus(error.message||'My Twin kon niet worden geladen.'));