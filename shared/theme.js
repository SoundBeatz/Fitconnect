(()=>{
  const defaults={accent:'#f36f21',heading_size:36,content_width:1440,density:'comfortable',radius:18};
  function apply(settings={}){
    const theme={...defaults,...settings};
    const root=document.documentElement;
    root.style.setProperty('--fc-accent',theme.accent);
    root.style.setProperty('--fc-heading-size',`${Number(theme.heading_size)}px`);
    root.style.setProperty('--fc-content-width',`${Number(theme.content_width)}px`);
    root.style.setProperty('--fc-radius',`${Number(theme.radius)}px`);
    document.body?.classList.toggle('fc-theme-compact',theme.density==='compact');
    window.fitConnectTheme=theme;
  }
  async function load(){
    apply(defaults);
    try{
      const client=window.getFitConnectSupabase?.();
      if(!client)return;
      const {data,error}=await client.from('site_theme_settings').select('*').eq('id','default').single();
      if(error)throw error;
      apply(data||defaults);
    }catch(error){
      console.warn('FitConnect theme fallback actief',error?.message||error);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
