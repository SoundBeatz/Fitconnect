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
  const preview=document.getElementById('avatarPreview');
  const previewImage=document.getElementById('photoPreview');
  const photoInput=document.getElementById('avatarPhoto');
  const saveChoice=document.getElementById('saveChoice');

  let user=null;
  let avatar=null;
  let identityProfile=null;
  let latestJob=null;
  let sourceDirty=false;
  let dirtyBaseSourcePath=null;

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
    button.disabled=sourceDirty||!aiReady||avatar?.status==='processing';

    const jobStatus=latestJob?.status;
    badge.className='engine-badge';
    if(sourceDirty){
      badge.textContent='FOTO OPSLAAN';
      badge.classList.add('waiting');
    }else if(jobStatus==='ready'||avatar?.status==='ready'){
      badge.textContent='LIVE';
      badge.classList.add('ready');
    }else if(jobStatus==='awaiting_renderer'){
      badge.textContent='KEY NODIG';
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

    if(sourceDirty) identityText.textContent='Nieuwe bron nog niet bevestigd';
    else identityText.textContent=identityProfile?`R${identityProfile.identity_revision} · vergrendeld`:(aiReady?'Wordt vastgezet bij generatie':'Nog niet vastgezet');

    if(latestJob?.renderer==='openai-gpt-image-2') rendererText.textContent='OpenAI GPT-Image-2';
    else rendererText.textContent=latestJob?.renderer?'FitConnect Render Adapter':(jobStatus==='awaiting_renderer'?'GPT-Image-2 · key ontbreekt':'GPT-Image-2 · gereed');
    versionText.textContent=avatar?.active_version?`V${avatar.active_version}`:'—';

    if(sourceDirty){
      note.textContent='Er is een nieuwe foto geselecteerd maar nog niet beveiligd opgeslagen. Klik eerst op Keuze opslaan. Genereren blijft geblokkeerd totdat de backend de nieuwe bronversie heeft bevestigd.';
    }else if(jobStatus==='awaiting_renderer'){
      note.textContent='De volledige rendererketen staat klaar. Alleen de server-side OPENAI_API_KEY ontbreekt; zonder die secret verlaat geen foto FitConnect.';
    }else if(jobStatus==='ready'||avatar?.status==='ready'){
      note.textContent='Canonical identity is actief. Nieuwe lichaamsversies kunnen vanaf dezelfde identiteit en dezelfde camerastijl worden opgebouwd.';
    }else if(aiReady){
      note.textContent='De private bronfoto, Canonical Identity Engine en GPT-Image-2 rendererroute staan klaar voor de eerste echte Twin.';
    }
  }

  async function refresh(){
    const {data:{session}}=await client.auth.getSession();
    user=session?.user||null;
    if(!user)return;

    const [{data:avatarData},{data:identityData},{data:jobs}]=await Promise.all([
      client.from('user_avatars').select('*').eq('user_id',user.id).maybeSingle(),
      client.from('my_twin_identity_profiles').select('*').eq('user_id',user.id).maybeSingle(),
      client.from('my_twin_generation_jobs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1)
    ]);
    avatar=avatarData||null;
    identityProfile=identityData||null;
    latestJob=jobs?.[0]||null;

    if(!sourceDirty&&avatar?.avatar_image&&avatar.status==='ready'){
      try{
        const url=await signedUrl(avatar.avatar_image);
        if(url){
          previewImage.src=url;
          previewImage.hidden=false;
          document.querySelector('.preview-silhouette')?.setAttribute('hidden','');
          preview?.classList.add('twin-alive');
        }
      }catch{}
    }else if(!sourceDirty){
      preview?.classList.remove('twin-alive');
    }
    renderState();
  }

  async function confirmSavedSource(){
    const expectedPreviousPath=dirtyBaseSourcePath;
    await refresh();
    if(sourceDirty&&avatar?.source_photo&&avatar.source_photo!==expectedPreviousPath){
      sourceDirty=false;
      dirtyBaseSourcePath=null;
      await refresh();
      status('Nieuwe bronfoto is beveiligd opgeslagen en door de backend bevestigd. U kunt nu deze foto genereren.','success');
      return true;
    }
    renderState();
    return false;
  }

  async function poll(jobId){
    for(let i=0;i<45;i++){
      await new Promise(resolve=>setTimeout(resolve,3000));
      const {data,error}=await client.from('my_twin_generation_jobs').select('*').eq('id',jobId).maybeSingle();
      if(error)break;
      latestJob=data||latestJob;
      renderState();
      if(data?.status==='ready'||data?.status==='failed'||data?.status==='awaiting_renderer')break;
    }
    await refresh();
  }

  photoInput?.addEventListener('change',()=>{
    if(!photoInput.files?.[0])return;
    sourceDirty=true;
    dirtyBaseSourcePath=avatar?.source_photo||null;
    preview?.classList.remove('twin-alive');
    renderState();
    status('Nieuwe foto geselecteerd. Klik eerst op Keuze opslaan; daarna wordt genereren automatisch vrijgegeven.','success');
  });

  button.addEventListener('click',async()=>{
    if(sourceDirty){
      status('Deze nieuwe foto is nog niet beveiligd opgeslagen. Klik eerst op Keuze opslaan.','error');
      renderState();
      return;
    }

    button.disabled=true;
    button.textContent='My Twin bouwen…';
    status('Canonical identiteit wordt vastgezet en GPT-Image-2 wordt beveiligd server-side gestart.','success');
    try{
      const {data,error}=await client.functions.invoke('my-twin-generate',{body:{intent:'canonical_identity'}});
      if(error)throw new Error(await edgeMessage(error));
      if(!data?.ok)throw new Error(data?.error||'Generatieopdracht is niet geaccepteerd.');

      if(data.status==='awaiting_renderer'){
        status('Rendererroute staat klaar. Alleen de server-side OpenAI API-key moet nog worden geactiveerd.','success');
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

  saveChoice?.addEventListener('click',()=>{
    if(sourceDirty){
      setTimeout(()=>confirmSavedSource().catch(()=>{}),1200);
      setTimeout(()=>confirmSavedSource().catch(()=>{}),3500);
      setTimeout(()=>confirmSavedSource().catch(()=>{}),7000);
    }else{
      setTimeout(()=>refresh().catch(()=>{}),1200);
      setTimeout(()=>refresh().catch(()=>{}),3500);
    }
  });

  refresh().catch(()=>{});
})();
