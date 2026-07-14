(()=>{
  const defaults={accent:'#f36f21',heading_size:36,content_width:1440,density:'comfortable',radius:18};

  function apply(settings={}){
    const theme={...defaults,...settings};
    const root=document.documentElement;
    root.style.setProperty('--fc-accent',theme.accent);
    root.style.setProperty('--accent',theme.accent);
    root.style.setProperty('--fc-nav-accent',theme.accent);
    root.style.setProperty('--fc-heading-size',`${Number(theme.heading_size)}px`);
    root.style.setProperty('--fc-content-width',`${Number(theme.content_width)}px`);
    root.style.setProperty('--fc-radius',`${Number(theme.radius)}px`);
    document.body?.classList.toggle('fc-theme-compact',theme.density==='compact');
    root.dataset.fcTheme='loaded';
    window.fitConnectTheme=theme;
  }

  async function load(){
    apply(defaults);
    try{
      const config=window.FITCONNECT_SUPABASE;
      if(!config?.url||!config?.anonKey)throw new Error('Publieke Supabase-configuratie ontbreekt');
      const endpoint=`${config.url}/rest/v1/site_theme_settings?id=eq.default&select=accent,heading_size,content_width,density,radius,updated_at`;
      const response=await fetch(endpoint,{
        method:'GET',
        cache:'no-store',
        headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`,Accept:'application/json'}
      });
      const text=await response.text();
      if(!response.ok)throw new Error(`Theme API ${response.status}: ${text}`);
      const rows=text?JSON.parse(text):[];
      if(!Array.isArray(rows)||!rows[0])throw new Error('Geen publieke themarij met id default gevonden');
      apply(rows[0]);
      console.info('FitConnect publiek thema geladen',rows[0]);
    }catch(error){
      document.documentElement.dataset.fcTheme='fallback';
      console.error('FitConnect Theme Engine:',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();