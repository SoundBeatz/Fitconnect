(()=>{
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const icons={
    functional:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 22a7 7 0 1 1 14 0"/><path d="M12 22h8M16 8v5M11 10l3 4M21 10l-3 4"/></svg>',
    strength:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12v8M9 10v12M23 10v12M27 12v8M9 16h14"/></svg>',
    combat:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 7h8l5 5-2 10-6 4-7-5-1-8z"/><path d="M10 12h10M12 7v5"/></svg>',
    crossfit:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9h20M9 9v17M23 9v17M9 14h14"/><circle cx="16" cy="19" r="3"/></svg>',
    hyrox:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 23h20M9 23l3-9h9l3 9M12 14l4-6 5 6"/><path d="M7 26h18"/></svg>',
    pilates:'<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="12" width="22" height="10" rx="2"/><path d="M9 22v4M23 22v4M10 12V8M22 12V8M10 8h12"/></svg>',
    cardio:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 17h6l3-6 5 13 4-7h6"/></svg>',
    supplements:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 7h12M12 7v4l-3 4v10h14V15l-3-4V7"/><path d="M9 18h14"/></svg>'
  };
  const meta={
    'functional-training':{icon:icons.functional,image:'../assets/shop/categories/opslag.webp',kicker:'MOVE · LOAD · PERFORM',copy:'Kettlebells, sleds, ropes, boxes en accessoires voor veelzijdige beweging.'},
    'strength-training':{icon:icons.strength,image:'../assets/shop/categories/kracht.webp',kicker:'BUILD · CONTROL · PROGRESS',copy:'Racks, halters, banken en machines voor gerichte krachtopbouw.'},
    'combat-sports':{icon:icons.combat,image:'../assets/shop/categories/boksen-functional.webp',kicker:'TECHNIQUE · SPEED · POWER',copy:'Bokszakken, handschoenen, pads en bescherming voor techniek en power.'},
    'crossfit':{icon:icons.crossfit,image:'../assets/shop/categories/gewichten.webp',kicker:'LIFT · MOVE · CONDITION',copy:'Rigs, bumper plates, kettlebells en conditioning gear voor iedere WOD.'},
    'hyrox':{icon:icons.hyrox,image:'../assets/hero/Slide01.webp',kicker:'RUN · SLED · ENDURE',copy:'Sled push, SkiErg, roeien, wall balls en running voor wedstrijddagen.'},
    'pilates':{icon:icons.pilates,image:'../assets/shop/categories/vloeren.webp',kicker:'CONTROL · ALIGN · FLOW',copy:'Reformers, matten en accessoires voor controle, mobiliteit en houding.'},
    'cardio-sport':{icon:icons.cardio,image:'../assets/shop/categories/cardio.webp',kicker:'PACE · ENGINE · ENDURANCE',copy:'Loopbanden, bikes, roeiers, crosstrainers en ergometers voor conditie.'},
    'supplements':{icon:icons.supplements,image:'../assets/hero/Slide02.webp',kicker:'FUEL · RECOVER · REPEAT',copy:'Eiwitten, creatine, hydratatie, vitamines en sportvoeding voor herstel.'}
  };
  function render(categories){
    const mains=categories.filter(item=>item.type==='main').sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));
    const select=document.getElementById('categoryFilter');
    if(select){const selected=select.value;select.innerHTML='<option value="Alle">Alle categorieën</option>'+mains.map(item=>`<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('');if([...select.options].some(option=>option.value===selected))select.value=selected}
    const grid=document.querySelector('.category-grid');
    if(grid){grid.innerHTML=mains.map((item,index)=>{const data=meta[item.id]||{icon:'',image:'../assets/shop/showroom-hero.webp',kicker:'DISCOVER · SELECT · TRAIN',copy:'Bekijk alle mogelijkheden binnen deze categorie.'};return `<a class="category-tile" href="categorie/?sport=${encodeURIComponent(item.slug)}" data-category="${escapeHtml(item.name)}" data-category-id="${escapeHtml(item.id)}" style="--category-image:url('${escapeHtml(data.image)}')"><span class="category-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="category-icon" aria-hidden="true">${data.icon}</span><div class="category-copy"><small>${escapeHtml(data.kicker)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(data.copy)}</p><strong>Bekijk assortiment <span>→</span></strong></div></a>`}).join('')}
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