(()=>{
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  function render(categories){
    const mains=categories.filter(item=>item.type==='main').sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));
    const select=document.getElementById('categoryFilter');
    if(select){const selected=select.value;select.innerHTML='<option value="Alle">Alle sporten</option>'+mains.map(item=>`<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected}
    const grid=document.querySelector('.category-grid');
    if(grid){grid.innerHTML=mains.map((item,index)=>{const subs=categories.filter(sub=>sub.parentKey===item.id).sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));return `<button type="button" data-category="${escapeHtml(item.name)}" data-category-slug="${escapeHtml(item.slug)}" data-category-id="${escapeHtml(item.id)}"><span>${String(index+1).padStart(2,'0')}</span><h3>${escapeHtml(item.name)}</h3><p>${subs.slice(0,4).map(sub=>escapeHtml(sub.name)).join(' · ')}</p></button>`}).join('')}
    let panel=document.getElementById('sportSubcategories');
    if(!panel){panel=document.createElement('section');panel.id='sportSubcategories';panel.className='subcategory-panel';panel.hidden=true;grid?.after(panel)}
    bindCategoryButtons(categories,panel);
  }
  function bindCategoryButtons(categories,panel){
    const select=document.getElementById('categoryFilter');
    const emit=(category,subcategory='')=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category,subcategory}}));
    document.querySelectorAll('.category-grid [data-category]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.categoryId,category=button.dataset.category||'',subs=categories.filter(item=>item.parentKey===id).sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));
      if(select)select.value=category;
      document.querySelectorAll('.category-grid [data-category]').forEach(node=>node.classList.toggle('active',node===button));
      panel.hidden=!subs.length;
      panel.innerHTML=subs.length?`<div class="subcategory-heading"><div><p class="eyebrow">${escapeHtml(category)}</p><h3>Kies wat u nodig heeft.</h3></div><button class="subcategory-reset" type="button" data-sport-sub="">Toon alles</button></div><div class="subcategory-grid">${subs.map(sub=>`<button type="button" data-sport-sub="${escapeHtml(sub.name)}"><strong>${escapeHtml(sub.name)}</strong><span>Bekijk producten</span></button>`).join('')}</div>`:'';
      panel.querySelectorAll('[data-sport-sub]').forEach(sub=>sub.addEventListener('click',()=>{panel.querySelectorAll('[data-sport-sub]').forEach(node=>node.classList.toggle('active',node===sub&&Boolean(sub.dataset.sportSub)));emit(category,sub.dataset.sportSub||'');document.getElementById('producten')?.scrollIntoView({behavior:'smooth'})}));
      emit(category,'');if(subs.length)panel.scrollIntoView({behavior:'smooth',block:'nearest'});else document.getElementById('producten')?.scrollIntoView({behavior:'smooth'});
    }));
  }
  function bindInteractions(){const categoryFilter=document.getElementById('categoryFilter');categoryFilter?.addEventListener('change',()=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category:categoryFilter.value,subcategory:''}})),true)}
  function init(){const productRepository=new window.StorefrontProductRepository(window.getFitConnectSupabase()),repository=new window.StorefrontCategoryRepository(productRepository),store=new window.StorefrontCategoryStore(repository);window.storefrontCategoryStore=store;bindInteractions();store.subscribe(state=>{if(!state.loading&&!state.error)render(state.categories)});store.loadStorefrontCategories().catch(error=>console.error('[Storefront Categories]',error))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();