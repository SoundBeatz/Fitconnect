(()=>{
  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';
  const params=new URLSearchParams(location.search);
  const slug=params.get('slug');
  const el=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  let product=null;
  let mainIsVideo=false;

  function videoEmbed(value){
    try{
      const url=new URL(value),host=url.hostname.replace(/^www\./,'').toLowerCase();let id='';
      if(host==='youtu.be')id=url.pathname.split('/')[1];
      else if(host.endsWith('youtube.com'))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      if(id&&/^[\w-]{6,}$/.test(id))return{provider:'YouTube',url:`https://www.youtube-nocookie.com/embed/${id}`};
      if(host.endsWith('vimeo.com')){id=url.pathname.match(/(?:video\/)?(\d+)/)?.[1];if(id)return{provider:'Vimeo',url:`https://player.vimeo.com/video/${id}`}}
      if(host.endsWith('loom.com')){id=url.pathname.match(/\/(?:share|embed)\/([\w-]+)/)?.[1];if(id)return{provider:'Loom',url:`https://www.loom.com/embed/${id}`}}
      if(host.endsWith('dailymotion.com')||host==='dai.ly'){id=host==='dai.ly'?url.pathname.split('/')[1]:url.pathname.match(/\/video\/([\w-]+)/)?.[1];if(id)return{provider:'Dailymotion',url:`https://www.dailymotion.com/embed/video/${id}`}}
      if(host.endsWith('wistia.com')||host.endsWith('wi.st')){id=url.pathname.match(/(?:medias|embed)\/([\w-]+)/)?.[1];if(id)return{provider:'Wistia',url:`https://fast.wistia.net/embed/iframe/${id}`}}
      return null;
    }catch{return null}
  }

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
    const specs=p.specifications&&typeof p.specifications==='object'?p.specifications:{};
    const seoTitle=specs['SEO titel']||`${p.name} | FitConnect Shop`,seoDescription=specs['SEO meta-description']||p.short_description||'Professionele fitnessapparatuur met persoonlijk advies van FitConnect',seoSlug=specs['SEO slug']||p.slug,canonical=`https://fitconnect.nl/shop/product/?slug=${encodeURIComponent(seoSlug)}`;
    document.title=seoTitle;
    el('metaDescription').setAttribute('content',seoDescription);el('metaKeywords').setAttribute('content',specs['SEO zoektermen']||'fitnessapparatuur, homegym, FitConnect');el('canonicalUrl').setAttribute('href',canonical);el('ogTitle').setAttribute('content',specs['Social titel']||seoTitle);el('ogDescription').setAttribute('content',specs['Social omschrijving']||seoDescription);
    el('productName').textContent=specs['SEO H1']||p.name;
    el('crumbName').textContent=p.name;
    el('categoryLabel').textContent=p.category||'Product';
    el('shortDescription').textContent=p.short_description||'';
    el('sku').textContent=specs.SKU?`SKU ${specs.SKU}`:[p.brand,p.model].filter(Boolean).join(' · ');
    el('price').textContent=euro(p.price);
    el('priceNote').textContent='Inclusief btw en persoonlijk advies';
    el('stock').textContent=Number(p.stock)>0?`${p.stock} op voorraad`:'Op aanvraag';
    el('delivery').textContent=p.delivery||'In overleg';
    el('warranty').textContent=p.warranty||'Volgens fabrikant';
    el('longDescription').innerHTML=`<p>${escapeHtml(p.description||p.short_description||'Professioneel geselecteerd door FitConnect.')}</p><p>FitConnect beoordeelt altijd of dit product past bij uw ruimte, doelstelling, lichaamsbouw en gewenste gebruiksintensiteit.</p>`;

    const shippingKeys=new Set(['Verzendgewicht (kg)','Aantal colli','Verpakking lengte (cm)','Verpakking breedte (cm)','Verpakking hoogte (cm)']),internalKeys=new Set(['AI bronomschrijving','SEO titel','SEO meta-description','SEO slug','SEO H1','SEO zoektermen','SEO producttype','SEO conditie','Social titel','Social omschrijving']);
    const technicalEntries=Object.entries(specs).filter(([key])=>!shippingKeys.has(key)&&!internalKeys.has(key));
    const shippingEntries=Object.entries(specs).filter(([key])=>shippingKeys.has(key));
    el('specList').innerHTML=technicalEntries.length?technicalEntries.map(([key,value])=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join(''):'<div><dt>Specificaties</dt><dd>Op aanvraag</dd></div>';
    el('shippingList').innerHTML=shippingEntries.length?shippingEntries.map(([key,value])=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join(''):'<div><dt>Verzendgegevens</dt><dd>Worden bij bestelling bevestigd</dd></div>';
    el('deliveryText').innerHTML=`<p>Levertijd: ${escapeHtml(p.delivery||'in overleg')}. Garantie: ${escapeHtml(p.warranty||'volgens fabrikant')}. Levering, montage, afstelling en uitleg kunnen door FitConnect worden verzorgd.</p>`;
    el('customText').innerHTML='<p>Deze uitvoering wordt standaard geleverd zoals getoond. Maatwerk bespreken we apart via een persoonlijk voorstel.</p>';
    el('upholsteryOptions').hidden=true;
    el('frameOptions').hidden=true;
    el('customNote').textContent='U koopt de standaarduitvoering. Voor maatwerk ontvangt u een afzonderlijk voorstel.';

    const media=Array.isArray(p.images)?p.images.filter(item=>typeof item==='string'&&(item.startsWith('http://')||item.startsWith('https://')||item.startsWith('/'))):[];
    const primaryImage=media.find(item=>!videoEmbed(item));if(primaryImage)el('ogImage').setAttribute('content',primaryImage);
    el('productStructuredData').textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.name,description:seoDescription,sku:specs.SKU||undefined,gtin13:specs.EAN||undefined,brand:{'@type':'Brand',name:p.brand},category:specs['SEO producttype']||p.category,image:primaryImage?[primaryImage]:undefined,itemCondition:`https://schema.org/${specs['SEO conditie']||'NewCondition'}`,offers:{'@type':'Offer',url:canonical,priceCurrency:'EUR',price:Number(p.price||0),availability:Number(p.stock)>0?'https://schema.org/InStock':'https://schema.org/PreOrder'}});
    const gallery=media.length?media:['Productfoto','Zijaanzicht','Detail','In gebruik'];
    renderGallery(gallery,media.length>0);
    el('alternativeGrid').innerHTML='<article class="alternative-card"><div class="alternative-image"><span>Persoonlijk advies</span></div><div class="alternative-copy"><h3>Een passend alternatief nodig?</h3><p>FitConnect vergelijkt dit product graag met andere opties binnen uw ruimte en budget.</p><a href="../../configurator/">Start Gym ontwerp →</a></div></article>';
  }

  function renderGallery(items,hasImages){
    const setMain=item=>{
      if(hasImages){
        const video=videoEmbed(item);mainIsVideo=Boolean(video);
        el('mainImage').classList.toggle('is-video',mainIsVideo);
        if(video){
          el('mainImage').style.backgroundImage='';
          el('mainImage').innerHTML=`<iframe src="${escapeHtml(video.url)}" title="${escapeHtml(product?.name||'Productvideo')} via ${video.provider}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        }else{
          el('mainImage').innerHTML='<span id="mainImageLabel"></span>';
          el('mainImage').style.backgroundImage=`url('${item}')`;
          el('mainImage').style.backgroundSize='contain';
          el('mainImage').style.backgroundRepeat='no-repeat';
          el('mainImage').style.backgroundPosition='center';
        }
      }else{
        mainIsVideo=false;
        el('mainImage').style.backgroundImage='';
        el('mainImageLabel').textContent=item;
      }
    };
    setMain(items[0]);
    el('thumbGrid').innerHTML=items.map((item,index)=>{const video=hasImages&&videoEmbed(item);return`<button class="thumb ${index===0?'active':''}" data-index="${index}" type="button">${hasImages?`<span class="media-kind">${video?video.provider:'Foto'}</span><span>${video?'Productvideo':`Foto ${index+1}`}</span>`:`<span>${escapeHtml(item)}</span>`}</button>`}).join('');
    document.querySelectorAll('.thumb').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.thumb').forEach(node=>node.classList.remove('active'));
      button.classList.add('active');
      setMain(items[Number(button.dataset.index)]);
    }));
  }

  function openLightbox(){
    if(!product||mainIsVideo)return;
    el('lightboxImage').innerHTML=`<span>${escapeHtml(product.name)}</span>`;
    el('lightbox').classList.add('open');
    el('lightbox').setAttribute('aria-hidden','false');
  }
  el('mainImage')?.addEventListener('click',openLightbox);
  el('closeLightbox')?.addEventListener('click',()=>{el('lightbox').classList.remove('open');el('lightbox').setAttribute('aria-hidden','true')});
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(node=>node.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(node=>node.classList.remove('active'));button.classList.add('active');el(button.dataset.tab).classList.add('active')}));
  el('addToCart')?.addEventListener('click',()=>{if(!product)return;let cart=[];try{cart=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]').map(item=>typeof item==='string'?{productId:item,quantity:1}:item)}catch(_error){}const item=cart.find(entry=>entry.productId===product.id);if(item)item.quantity+=1;else cart.push({productId:product.id,quantity:1});localStorage.setItem('fitconnect-cart',JSON.stringify(cart));el('addToCart').textContent='Toegevoegd aan winkelmand ✓'});
  el('askQuestion')?.addEventListener('click',()=>{if(!product)return;const body=encodeURIComponent(`Hallo FitConnect,\n\nIk ontvang graag advies over: ${product.name}\n\nNaam:\nTelefoon:\nPostcode:\nVraag:`);location.href=`mailto:info@fitconnect.nl?subject=Productadvies%20${encodeURIComponent(product.name)}&body=${body}`});
  const year=el('year');if(year)year.textContent=new Date().getFullYear();
  loadProduct();
})();
