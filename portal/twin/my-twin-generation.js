(()=>{
  const client=window.getFitConnectSupabase?.();
  const originalButton=document.getElementById('generateAvatar');
  if(!client||!originalButton)return;

  const button=originalButton.cloneNode(true);
  originalButton.replaceWith(button);
  button.id='generateAvatar';

  const suitCard=document.querySelector('.suit-card');
  const engine=document.createElement('section');
  engine.className='identity-engine';
  engine.innerHTML=`
    <div class="identity-engine-head">
      <div><p class="eyebrow">Canonical Identity Engine</p><h3>My Twin Engine v1</h3></div>
      <span class="engine-badge" id="engineBadge">Controleren…</span>
    </div>
    <div class="engine-grid">
      <div class="engine-step"><span>Identiteit</span><strong id="engineIdentity">Nog niet vastgezet</strong></div>
      <div class="engine-step"><span>Renderer</span><strong id="engineRenderer">Controleren…</strong></div>
      <div class="engine-step"><span>Versie</span><strong id="engineVersion">—</strong></div>
    </div>
    <p class="engine-note" id="engineNote">FitConnect bewaart geen biometrische vector. De identiteit wordt reproduceerbaar gehouden met bronhash, vaste renderregels, promptrevision en consistency seed.</p>`;
  suitCard?.after(engine);

  const badge=document.getElementById('engineBadge');
  const identityText=document.getElementById('engineIdentity');
  const rendererText=document.getElementById('engineRenderer');
  const versionText=document.getElementById('engineVersion');
  const note=document.getElementById('engineNote');
  const twinStatus=document.getElementById('twinStatus');
  const avatarStatus=document.getElementById('avatarStatus');
  const avatarVersion=document.getElementById('avatarVersion');
  const preview=document.getElementById('avatarPreview');
  const previewImage=document.getElementById('photoPreview');

  let user=null;
  let avatar=null;
  let latestJob=null;

  function status(message,type='success'){
    if(!twinStatus)return;
    twinStatus.textContent=message;
    twinStatus.classList.toggle('success',type==='success');
  }

  async function edgeMessage(error){
    try{
      const response=error?.context;
      if(response?.clone){
        const body=await response.clone().json();
        if(body?.error)return body.error;
      }
    }catch{}
    return error?.message||'My Twin generatie is mislukt.';
  }

  async function signedUrl(path){
    if(!path)return null;
    const {data,error}=await client.storage.from('avatars').createSignedUrl(path,3600);
    if(error)throw error;
    return data?.signedUrl||null;
  }

  function renderState(){
    const aiReady=avatar?.avatar_type==='ai'&&avatar?.source_photo;
    button.disabled=!aiReady||avatar?.status==='processing';

    const jobStatus=latestJob?.status;
    badge.className='engine-badge';
    if(jobStatus==='ready'||avatar?.status==='ready'){
      badge.textContent='LIVE';
      badge.classList.add('ready');
    }else if(jobStatus==='awaiting_renderer'){
      badge.textContent='ENGINE READY';
      badge.classList.add('waiting');
    }else if(jobStatus==='rendering'||jobStatus==='queued'||avatar?.status==='processing'){
      badge.textContent='GENEREREN';
      badge.classList.add('waiting');
    }else if(aiReady){
      badge.textContent='KLAAR VOOR GENERATIE';
      badge.classList.add('waiting');
    }else{
      badge.textContent='WACHT OP FOTO';
    }

    identityText.textContent=latestJob?.identity_profile_id?'Identiteit vastgezet':(aiReady?'Wordt vastgezet bij generatie':'Nog niet vastgezet');
    rendererText.textContent=latestJob?.renderer?'FitConnect Render Adapter':(jobStatus==='awaiting_renderer'?'Server-renderer nog te activeren':'Nog niet gestart');
    versionText.textContent=avatar?.active_version?`V${avatar.active_version}`:'—';

    if(jobStatus==='awaiting_renderer'){
      note.textContent='De Canonical Identity Engine, job queue, beveiliging en versiecontracten zijn actief. Alleen de externe beeldrenderer is nog niet server-side gekoppeld.';
    }else if(jobStatus==='ready'||avatar?.status==='ready'){
      note.textContent='Canonical identity is actief. Nieuwe lichaamsversies kunnen vanaf dezelfde identiteit en dezelfde camerastijl worden opgebouwd.';
    }
  }

  async function refresh(){
    const {data:{session}}=await client.auth.getSession();
    user=session?.user||null;
    if(!user)return;

    const {data:avatarData}=await client.from('user_avatars').select('*').eq('user_id',user.id).maybeSingle();
    avatar=avatarData||null;

    const {data:jobs}=await client.from('my_twin_generation_jobs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1);
    latestJob=jobs?.[0]||null;

    if(avatar?.avatar_image&&avatar.status==='ready'){
      try{
        const url=await signedUrl(avatar.avatar_image);
        if(url){
          previewImage.src=url;
          previewImage.hidden=false;
          document.querySelector('.preview-silhouette')?.setAttribute('hidden','');
          preview?.classList.add('twin-alive');
        }
      }catch{}
    }else{
      preview?.classList.remove('twin-alive');
    }
    renderState();
  }

  async function poll(jobId){
    for(let i=0;i<30;i++){
      await new Promise(resolve=>setTimeout(resolve,3000));
      const {data,error}=await client.from('my_twin_generation_jobs').select('*').eq('id',jobId).maybeSingle();
      if(error)break;
      latestJob=data||latestJob;
      renderState();
      if(data?.status==='ready'||data?.status==='failed'||data?.status==='awaiting_renderer')break;
    }
    await refresh();
  }

  button.addEventListener('click',async()=>{
    button.disabled=true;
    button.textContent='My Twin bouwen…';
    status('Canonical identiteit wordt vastgezet en de generatieopdracht wordt beveiligd gestart.','success');
    try{
      const {data,error}=await client.functions.invoke('my-twin-generate',{body:{intent:'canonical_identity'}});
      if(error)throw new Error(await edgeMessage(error));
      if(!data?.ok)throw new Error(data?.error||'Generatieopdracht is niet geaccepteerd.');

      if(data.status==='awaiting_renderer'){
        status('Identity Engine staat LIVE. De server-side beeldrenderer is de laatste koppeling voordat de eerste echte Twin kan worden gerenderd.','success');
      }else if(data.status==='ready'){
        status('My Twin is gegenereerd en als nieuwe vaste versie opgeslagen.','success');
      }else{
        status(data.message||'My Twin wordt gegenereerd…','success');
        if(data.jobId)await poll(data.jobId);
      }
    }catch(error){
      status(error.message||'My Twin generatie is mislukt.','error');
    }finally{
      button.textContent='AI-avatar genereren';
      await refresh();
    }
  });

  refresh().catch(()=>{});
})();
