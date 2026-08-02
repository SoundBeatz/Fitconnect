(()=>{
  'use strict';
  function render(categories){
    const mains=categories.filter(item=>item.type==='main');
    const select=document.getElementById('categoryFilter');
    if(select){const selected=select.value;select.innerHTML='<option value="Alle">Alle categorieën</option>'+mains.map(item=>`<option value="${item.name}">${item.name}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected}
    const grid=document.querySelector('.category-grid');
    if(grid){grid.querySelectorAll('[data-category]').forEach(button=>{const match=mains.find(item=>item.name===button.dataset.category||item.slug===button.dataset.category);if(!match)button.hidden=true;else{button.hidden=false;button.dataset.category=match.name;button.dataset.categorySlug=match.slug}})}
  }
  function init(){const productRepository=new window.StorefrontProductRepository(window.getFitConnectSupabase()),repository=new window.StorefrontCategoryRepository(productRepository),store=new window.StorefrontCategoryStore(repository);window.storefrontCategoryStore=store;store.subscribe(state=>{if(!state.loading&&!state.error)render(state.categories)});store.loadStorefrontCategories().catch(error=>console.error('[Storefront Categories]',error))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();