(()=>{
  'use strict';
  function render(categories){
    const mains=categories.filter(item=>item.type==='main');
    const select=document.getElementById('categoryFilter');
    if(select){const selected=select.value;select.innerHTML='<option value="Alle">Alle categorieën</option>'+mains.map(item=>`<option value="${item.name}">${item.name}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected}
    const grid=document.querySelector('.category-grid');
    if(grid){grid.querySelectorAll('[data-category]').forEach(button=>{const match=mains.find(item=>item.name===button.dataset.category||item.slug===button.dataset.category);if(!match)button.hidden=true;else{button.hidden=false;button.dataset.category=match.name;button.dataset.categorySlug=match.slug}})}
  }
  function bindInteractions(){
    const categoryFilter=document.getElementById('categoryFilter');
    const subcategoryNodes=()=>[...document.querySelectorAll('[data-subcategory]')];
    const emit=(category,subcategory='')=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category,subcategory}}));
    categoryFilter?.addEventListener('change',()=>{subcategoryNodes().forEach(node=>node.classList.remove('active'));emit(categoryFilter.value,'');},true);
    document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();const category=button.dataset.category||'';if(categoryFilter)categoryFilter.value=category;subcategoryNodes().forEach(node=>node.classList.remove('active'));const panel=document.getElementById('strengthSubcategories');if(panel){panel.hidden=button.dataset.categorySlug!=='kracht';if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'nearest'});}emit(category,'');if(button.dataset.categorySlug!=='kracht')document.getElementById('producten')?.scrollIntoView();},true));
    subcategoryNodes().forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();subcategoryNodes().forEach(node=>node.classList.toggle('active',node===button&&Boolean(button.dataset.subcategory)));emit(categoryFilter?.value||'Alle',button.dataset.subcategory||'');document.getElementById('producten')?.scrollIntoView({behavior:'smooth'});},true));
  }
  function init(){const productRepository=new window.StorefrontProductRepository(window.getFitConnectSupabase()),repository=new window.StorefrontCategoryRepository(productRepository),store=new window.StorefrontCategoryStore(repository);window.storefrontCategoryStore=store;bindInteractions();store.subscribe(state=>{if(!state.loading&&!state.error)render(state.categories)});store.loadStorefrontCategories().catch(error=>console.error('[Storefront Categories]',error))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();