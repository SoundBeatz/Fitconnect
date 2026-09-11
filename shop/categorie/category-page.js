(()=>{
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const CATEGORY_META={
    'functional-training':{symbol:'⬡',image:'../../assets/shop/categories/opslag.webp',lead:'Kettlebells, sleds, ropes, boxes, sandbags en accessoires voor vrije beweging, circuits en complete functionele training.'},
    'strength-training':{symbol:'◆',image:'../../assets/shop/categories/kracht.webp',lead:'Van racks en halters tot banken en machines: bouw gericht aan kracht, spiermassa en trainingskwaliteit.'},
    'combat-sports':{symbol:'✦',image:'../../assets/shop/categories/boksen-functional.webp',lead:'Bokszakken, handschoenen, pads, bescherming en vloeren voor techniek, power en complete vechtsporttraining.'},
    'crossfit':{symbol:'✚',image:'../../assets/shop/categories/gewichten.webp',lead:'Rigs, bumper plates, kettlebells, boxes en conditioning gear voor lifts, gymnastics en intensieve WODs.'},
    'hyrox':{symbol:'↯',image:'../../assets/hero/Slide01.webp',lead:'Train wedstrijdgericht voor sled push en pull, SkiErg, roeien, wall balls, farmers carry en running.'},
    'pilates':{symbol:'◌',image:'../../assets/shop/categories/vloeren.webp',lead:'Reformers, matten en accessoires voor controle, mobiliteit, houding en vloeiende professionele Pilates-training.'},
    'cardio-sport':{symbol:'♥',image:'../../assets/shop/categories/cardio.webp',lead:'Loopbanden, bikes, roeiers, crosstrainers en ergometers voor conditie en uithoudingsvermogen op ieder niveau.'},
    'supplements':{symbol:'＋',image:'../../assets/hero/Slide02.webp',lead:'Eiwitten, creatine, hydratatie, vitamines, herstelproducten en sportvoeding om training en dagelijkse voeding te ondersteunen.'}
  };
  const ICONS=['◉','↗','⬡','◎','◇','✦','⊕','⌁','▦','⌖','⟲','△','□','○','↯','∞'];
  const keywordIcon=(name,index)=>{
    const n=String(name||'').toLowerCase();
    const specific=/bank|bench/.test(n)?'▱':/rack|cage|tower/.test(n)?'⌗':/kabel|cable/.test(n)?'⌁':/machine|station/.test(n)?'▦':/dumbbell|halter|gewicht/.test(n)?'━●━':/kettlebell/.test(n)?'◉':/bar|stang/.test(n)?'━━━━':/ball|wall/.test(n)?'●':/rope|touw/.test(n)?'∿':/box|step/.test(n)?'▣':/sled|slee/.test(n)?'▰':/run|loop/.test(n)?'↗':/bike|fiets/.test(n)?'◉↻':/row|roei/.test(n)?'⇆':/ski/.test(n)?'↕':/bag|zak/.test(n)?'◒':/glove|handschoen/.test(n)?'◖◗':/mat|vloer/.test(n)?'▤':/protein|eiwit/.test(n)?'P':/creatine/.test(n)?'Cr':/pre-workout/.test(n)?'⚡':/amino/.test(n)?'AA':/vitamin|mineral/.test(n)?'V+':/hydrat|elektro/.test(n)?'H₂O':/herstel|slaap/.test(n)?'☾':/snack|sportvoeding/.test(n)?'◫':ICONS[index%ICONS.length];
    return `${specific}${index+1}`;
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