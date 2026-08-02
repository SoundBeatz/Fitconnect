(()=>{
  'use strict';

  class ModuleRegistryRepository{
    constructor(supabaseClient){
      if(!supabaseClient)throw new TypeError('Supabase client is verplicht in de Repository.');
      this.client=supabaseClient;
    }

    async listModules(){
      const {data,error}=await this.client.from('platform_modules').select('*').order('display_order',{ascending:true});
      if(error)throw error;
      return (data||[]).map(record=>this.mapToDomain(record));
    }

    async saveModule(moduleKey,domainModel){
      const payload=this.mapToDatabase(moduleKey,domainModel);
      const {data,error}=await this.client.from('platform_modules').upsert(payload,{onConflict:'module_key'}).select().single();
      if(error)throw error;
      return this.mapToDomain(data);
    }

    mapToDomain(record){
      const freeze=window.FitConnectDeepFreeze||Object.freeze;
      return freeze({
        moduleKey:String(record.module_key||'').trim(),
        name:record.name||record.module_key||'',
        description:record.description||'',
        enabled:Boolean(record.enabled),
        accentColor:record.accent_color||'#f36f21',
        surfaceStyle:record.surface_style||'light',
        route:record.route||'',
        displayOrder:Number(record.display_order??100),
        settings:record.settings&&typeof record.settings==='object'?record.settings:{},
        updatedAt:record.updated_at||null
      });
    }

    mapToDatabase(moduleKey,domain){
      return {
        module_key:moduleKey,
        name:String(domain.name).trim(),
        enabled:Boolean(domain.enabled),
        accent_color:domain.accentColor,
        surface_style:String(domain.surfaceStyle).trim(),
        route:String(domain.route||'').trim(),
        updated_at:domain.updatedAt
      };
    }

    async getModule(){throw new Error('Not implemented');}
    async deleteModule(){throw new Error('Not implemented');}
    async exists(){throw new Error('Not implemented');}
    async count(){throw new Error('Not implemented');}
    async findByRoute(){throw new Error('Not implemented');}
    async findByFunctionalKey(){throw new Error('Not implemented');}
  }

  window.ModuleRegistryRepository=ModuleRegistryRepository;
})();
