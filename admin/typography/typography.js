(()=>{
  const client=window.getFitConnectSupabase?.();
  const form=document.getElementById('typographyForm');
  const status=document.getElementById('status');
  const publishButton=document.getElementById('publishButton');
  const resetButton=document.getElementById('resetButton');
  const defaults=window.FitConnectTypography?.defaults||{};
  const draftKey='fitconnect-typography-draft';
  const cacheKey='fitconnect-typography-cache';
  const groups={
    body:{size:[12,22,.5],weight:[100,900,100],line_height:[1,2,.05],letter_spacing:[-.08,.2,.005]},
    h1:{size:[18,72,1],weight:[100,900,100],line_height:[.9,1.8,.01],letter_spacing:[-.1,.2,.005]},
    h2:{size:[16,56,1],weight:[100,900,100],line_height:[.9,1.8,.01],letter_spacing:[-.1,.2,.005]},
    h3:{size:[14,42,1],weight:[100,900,100],line_height:[.9,1.8,.01],letter_spacing:[-.1,.2,.005]}
  };
  const labels={size:'Tekstgrootte (px)',weight:'Dikte',line_height:'Regelhoogte',letter_spacing:'Letterafstand (em)'};

  function field(name,label,min,max,step){
    return `<label>${label}<input name="${name}" type="number" min="${min}" max="${max}" step="${step}"></label>`;
  }

  Object.entries(groups).forEach(([group,defs])=>{
    const fieldset=form.querySelector(`[data-group="${group}"]`);
    Object.entries(defs).forEach(([key,definition])=>fieldset.insertAdjacentHTML('beforeend',field(`${group}_${key}`,labels[key],...definition)));
    fieldset.insertAdjacentHTML('beforeend',`<label>Teksttransformatie<select name="${group}_transform"><option value="none">Geen</option><option value="uppercase">HOOFDLETTERS</option><option value="lowercase">kleine letters</option><option value="capitalize">Beginletters</option></select></label><label>Tekstdecoratie<select name="${group}_decoration"><option value="none">Geen</option><option value="underline">Onderstrepen</option><option value="line-through">Doorstrepen</option><option value="overline">Lijn erboven</option></select></label>`);
  });

  function setStatus(text,type='info'){
    status.textContent=text;
    status.classList.toggle('success',type==='success');
    status.classList.toggle('error',type==='error');
  }

  function values(){
    const formData=new FormData(form);
    const output={};
    for(const [key,value] of formData.entries()){
      output[key]=['font_family','font_style'].includes(key)||key.endsWith('_transform')||key.endsWith('_decoration')?value:Number(value);
    }
    return output;
  }

  function fill(data){
    Object.entries({...defaults,...data}).forEach(([key,value])=>{
      if(form.elements[key])form.elements[key].value=value;
    });
    preview();
  }

  function preview(){
    const current=values();
    window.FitConnectTypography?.apply(current);
    try{localStorage.setItem(draftKey,JSON.stringify(current));}catch{}
    if(!publishButton.disabled)setStatus('Wijzigingen als concept bewaard. Klik op Publiceer sitebreed om ze voor iedereen op te slaan.');
  }

  function friendlyError(error){
    const message=String(error?.message||'Publiceren mislukt');
    const code=String(error?.code||'');
    if(code==='42703'||code==='PGRST204'||/column .* does not exist|schema cache/i.test(message)){
      return 'De database mist nog typografiekolommen. Voer supabase/fitconnect-typography-control.sql één keer uit in de Supabase SQL Editor.';
    }
    if(code==='42501'||/row-level security|permission denied|policy/i.test(message)){
      return 'Opslaan wordt door de databasebeveiliging geweigerd. Controleer of jouw profiel de rol admin heeft en voer de Typography Control SQL opnieuw uit.';
    }
    if(/Failed to fetch|NetworkError|Load failed/i.test(message)){
      return 'De database is tijdelijk niet bereikbaar. Het concept staat lokaal opgeslagen; probeer Publiceer sitebreed opnieuw.';
    }
    return message;
  }

  async function requireAdmin(){
    if(!client){setStatus('Databaseverbinding ontbreekt. Controleer de Supabase-configuratie.','error');return null;}
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session){location.replace('../../login/?login=required');return null;}
    const {data:profile,error}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    if(error)throw error;
    if(profile?.role!=='admin'){
      setStatus('Alleen een beheerder kan typografie sitebreed publiceren.','error');
      return null;
    }
    return session.user;
  }

  async function load(){
    const admin=await requireAdmin();
    if(!admin)return;
    const localDraft=(()=>{try{return JSON.parse(localStorage.getItem(draftKey)||'null')}catch{return null}})();
    const {data,error}=await client.from('site_theme_settings').select('*').eq('id','default').maybeSingle();
    if(error){
      fill(localDraft||defaults);
      setStatus(friendlyError(error),'error');
      return;
    }
    fill(localDraft||data||defaults);
    setStatus(localDraft?'Lokaal concept geladen. Publiceer om dit sitebreed op te slaan.':'Gepubliceerde typografie geladen.','success');
  }

  form.addEventListener('input',preview);

  publishButton.addEventListener('click',async()=>{
    publishButton.disabled=true;
    publishButton.textContent='Publiceren…';
    setStatus('Database en beheerdersrechten controleren…');
    try{
      const admin=await requireAdmin();
      if(!admin)return;
      const payload={id:'default',...values(),updated_at:new Date().toISOString()};
      const {data,error}=await client.from('site_theme_settings').upsert(payload,{onConflict:'id'}).select('id,updated_at').single();
      if(error)throw error;
      if(!data?.id)throw new Error('Supabase heeft de publicatie niet bevestigd.');

      const {data:verification,error:verificationError}=await client
        .from('site_theme_settings')
        .select('font_family,font_style,body_size,h1_size,h1_line_height,h2_size,h3_size,updated_at')
        .eq('id','default')
        .single();
      if(verificationError)throw verificationError;

      localStorage.setItem(cacheKey,JSON.stringify({...payload,...verification}));
      localStorage.removeItem(draftKey);
      window.FitConnectTypography?.apply(payload);
      setStatus(`Typografie succesvol sitebreed gepubliceerd om ${new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}.`,'success');
    }catch(error){
      console.error('Typography publiceren mislukt',error);
      setStatus(friendlyError(error),'error');
    }finally{
      publishButton.disabled=false;
      publishButton.textContent='Publiceer sitebreed';
    }
  });

  resetButton.addEventListener('click',()=>{
    fill(defaults);
    try{localStorage.setItem(draftKey,JSON.stringify(defaults));}catch{}
    setStatus('Standaardwaarden als concept geladen. Klik op Publiceer sitebreed om ze op te slaan.');
  });

  document.getElementById('logoutButton').addEventListener('click',async()=>{
    try{if(client)await client.auth.signOut({scope:'local'});}finally{location.replace('../../login/?logout=1');}
  });

  load().catch(error=>setStatus(friendlyError(error),'error'));
})();