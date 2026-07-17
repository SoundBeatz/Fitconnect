(()=>{
  'use strict';

  const CORE_VERSION='1.0.0';
  const currentScript=document.currentScript;
  const scriptUrl=new URL(currentScript?.src||'shared/core.js',location.href);
  const baseUrl=new URL('../',scriptUrl);
  const manifestUrl=new URL('shared/build.json',baseUrl);

  function absolute(path){return new URL(path,baseUrl).href}

  function withVersion(path,version){
    const url=new URL(path,baseUrl);
    url.searchParams.set('v',version);
    return url.href;
  }

  function loadStyle(path,id,version){
    return new Promise((resolve,reject)=>{
      let link=document.getElementById(id);
      const href=withVersion(path,version);
      if(link&&link.href===href)return resolve(link);
      if(link)link.remove();
      link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      link.href=href;
      link.onload=()=>resolve(link);
      link.onerror=()=>reject(new Error(`Stylesheet kon niet laden: ${path}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(path,id,version,{external=false}={}){
    return new Promise((resolve,reject)=>{
      let script=document.getElementById(id);
      const src=external?path:withVersion(path,version);
      if(script&&script.src===src){
        if(script.dataset.loaded==='true'||script.readyState==='complete')return resolve(script);
        script.addEventListener('load',()=>resolve(script),{once:true});
        script.addEventListener('error',reject,{once:true});
        return;
      }
      if(script)script.remove();
      script=document.createElement('script');
      script.id=id;
      script.src=src;
      script.async=false;
      script.onload=()=>{script.dataset.loaded='true';resolve(script)};
      script.onerror=()=>reject(new Error(`Script kon niet laden: ${path}`));
      document.head.appendChild(script);
    });
  }

  async function getManifest(){
    const requestUrl=new URL(manifestUrl);
    requestUrl.searchParams.set('_',Date.now().toString());
    const response=await fetch(requestUrl.href,{cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(!response.ok)throw new Error(`Build manifest niet beschikbaar (${response.status})`);
    return response.json();
  }

  async function boot(){
    document.documentElement.dataset.fcCore='loading';
    try{
      const manifest=await getManifest();
      const version=String(manifest.version||Date.now());
      const assets=manifest.assets||{};

      window.FitConnectCore={
        version:CORE_VERSION,
        build:version,
        manifest,
        baseUrl:absolute(''),
        asset:path=>withVersion(path,version)
      };

      await Promise.all([
        assets.themeCss?loadStyle(assets.themeCss,'fc-theme-css',version):Promise.resolve(),
        assets.publicNavCss?loadStyle(assets.publicNavCss,'fc-public-nav-css',version):Promise.resolve(),
        assets.typographyCss?loadStyle(assets.typographyCss,'fc-typography-css',version):Promise.resolve()
      ]);

      if(!window.supabase){
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','fc-supabase-js',version,{external:true});
      }
      if(assets.supabaseConfig)await loadScript(assets.supabaseConfig,'fc-supabase-config',version);
      if(assets.themeJs)await loadScript(assets.themeJs,'fc-theme-js',version);
      if(assets.typographyJs)await loadScript(assets.typographyJs,'fc-typography-js',version);
      if(assets.publicNavJs)await loadScript(assets.publicNavJs,'fc-public-nav-js',version);

      document.documentElement.dataset.fcCore='ready';
      window.dispatchEvent(new CustomEvent('fitconnect:core-ready',{detail:window.FitConnectCore}));
    }catch(error){
      document.documentElement.dataset.fcCore='error';
      console.error('FitConnect Core kon niet starten',error);
      window.dispatchEvent(new CustomEvent('fitconnect:core-error',{detail:{error}}));
    }
  }

  boot();
})();
