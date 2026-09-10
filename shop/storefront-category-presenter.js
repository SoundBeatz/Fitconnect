(()=>{
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const meta={
    'functional-training':{icon:'◎',image:'../assets/shop/categories/boksen-functional.webp',copy:'Vrij bewegen, sterker worden en trainen voor het dagelijks leven.'},
    'strength-training':{icon:'◆',image:'../assets/shop/categories/kracht.webp',copy:'Gericht bouwen aan kracht, spiermassa en maximale controle.'},
    'combat-sports':{icon:'✦',image:'../assets/shop/categories/boksen-functional.webp',copy:'Materiaal voor boksen, striking, pads en complete vechtsporttraining.'},
    'crossfit':{icon:'✚',image:'../assets/shop/categories/gewichten.webp',copy:'Robuust materiaal voor veelzijdige WODs, lifts en conditioning.'},
    'hyrox':{icon:'↯',image:'../assets/shop/categories/cardio.webp',copy:'Train slim voor sleds, runs, wall balls en wedstrijdspecifieke stations.'},
    'pilates':{icon:'◌',image:'../assets/shop/categories/vloeren.webp',copy:'Controle, mobiliteit en houding met doordachte Pilates-oplossingen.'},
    'cardio-sport':{icon:'♥',image:'../assets/shop/categories/cardio.webp',copy:'Conditie, uithoudingsvermogen en hartslaggericht trainen.'},
    'supplements':{icon:'＋',image:'../assets/shop/showroom-hero.webp',copy:'Ondersteun training, herstel en dagelijkse voedingsbehoeften.'}
  };
  function render(categories){
    const mains=categories.filter(item=>item.type==='main').sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));
    const select=document.getElementById('categoryFilter');
    if(select){const selected=select.value;select.innerHTML='<option value="Alle">Alle sporten</option>'+mains.map(item=>`<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected}
    const grid=document.querySelector('.category-grid');
    if(grid){grid.innerHTML=mains.map(item=>{const data=meta[item.id]||{icon:'•',image:'../assets/shop/showroom-hero.webp',copy:'Bekijk alle mogelijkheden binnen deze categorie.'};return `<a class="category-tile" href="categorie/?sport=${encodeURIComponent(item.slug)}" data-category="${escapeHtml(item.name)}" data-category-id="${escapeHtml(item.id)}" style="--category-image:url('${escapeHtml(data.image)}')"><span class="category-icon" aria-hidden="true">${escapeHtml(data.icon)}</span><div class="category-copy"><p>${escapeHtml(data.copy)}</p><h3>${escapeHtml(item.name)}</h3><strong>Ontdek categorie <span>→</span></strong></div></a>`}).join('')}
    applyQuerySelection(categories);
  }
  function applyQuerySelection(categories){
    const params=new URLSearchParams(location.search),sport=params.get('sport'),sub=params.get('sub');
    if(!sport)return;
    const main=categories.find(item=>item.type==='main'&&(item.slug===sport||item.name===sport));
    if(!main)return;
    const subItem=sub?categories.find(item=>item.parentKey===main.id&&(item.slug===sub||item.name===sub)):null;
    const select=document.getElementById('categoryFilter');if(select)select.value=main.name;
    window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category:main.name,subcategory:subItem?.name||''}}));
    setTimeout(()=>document.getElementById('producten')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }
  function bindInteractions(){const categoryFilter=document.getElementById('categoryFilter');categoryFilter?.addEventListener('change',()=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category:categoryFilter.value,subcategory:''}})),true)}
  function init(){const productRepository=new window.StorefrontProductRepository(window.getFitConnectSupabase()),repository=new window.StorefrontCategoryRepository(productRepository),store=new window.StorefrontCategoryStore(repository);window.storefrontCategoryStore=store;bindInteractions();store.subscribe(state=>{if(!state.loading&&!state.error)render(state.categories)});store.loadStorefrontCategories().catch(error=>console.error('[Storefront Categories]',error))}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();