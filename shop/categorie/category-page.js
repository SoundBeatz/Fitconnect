(()=>{
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const CATEGORY_META={
    'functional-training':{symbol:'◎',image:'../../assets/shop/categories/boksen-functional.webp',lead:'Beweeg vrijer, sterker en slimmer met materiaal voor functionele training, mobiliteit en complete circuitvormen.'},
    'strength-training':{symbol:'◆',image:'../../assets/shop/categories/kracht.webp',lead:'Van vrije gewichten tot machines en racks: bouw gericht aan kracht, spiermassa en trainingskwaliteit.'},
    'combat-sports':{symbol:'✦',image:'../../assets/shop/categories/boksen-functional.webp',lead:'Alles voor techniek, power en conditie binnen boksen en andere vechtsportgerichte trainingsvormen.'},
    'crossfit':{symbol:'✚',image:'../../assets/shop/categories/gewichten.webp',lead:'Robuust en veelzijdig materiaal voor lifts, gymnastics, conditioning en intensieve WODs.'},
    'hyrox':{symbol:'↯',image:'../../assets/shop/categories/cardio.webp',lead:'Train wedstrijdgericht voor lopen, sleds, wall balls, ergometers en alle herkenbare HYROX-stations.'},
    'pilates':{symbol:'◌',image:'../../assets/shop/categories/vloeren.webp',lead:'Creëer controle, mobiliteit, houding en vloeiende beweging met professionele Pilates-oplossingen.'},
    'cardio-sport':{symbol:'♥',image:'../../assets/shop/categories/cardio.webp',lead:'Werk aan conditie en uithoudingsvermogen met cardioapparatuur voor elk trainingsniveau.'},
    'supplements':{symbol:'＋',image:'../../assets/shop/showroom-hero.webp',lead:'Ondersteun training, herstel, hydratatie en dagelijkse voedingsbehoeften met doelgerichte supplementen.'}
  };
  const ICONS=['◉','↗','⬡','◎','◇','✦','⊕','⌁','▦','⌖','⟲','△','□','○','↯','∞'];
  const keywordIcon=(name,index)=>{
    const n=String(name||'').toLowerCase();
    if(/bank|bench/.test(n))return '▱';
    if(/rack|cage|tower/.test(n))return '⌗';
    if(/kabel|cable/.test(n))return '⌁';
    if(/machine|station/.test(n))return '▦';
    if(/dumbbell|halter|gewicht/.test(n))return '━●━';
    if(/kettlebell/.test(n))return '◉';
    if(/bar|stang/.test(n))return '━━━━';
    if(/ball|wall/.test(n))return '●';
    if(/rope|touw/.test(n))return '∿';
    if(/box|step/.test(n))return '▣';
    if(/sled|slee/.test(n))return '▰';
    if(/run|loop/.test(n))return '↗';
    if(/bike|fiets/.test(n))return '◉↻';
    if(/row|roei/.test(n))return '⇆';
    if(/ski/.test(n))return '↕';
    if(/bag|zak/.test(n))return '◒';
    if(/glove|handschoen/.test(n))return '◖◗';
    if(/mat|vloer/.test(n))return '▤';
    if(/protein|eiwit/.test(n))return 'P';
    if(/creatine/.test(n))return 'Cr';
    if(/pre-workout/.test(n))return '⚡';
    if(/amino/.test(n))return 'AA';
    if(/vitamin|mineral/.test(n))return 'V+';
    if(/hydrat|elektro/.test(n))return 'H₂O';
    if(/herstel|slaap/.test(n))return '☾';
    if(/snack|sportvoeding/.test(n))return '◫';
    return ICONS[index%ICONS.length];
  };
  async function load(){
    const client=window.getFitConnectSupabase?.();
    if(!client)throw new Error('Supabase client ontbreekt');
    const {data,error}=await client.from('commerce_categories').select('id,name,slug,parent_id,type,display_order').eq('shop_key','fitness').eq('status','active').order('display_order',{ascending:true}).order('name',{ascending:true});
    if(error)throw error;
    const roots=(data||[]).filter(item=>item.type==='main').sort((a,b)=>a.display_order-b.display_order);
    const requested=new URLSearchParams(location.search).get('sport');
    const current=roots.find(item=>item.slug===requested)||roots[0];
    if(!current)throw new Error('Geen actieve categorieën gevonden');
    const subs=(data||[]).filter(item=>item.parent_id===current.id).sort((a,b)=>a.display_order-b.display_order);
    render(roots,current,subs);
  }
  function render(roots,current,subs){
    const meta=CATEGORY_META[current.id]||{symbol:'•',image:'../../assets/shop/showroom-hero.webp',lead:'Ontdek alle mogelijkheden binnen deze categorie.'};
    document.title=`${current.name} | FitConnect Shop`;
    const switcher=document.getElementById('categorySwitcher');
    switcher.innerHTML=roots.map(root=>{const item=CATEGORY_META[root.id]||{symbol:'•'};return `<a class="mini-category ${root.id===current.id?'active':''}" href="?sport=${encodeURIComponent(root.slug)}" ${root.id===current.id?'aria-current="page"':''}><span class="mini-icon" aria-hidden="true">${escapeHtml(item.symbol)}</span><span>${escapeHtml(root.name)}</span></a>`}).join('');
    const hero=document.getElementById('categoryHero');hero.style.setProperty('--hero-image',`url('${meta.image}')`);
    document.getElementById('heroSymbol').textContent=meta.symbol;
    document.getElementById('heroEyebrow').textContent='FitConnect categorie';
    document.getElementById('heroTitle').textContent=current.name;
    document.getElementById('heroLead').textContent=meta.lead;
    const allLink=document.getElementById('allProductsLink');allLink.href=`../?sport=${encodeURIComponent(current.slug)}#producten`;allLink.textContent=`Bekijk alle ${current.name.toLowerCase()} producten`;
    document.getElementById('subcategoryTitle').textContent=`Kies binnen ${current.name}`;
    document.getElementById('subcategoryCount').textContent=`${subs.length} ${subs.length===1?'duidelijke route':'duidelijke routes'} om sneller bij het juiste product uit te komen.`;
    const grid=document.getElementById('subcategoryGrid');
    grid.innerHTML=subs.length?subs.map((sub,index)=>`<a class="subcategory-card" href="../?sport=${encodeURIComponent(current.slug)}&sub=${encodeURIComponent(sub.slug)}#producten"><span class="sub-icon" aria-hidden="true">${escapeHtml(keywordIcon(sub.name,index))}</span><div><h3>${escapeHtml(sub.name)}</h3><p>Bekijk de producten en oplossingen binnen deze subcategorie.</p></div><strong>Bekijk selectie <span>→</span></strong></a>`).join(''):'<div class="category-empty">Voor deze categorie worden de subcategorieën momenteel aangevuld.</div>';
  }
  load().catch(error=>{console.error('[FitConnect Category Page]',error);document.getElementById('subcategoryGrid').innerHTML='<div class="category-empty">Deze categorie kon niet worden geladen. Ga terug naar de shop en probeer het opnieuw.</div>'});
})();