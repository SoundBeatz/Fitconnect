(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  const q=(params.get('q')||'').trim();
  const brand=(params.get('brand')||'').trim();
  const category=(params.get('category')||'').trim();

  function apply(){
    const search=document.getElementById('searchInput');
    const brandFilter=document.getElementById('brandFilter');
    const categoryFilter=document.getElementById('categoryFilter');
    if(q&&search){search.value=q;search.dispatchEvent(new Event('input',{bubbles:true}))}
    if(category&&categoryFilter&&[...categoryFilter.options].some(o=>o.value===category)){categoryFilter.value=category;categoryFilter.dispatchEvent(new Event('change',{bubbles:true}))}
    if(brand&&brandFilter){
      const setBrand=()=>{if([...brandFilter.options].some(o=>o.value===brand)){brandFilter.value=brand;brandFilter.dispatchEvent(new Event('change',{bubbles:true}));return true}return false};
      if(!setBrand())setTimeout(setBrand,350);
    }
    if((q||brand||category)&&location.hash!=='#producten')document.getElementById('producten')?.scrollIntoView({block:'start'});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
