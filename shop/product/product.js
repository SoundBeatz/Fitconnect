(()=>{
  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';
  const params=new URLSearchParams(location.search);
  const slug=params.get('slug');
  const el=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  let product=null;

  async function loadProduct(){
    if(!slug){showError('Geen product geselecteerd.');return}
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
      if(!response.ok)throw new Error(`Product API ${response.status}`);
      const rows=await response.json();
      if(!rows.length){showError('Dit product is niet beschikbaar.');return}
      product=rows[0];
      renderProduct();
    }catch(error){
      console.error('FitConnect product kon niet laden',error);
      showError('De productgegevens konden niet worden geladen.');
    }
  }

  function showError(message){
    el('productName').textContent=message;
    el('shortDescription').textContent='Ga terug naar de shop en probeer het opnieuw.';
  }

  function renderProduct(){
    const p=product;
    document.title=`${p.name} | FitConnect Shop`;
    el('productName').textContent=p.name;
    el('crumbName').textContent=p.name;
    el('categoryLabel').textContent=p.category||'Product';
    el('shortDescription').textContent=p.short_description||'';
    el('sku').textContent=[p.brand,p.model].filter(Boolean).join(' · ');
    el('price').textContent=euro(p.price);
    el('priceNote').textContent='Inclusief btw en persoonlijk advies';
    el('stock').textContent=Number(p.stock)>0?`${p.stock} op voorraad`:'Op aanvraag';
    el('delivery').textContent=p.delivery||'In overleg';
    el('warranty').textContent=p.warranty||'Volgens fabrikant';
    el('longDescription').innerHTML=`<p>${escapeHtml(p.description||p.short_description||'Professioneel geselecteerd door FitConnect.')}</p><p>FitConnect beoordeelt altijd of dit product past bij uw ruimte, doelstelling, lichaamsbouw en gewenste gebruiksintensiteit.</p>`;

    const specs=p.specifications&&typeof p.specifications==='object'?p.specifications:{};
    el('specList').innerHTML=Object.keys(specs).length?Object.entries(specs).map(([key,value])=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join(''):'<div><dt>Specificaties</dt><dd>Op aanvraag</dd></div>';
    el('deliveryText').innerHTML=`<p>Levertijd: ${escapeHtml(p.delivery||'in overleg')}. Garantie: ${escapeHtml(p.warranty||'volgens fabrikant')}. Levering, montage, afstelling en uitleg kunnen door FitConnect worden verzorgd.</p>`;
    el('customText').innerHTML='<p>Deze uitvoering wordt standaard geleverd zoals getoond. Maatwerk bespreken we apart via een persoonlijk voorstel.</p>';
    el('upholsteryOptions').hidden=true;
    el('frameOptions').hidden=true;
    el('customNote').textContent='U koopt de standaarduitvoering. Voor maatwerk ontvangt u een afzonderlijk voorstel.';

    const images=Array.isArray(p.images)?p.images.filter(image=>typeof image==='string'&&(image.startsWith('http://')||image.startsWith('https://')||image.startsWith('/'))):[];
    const labels=images.length?images:['Productfoto','Zijaanzicht','Detail','In gebruik'];
    renderGallery(labels,images.length>0);
    el('alternativeGrid').innerHTML='<article class="alternative-card"><div class="alternative-image"><span>Persoonlijk advies</span></div><div class="alternative-copy"><h3>Een passend alternatief nodig?</h3><p>FitConnect vergelijkt dit product graag met andere opties binnen uw ruimte en budget.</p><a href="../../configurator/">Start Gym ontwerp →</a></div></article>';
  }

  function renderGallery(items,hasImages){
    const setMain=item=>{
      if(hasImages){
        el('mainImage').style.backgroundImage=`url('${item}')`;
        el('mainImage').style.backgroundSize='contain';
        el('mainImage').style.backgroundRepeat='no-repeat';
        el('mainImage').style.backgroundPosition='center';
        el('mainImageLabel').textContent='';
      }else{
        el('mainImage').style.backgroundImage='';
        el('mainImageLabel').textContent=item;
      }
    };
    setMain(items[0]);
    el('thumbGrid').innerHTML=items.map((item,index)=>`<button class="thumb ${index===0?'active':''}" data-index="${index}" type="button">${hasImages?`<span>Foto ${index+1}</span>`:`<span>${escapeHtml(item)}</span>`}</button>`).join('');
    document.querySelectorAll('.thumb').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.thumb').forEach(node=>node.classList.remove('active'));
      button.classList.add('active');
      setMain(items[Number(button.dataset.index)]);
    }));
  }

  function openLightbox(){
    if(!product)return;
    el('lightboxImage').innerHTML=`<span>${escapeHtml(product.name)}</span>`;
    el('lightbox').classList.add('open');
    el('lightbox').setAttribute('aria-hidden','false');
  }
  el('mainImage')?.addEventListener('click',openLightbox);
  el('closeLightbox')?.addEventListener('click',()=>{el('lightbox').classList.remove('open');el('lightbox').setAttribute('aria-hidden','true')});
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(node=>node.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(node=>node.classList.remove('active'));button.classList.add('active');el(button.dataset.tab).classList.add('active')}));
  el('addToCart')?.addEventListener('click',()=>{if(!product)return;let cart=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');if(!cart.includes(product.id))cart.push(product.id);localStorage.setItem('fitconnect-cart',JSON.stringify(cart));el('addToCart').textContent='Toegevoegd aan selectie ✓'});
  el('askQuestion')?.addEventListener('click',()=>{if(!product)return;const body=encodeURIComponent(`Hallo FitConnect,\n\nIk ontvang graag advies over: ${product.name}\n\nNaam:\nTelefoon:\nPostcode:\nVraag:`);location.href=`mailto:info@fitconnect.nl?subject=Productadvies%20${encodeURIComponent(product.name)}&body=${body}`});
  const year=el('year');if(year)year.textContent=new Date().getFullYear();
  loadProduct();
})();