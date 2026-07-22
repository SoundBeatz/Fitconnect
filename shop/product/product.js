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
  let currentImage='';
  let zoomLevel=1;
  let galleryItems=[];
  let currentGalleryIndex=0;

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
    galleryItems=hasImages?items.filter(item=>!videoEmbed(item)):[];
    const setMain=item=>{
      if(hasImages){
        const video=videoEmbed(item);mainIsVideo=Boolean(video);
        el('mainImage').classList.toggle('is-video',mainIsVideo);
        if(video){
          currentImage='';
          el('mainImage').style.backgroundImage='';
          el('mainImage').innerHTML=`<iframe src="${escapeHtml(video.url)}" title="${escapeHtml(product?.name||'Productvideo')} via ${video.provider}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        }else{
          currentImage=item;
          currentGalleryIndex=Math.max(0,galleryItems.indexOf(item));
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
    el('thumbGrid').innerHTML=items.map((item,index)=>{const video=hasImages&&videoEmbed(item);return`<button class="thumb ${index===0?'active':''} ${video?'is-video':''}" data-index="${index}" type="button">${hasImages&&!video?`<img src="${escapeHtml(item)}" alt="${escapeHtml(product?.name||'Product')} foto ${index+1}" loading="lazy">`:''}${hasImages?`<span class="media-kind">${video?video.provider:'Foto'}</span><span>${video?'Productvideo':`Foto ${index+1}`}</span>`:`<span>${escapeHtml(item)}</span>`}</button>`}).join('');
    document.querySelectorAll('.thumb').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.thumb').forEach(node=>node.classList.remove('active'));
      button.classList.add('active');
      setMain(items[Number(button.dataset.index)]);
    }));
  }

  function selectGalleryPhoto(index){
    if(!galleryItems.length)return;
    currentGalleryIndex=(index+galleryItems.length)%galleryItems.length;
    currentImage=galleryItems[currentGalleryIndex];
    mainIsVideo=false;
    el('mainImage').classList.remove('is-video');
    el('mainImage').innerHTML='<span id="mainImageLabel"></span>';
    el('mainImage').style.backgroundImage=`url('${currentImage}')`;
    el('mainImage').style.backgroundSize='contain';
    el('mainImage').style.backgroundRepeat='no-repeat';
    el('mainImage').style.backgroundPosition='center';
    document.querySelectorAll('.thumb').forEach(button=>{
      const item=Array.isArray(product?.images)?product.images[Number(button.dataset.index)]:null;
      button.classList.toggle('active',item===currentImage);
    });
    if(el('lightbox')?.classList.contains('open')){
      zoomLevel=1;
      el('lightboxPhoto').src=currentImage;
      updateZoom();
    }
  }

  function openLightbox(){
    if(!product||mainIsVideo||!currentImage)return;
    zoomLevel=1;
    el('lightboxPhoto').src=currentImage;
    el('lightboxPhoto').alt=product.name;
    el('lightbox').classList.add('open');
    el('lightbox').setAttribute('aria-hidden','false');
    requestAnimationFrame(updateZoom);
  }
  function updateZoom(){
    const photo=el('lightboxPhoto');if(!photo)return;
    const stage=el('lightboxImage');
    const sizePhoto=()=>{
      if(!photo.naturalWidth||!photo.naturalHeight||!stage)return;
      const style=getComputedStyle(stage);
      const availableWidth=Math.max(1,stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
      const availableHeight=Math.max(1,stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
      const fittedScale=Math.min(availableWidth/photo.naturalWidth,availableHeight/photo.naturalHeight);
      photo.style.width=`${Math.round(photo.naturalWidth*fittedScale*zoomLevel)}px`;
      photo.style.height=`${Math.round(photo.naturalHeight*fittedScale*zoomLevel)}px`;
    };
    if(photo.complete)sizePhoto();else photo.addEventListener('load',sizePhoto,{once:true});
    el('zoomOut').disabled=zoomLevel<=0.5;
    el('zoomIn').disabled=zoomLevel>=3;
    el('previousPhoto').disabled=galleryItems.length<=1;
    el('nextPhoto').disabled=galleryItems.length<=1;
    el('photoPosition').textContent=galleryItems.length?`${currentGalleryIndex+1} / ${galleryItems.length}`:'1 / 1';
  }
  function changeZoom(delta){zoomLevel=Math.min(3,Math.max(0.5,Math.round((zoomLevel+delta)*100)/100));updateZoom()}
  function closeLightbox(){el('lightbox').classList.remove('open');el('lightbox').setAttribute('aria-hidden','true')}
  el('mainImage')?.addEventListener('click',openLightbox);
  el('closeLightbox')?.addEventListener('click',closeLightbox);
  el('dismissLightbox')?.addEventListener('click',closeLightbox);
  el('previousPhoto')?.addEventListener('click',()=>selectGalleryPhoto(currentGalleryIndex-1));
  el('nextPhoto')?.addEventListener('click',()=>selectGalleryPhoto(currentGalleryIndex+1));
  el('zoomOut')?.addEventListener('click',()=>changeZoom(-0.25));
  el('zoomIn')?.addEventListener('click',()=>changeZoom(0.25));
  el('zoomReset')?.addEventListener('click',()=>{zoomLevel=1;updateZoom()});
  el('lightbox')?.addEventListener('click',event=>{if(event.target===el('lightbox'))el('closeLightbox').click()});
  window.addEventListener('resize',()=>{if(el('lightbox')?.classList.contains('open'))updateZoom()});
  document.addEventListener('keydown',event=>{if(!el('lightbox')?.classList.contains('open'))return;if(event.key==='Escape')closeLightbox();if(event.key==='ArrowLeft')selectGalleryPhoto(currentGalleryIndex-1);if(event.key==='ArrowRight')selectGalleryPhoto(currentGalleryIndex+1)});
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(node=>node.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(node=>node.classList.remove('active'));button.classList.add('active');el(button.dataset.tab).classList.add('active')}));
  function readCart(){
    try{
      const stored=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');
      return Array.isArray(stored)?stored.map(item=>typeof item==='string'?{productId:item,quantity:1}:item).filter(item=>item?.productId&&Number(item.quantity)>0):[];
    }catch(_error){return []}
  }
  function cartCount(cart){return cart.reduce((sum,item)=>sum+Number(item.quantity||0),0)}
  function showCartActions(cart){
    const count=cartCount(cart);
    const actions=el('addToCart')?.closest('.buy-actions');
    actions?.classList.toggle('has-cart',count>0);
    el('viewCart').hidden=count===0;
    el('continueShopping').hidden=count===0;
    el('productCartCount').textContent=String(count);
    const navCount=el('cartCount');if(navCount)navCount.textContent=String(count);
  }
  el('addToCart')?.addEventListener('click',()=>{
    if(!product)return;
    const cart=readCart(),item=cart.find(entry=>entry.productId===product.id);
    if(item)item.quantity+=1;else cart.push({productId:product.id,quantity:1});
    localStorage.setItem('fitconnect-cart',JSON.stringify(cart));
    el('addToCart').textContent='Nog één toevoegen';
    showCartActions(cart);
  });
  showCartActions(readCart());
  el('askQuestion')?.addEventListener('click',()=>{if(!product)return;const body=encodeURIComponent(`Hallo FitConnect,\n\nIk ontvang graag advies over: ${product.name}\n\nNaam:\nTelefoon:\nPostcode:\nVraag:`);location.href=`mailto:info@fitconnect.nl?subject=Productadvies%20${encodeURIComponent(product.name)}&body=${body}`});
  function shareData(){const message=el('shareMessage').value.trim();return{title:product.name,text:`${message}\n\n${product.name}\n${product.short_description||''}`,url:location.href}}
  el('shareProduct')?.addEventListener('click',()=>{if(!product)return;const image=Array.isArray(product.images)?product.images.find(item=>!videoEmbed(item)):'';el('shareImage').src=image||'';el('shareImage').hidden=!image;el('shareTitle').textContent=product.name;el('shareDescription').textContent=product.short_description||'Professioneel geselecteerd door FitConnect.';el('sharePrice').textContent=euro(product.price);el('shareDialog').showModal()});
  el('closeShare')?.addEventListener('click',()=>el('shareDialog').close());el('shareWhatsapp')?.addEventListener('click',()=>{const data=shareData();open(`https://wa.me/?text=${encodeURIComponent(`${data.text}\n\nBekijk foto's en productinformatie:\n${data.url}`)}`,'_blank','noopener')});el('shareEmail')?.addEventListener('click',()=>{const data=shareData();location.href=`mailto:?subject=${encodeURIComponent(data.title+' via FitConnect')}&body=${encodeURIComponent(`${data.text}\n\nBekijk het product inclusief foto's en informatie:\n${data.url}`)}`});el('shareNative')?.addEventListener('click',async()=>{const data=shareData();if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(data.url)});el('copyShareLink')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(location.href);el('copyShareLink').textContent='Link gekopieerd'});
  const year=el('year');if(year)year.textContent=new Date().getFullYear();
  loadProduct();
})();
