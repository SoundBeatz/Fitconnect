(()=>{
  'use strict';
  const CORE_VERSION='2.3.0';
  const currentScript=document.currentScript;
  const scriptUrl=new URL(currentScript?.src||'shared/core.js',location.href);
  const baseUrl=new URL('../',scriptUrl);
  const manifestUrl=new URL('shared/build.json',baseUrl);
  function absolute(path){return new URL(path,baseUrl).href}
  function withVersion(path,version){const url=new URL(path,baseUrl);url.searchParams.set('v',version);return url.href}
  function loadStyle(path,id,version){return new Promise((resolve,reject)=>{let link=document.getElementById(id);const href=withVersion(path,version);if(link&&link.href===href)return resolve(link);if(link)link.remove();link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;link.onload=()=>resolve(link);link.onerror=()=>reject(new Error(`Stylesheet kon niet laden: ${path}`));document.head.appendChild(link)})}
  function loadScript(path,id,version,{external=false}={}){return new Promise((resolve,reject)=>{let script=document.getElementById(id);const src=external?path:withVersion(path,version);if(script&&script.src===src){if(script.dataset.loaded==='true'||script.readyState==='complete')return resolve(script);script.addEventListener('load',()=>resolve(script),{once:true});script.addEventListener('error',reject,{once:true});return}if(script)script.remove();script=document.createElement('script');script.id=id;script.src=src;script.async=false;script.onload=()=>{script.dataset.loaded='true';resolve(script)};script.onerror=()=>reject(new Error(`Script kon niet laden: ${path}`));document.head.appendChild(script)})}
  async function getManifest(){const requestUrl=new URL(manifestUrl);requestUrl.searchParams.set('_',Date.now().toString());const response=await fetch(requestUrl.href,{cache:'no-store',headers:{'cache-control':'no-cache'}});if(!response.ok)throw new Error(`Build manifest niet beschikbaar (${response.status})`);return response.json()}
  async function boot(){
    document.documentElement.dataset.fcCore='loading';
    try{
      const manifest=await getManifest();const version=String(manifest.version||Date.now());const assets=manifest.assets||{};
      window.FitConnectCore={version:CORE_VERSION,build:version,phase:manifest.phase||null,manifest,baseUrl:absolute(''),asset:path=>withVersion(path,version)};
      if(assets.registryJs)await loadScript(assets.registryJs,'fc-registry-js',version);
      window.FitConnectRegistry?.register('core.runtime',window.FitConnectCore,{meta:{type:'core-service',version:CORE_VERSION}});
      await Promise.all([
        assets.designTokensCss?loadStyle(assets.designTokensCss,'fc-design-tokens-css',version):Promise.resolve(),
        assets.designSystemCss?loadStyle(assets.designSystemCss,'fc-design-system-css',version):Promise.resolve(),
        assets.dataComponentsCss?loadStyle(assets.dataComponentsCss,'fc-data-components-css',version):Promise.resolve(),
        assets.accessibilityCss?loadStyle(assets.accessibilityCss,'fc-accessibility-css',version):Promise.resolve(),
        assets.accountCss?loadStyle(assets.accountCss,'fc-account-css',version):Promise.resolve(),
        assets.businessCss?loadStyle(assets.businessCss,'fc-business-css',version):Promise.resolve(),
        assets.crmUiCss?loadStyle(assets.crmUiCss,'fc-crm-ui-css',version):Promise.resolve(),
        assets.themeCss?loadStyle(assets.themeCss,'fc-theme-css',version):Promise.resolve(),
        assets.publicNavCss?loadStyle(assets.publicNavCss,'fc-public-nav-css',version):Promise.resolve(),
        assets.typographyCss?loadStyle(assets.typographyCss,'fc-typography-css',version):Promise.resolve()
      ]);
      if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','fc-supabase-js',version,{external:true});
      if(assets.supabaseConfig)await loadScript(assets.supabaseConfig,'fc-supabase-config',version);
      if(assets.servicesJs)await loadScript(assets.servicesJs,'fc-services-js',version);
      for(const [key,id] of [['profileModelJs','fc-profile-model-js'],['userServiceJs','fc-user-service-js'],['authStateJs','fc-auth-state-js'],['sessionManagerJs','fc-session-manager-js'],['permissionsJs','fc-permissions-js'],['routeGuardJs','fc-route-guard-js'],['authFlowsJs','fc-auth-flows-js'],['authCallbackJs','fc-auth-callback-js'],['accountDashboardJs','fc-account-dashboard-js'],['userSettingsJs','fc-user-settings-js'],['profileEditorJs','fc-profile-editor-js'],['accountShellJs','fc-account-shell-js'],['securityEventsJs','fc-security-events-js'],['businessCoreJs','fc-business-core-js'],['workspaceJs','fc-workspace-js'],['businessSettingsJs','fc-business-settings-js'],['modulesJs','fc-modules-js'],['businessUiJs','fc-business-ui-js'],['contactModelJs','fc-contact-model-js'],['companyModelJs','fc-company-model-js'],['leadModelJs','fc-lead-model-js'],['timelineJs','fc-timeline-js'],['tasksJs','fc-tasks-js'],['labelsJs','fc-labels-js'],['crmSearchJs','fc-crm-search-js'],['crmJs','fc-crm-js'],['crmUiJs','fc-crm-ui-js'],['crmPipelineJs','fc-crm-pipeline-js'],['crmDetailJs','fc-crm-detail-js'],['contactServiceJs','fc-contact-service-js'],['companyServiceJs','fc-company-service-js'],['leadServiceJs','fc-lead-service-js'],['bulkServiceJs','fc-bulk-service-js'],['recycleBinJs','fc-recycle-bin-js'],['csvImportJs','fc-csv-import-js'],['csvExportJs','fc-csv-export-js'],['themeJs','fc-theme-js'],['typographyJs','fc-typography-js'],['iconsJs','fc-icons-js'],['overlaysJs','fc-overlays-js'],['componentsJs','fc-components-js'],['advancedComponentsJs','fc-advanced-components-js'],['dataComponentsJs','fc-data-components-js'],['accessibilityJs','fc-accessibility-js'],['designSystemRuntimeJs','fc-design-system-runtime-js'],['publicNavJs','fc-public-nav-js']])if(assets[key])await loadScript(assets[key],id,version);
      const registry=window.FitConnectRegistry;
      if(window.FitConnectTypography)registry?.register('design.typography',window.FitConnectTypography,{replace:true,meta:{type:'design-service'}});
      if(window.FitConnectTheme)registry?.register('design.theme',window.FitConnectTheme,{replace:true,meta:{type:'design-service'}});
      if(window.FitConnectSessionManager)await window.FitConnectSessionManager.initialize();
      if(window.FitConnectBusiness)await window.FitConnectBusiness.initialize();
      if(window.FitConnectWorkspace)await window.FitConnectWorkspace.load();
      if(window.FitConnectBusinessSettings&&window.FitConnectBusiness?.getOrganization())await window.FitConnectBusinessSettings.load();
      if(window.FitConnectModules)await window.FitConnectModules.initializeAll(window.FitConnectBusiness?.getContext?.()||{});
      window.FitConnectBusinessUI?.mount?.();
      window.FitConnectCRMUI?.mount?.();
      window.FitConnectCRMPipeline?.mount?.();
      window.FitConnectCRMDetail?.mount?.();
      document.documentElement.dataset.fcCore='ready';registry?.emit('core:ready',window.FitConnectCore);window.dispatchEvent(new CustomEvent('fitconnect:core-ready',{detail:window.FitConnectCore}));
    }catch(error){document.documentElement.dataset.fcCore='error';console.error('FitConnect Core kon niet starten',error);window.dispatchEvent(new CustomEvent('fitconnect:core-error',{detail:{error}}))}
  }
  boot();
})();