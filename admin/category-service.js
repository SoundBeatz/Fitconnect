(()=>{
  'use strict';
  class CategoryService{
    constructor(repository,{isOnline=()=>typeof navigator==='undefined'?true:navigator.onLine}={}){if(!repository)throw new TypeError('CategoryRepository is verplicht in de CategoryService.');this.repository=repository;this.isOnline=isOnline}
    async fetchAll(){if(!this.isOnline())throw new Error('Geen internetverbinding beschikbaar.');const categories=await this.repository.listCategories();return[...categories].sort((a,b)=>{if(a.parentKey===null&&b.parentKey!==null)return-1;if(a.parentKey!==null&&b.parentKey===null)return 1;return a.name.localeCompare(b.name,'nl')})}
    async save(){throw new Error('Categorieën zijn read-only tot de SQL-migratiefase.')}
  }
  window.CategoryService=CategoryService;
})();