(()=>{
  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';
  const client=window.getFitConnectSupabase?.();
  const grid=document.getElementById('productGrid');
  const searchInput=document.getElementById('searchInput');
  const categoryFilter=document.getElementById('categoryFilter');
  const brandFilter=document.getElementById('brandFilter');
  const shopSort=document.getElementById('shopSort');
  const cartPanel=document.getElementById('cartPanel');
  const backdrop=document.getElementById('backdrop');
  const cartItems=document.getElementById('cartItems');
  const pricingNotice=document.getElementById('pricingNotice');
  let products=[];
  let brands=[];
  let activeSubcategory='';
  let profile=null;
  let cart=loadCart();

  function loadCart(){
    try{
      const stored=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');
      return Array.isArray(stored)?stored.map(item=>typeof item==='string'?{productId:item,quantity:1}:item).filter(item=>item?.productId&&Number(item.quantity)>0):[];
    }catch(_error){return []}
  }

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const isVideoUrl=value=>/(?:youtu\.be|youtube\.com|vimeo\.com|loom\.com|dailymotion\.com|dai\.ly|wistia\.com|wi\.st)/i.test(String(value||''));
  const validImage=product=>{
    const first=Array.isArray(product.images)?product.images.find(image=>!isVideoUrl(image)):null;
    return typeof first==='string'&&(first.startsWith('https://')||first.startsWith('http://')||first.startsWith('/'))?first:null;
  };
  const stockText=product=>Number(product.stock)>0?`${product.stock} op voorraad`:'Op aanvraag';
  const discount=()=>Math.max(0,Math.min(100,Number(profile?.discount_percent||0)));
  const isBusiness=()=>profile?.account_type==='business'||profile?.price_display==='net';
  const tierLabel=()=>({standard:'Standard',silver:'Silver Member',gold:'Gold Member',custom:'Persoonlijk tarief'}[profile?.customer_tier]||'');
  function priceFor(product){
    const gross=Number(product.price||0);
    const vat=Number(product.vat||21);
    const base=isBusiness()?gross/(1+vat/100):gross;
    return base*(1-discount()/100);
  }
  function priceLabel(product){
    const tax=isBusiness()?'excl. btw':'incl. btw';
    const member=discount()>0?` · ${discount().toLocaleString('nl-NL')}% membervoordeel`:'';
    return `${euro(priceFor(product))} ${tax}${member}`;
  }
  function renderPricingNotice(){
    if(!pricingNotice)return;
    if(!profile){pricingNotice.textContent='Prijzen worden inclusief btw weergegeven.';return}
    const member=tierLabel();
    pricingNotice.textContent=isBusiness()
      ?`Zakelijke prijsweergave exclusief btw${member?` · ${member}`:''}${discount()>0?` · ${discount().toLocaleString('nl-NL')}% voordeel`:''}.`
      :`Prijzen inclusief btw${member&&profile.customer_tier!=='standard'?` · ${member}`:''}${discount()>0?` · ${discount().toLocaleString('nl-NL')}% voordeel`:''}.`;
  }
  async function loadProfile(){
    if(!client)return;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session?.user)return;
      const {data,error}=await client.from('profiles').select('account_type,customer_tier,discount_percent,price_display').eq('id',session.user.id).maybeSingle();
      if(error)throw error;
      profile=data||null;
    }catch(error){console.warn('Klanttarief kon niet worden geladen',error)}
  }

  async function loadProducts(){
    grid.innerHTML='<div class="empty-state">Producten laden…</div>';
    try{
      await loadProfile();
      const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};
      const [response,brandResponse]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/products?select=id,slug,brand,model,name,category,price,vat,stock,delivery,warranty,short_description,images,featured,specifications,created_at&status=eq.active&category=neq.Voeding&order=featured.desc,created_at.desc`,{headers}),fetch(`${SUPABASE_URL}/rest/v1/brands?select=*&status=eq.active&order=featured.desc,display_order.asc,name.asc`,{headers})]);
      if(!response.ok)throw new Error(`Product API ${response.status}`);
      products=await response.json();
      brands=brandResponse.ok?await brandResponse.json():[];
      renderBrands();
      renderPricingNotice();
      renderProducts();
      renderCart();
      if(new URLSearchParams(location.search).get('cart')==='open')openCart();
    }catch(error){
      console.error('FitConnect shop kon producten niet laden',error);
      grid.innerHTML='<div class="empty-state">De producten konden niet worden geladen. Probeer de pagina opnieuw te openen.</div>';
    }
  }

  function renderBrands(){
    const display=document.getElementById('brandDisplay');
    const names=[...new Set([...brands.map(brand=>brand.name),...products.map(product=>product.brand)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nl'));
    if(brandFilter){const current=brandFilter.value;brandFilter.innerHTML='<option value="Alle">Alle merken</option>'+names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');if(names.includes(current))brandFilter.value=current}
    if(!display)return;
    const cards=brands.length?brands:names.map(name=>({name,description:'Bekijk alle geselecteerde producten van dit merk.',logo_url:null}));
    display.innerHTML=cards.map(brand=>`<button class="brand-card" type="button" data-shop-brand="${escapeHtml(brand.name)}"><span class="brand-logo">${brand.logo_url?`<img src="${escapeHtml(brand.logo_url)}" alt="Logo ${escapeHtml(brand.name)}">`:`<span>${escapeHtml(brand.name)}</span>`}</span><span class="brand-copy"><h3>${escapeHtml(brand.name)}</h3><p>${escapeHtml(brand.description||'Professioneel geselecteerd door FitConnect.')}</p><span>Bekijk producten →</span></span></button>`).join('')||'<p>De merkselectie wordt binnenkort aangevuld.</p>';
    document.querySelectorAll('[data-shop-brand]').forEach(button=>button.addEventListener('click',()=>{if(brandFilter)brandFilter.value=button.dataset.shopBrand;document.querySelectorAll('[data-shop-brand]').forEach(node=>node.classList.toggle('active',node===button));renderProducts();document.getElementById('producten')?.scrollIntoView({behavior:'smooth'})}));
  }

  function renderProducts(){
    const q=(searchInput?.value||'').trim().toLowerCase();
    const category=categoryFilter?.value||'Alle',brand=brandFilter?.value||'Alle',sort=shopSort?.value||'featured';
    const visible=products.filter(product=>{
      const subcategory=product.specifications?.Subcategorie||'';
      const sku=product.specifications?.SKU||'',ean=product.specifications?.EAN||'';
      return (category==='Alle'||product.category===category)&&(brand==='Alle'||product.brand===brand)&&(!activeSubcategory||subcategory===activeSubcategory)&&`${product.name} ${product.brand} ${product.model||''} ${product.category} ${subcategory} ${sku} ${ean} ${product.short_description||''}`.toLowerCase().includes(q);
    });
    const collator=new Intl.Collator('nl',{sensitivity:'base'});visible.sort((a,b)=>sort==='name'?collator.compare(a.name,b.name):sort==='brand'?collator.compare(a.brand,b.brand):sort==='price-asc'?priceFor(a)-priceFor(b):sort==='price-desc'?priceFor(b)-priceFor(a):(Number(b.featured)-Number(a.featured)||new Date(b.created_at)-new Date(a.created_at)));
    const resultCount=document.getElementById('shopResultCount');if(resultCount)resultCount.textContent=`${visible.length} ${visible.length===1?'product':'producten'} gevonden`;
    grid.innerHTML=visible.length?visible.map(product=>{
      const image=validImage(product);
      const brandMeta=brands.find(brand=>brand.name.toLowerCase()===String(product.brand||'').toLowerCase());
      const visualStyle=image?` style="background-image:linear-gradient(rgba(10,11,13,.08),rgba(10,11,13,.28)),url('${escapeHtml(image)}')"`:'';
      return `<article class="product-card ${product.featured?'featured-product':''}">
        <a class="product-visual ${image?'has-image':''}" href="product/?slug=${encodeURIComponent(product.slug)}" aria-label="Bekijk ${escapeHtml(product.name)}"${visualStyle}>
          <span>${escapeHtml((product.category||'Product').toUpperCase())}</span>
          ${product.featured?'<b class="featured-badge">FitConnect keuze</b>':''}
          ${!image?`<div class="product-placeholder"><small>${escapeHtml(product.brand)}</small><strong>${escapeHtml(product.model||product.name)}</strong></div>`:''}
        </a>
        <div class="product-copy">${brandMeta?.logo_url?`<img class="product-brand-logo" src="${escapeHtml(brandMeta.logo_url)}" alt="Logo ${escapeHtml(product.brand)}">`:''}
          <p class="product-brand">${escapeHtml(product.brand)}${product.model?` · ${escapeHtml(product.model)}`:''}</p>
          <h3><a href="product/?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a></h3>
          <p>${escapeHtml(product.short_description||'Professioneel geselecteerd en geleverd met persoonlijk FitConnect-advies.')}</p>
          <div class="product-facts"><span>${escapeHtml(stockText(product))}</span><span>${escapeHtml(product.delivery||'Levertijd op aanvraag')}</span></div>
          <a class="detail-link" href="product/?slug=${encodeURIComponent(product.slug)}">Bekijk details en specificaties →</a>
          <div class="product-meta"><strong>${escapeHtml(priceLabel(product))}</strong><button class="add-button" data-id="${escapeHtml(product.id)}" type="button">Toevoegen</button></div>
        </div>
      </article>`;
    }).join(''):'<div class="empty-state">Geen producten gevonden. Probeer een andere zoekterm of categorie.</div>';
    document.querySelectorAll('.add-button').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.id)));
  }

  function showConfirmation(product,destination='cart'){
    const dialog=document.getElementById('addConfirmation');if(!dialog)return openCart();
    const config={cart:{title:'Toegevoegd aan uw winkelwagen',label:'Naar winkelwagen'},quote:{title:'Toegevoegd aan uw offerte',label:'Naar offerte'},wishlist:{title:'Toegevoegd aan uw verlanglijst',label:'Naar verlanglijst'}}[destination];
    document.getElementById('confirmationTitle').textContent=config.title;document.getElementById('confirmationProduct').textContent=product?.name||'Uw product';const link=document.getElementById('openDestination');link.textContent=config.label;link.dataset.destination=destination;link.href=destination==='cart'?'#':destination==='quote'?'../offerte/':'../verlanglijst/';dialog.showModal();
  }
  function addToCart(id){const item=cart.find(entry=>entry.productId===id);if(item)item.quantity+=1;else cart.push({productId:id,quantity:1});saveCart();showConfirmation(products.find(product=>product.id===id),'cart')}
  function removeFromCart(id){cart=cart.filter(item=>item.productId!==id);saveCart()}
  function changeQuantity(id,delta){const item=cart.find(entry=>entry.productId===id);if(!item)return;item.quantity=Math.max(0,item.quantity+delta);if(!item.quantity)return removeFromCart(id);saveCart()}
  function saveCart(){localStorage.setItem('fitconnect-cart',JSON.stringify(cart));renderCart()}
  function renderCart(){
    const count=document.getElementById('cartCount');
    const itemCount=cart.reduce((sum,item)=>sum+item.quantity,0);
    if(count)count.textContent=itemCount;
    if(!cartItems)return;
    const known=cart.map(item=>({item,product:products.find(product=>product.id===item.productId)})).filter(entry=>entry.product);
    const total=known.reduce((sum,{item,product})=>sum+(priceFor(product)*item.quantity),0);
    cartItems.innerHTML=known.length?known.map(({item,product})=>`<div class="cart-item"><div><h4>${escapeHtml(product.name)}</h4><span>${escapeHtml(product.category)} · ${escapeHtml(priceLabel(product))}</span><div class="quantity-control"><button data-quantity="-1" data-id="${escapeHtml(product.id)}" aria-label="Eén minder" type="button">−</button><strong>${item.quantity}</strong><button data-quantity="1" data-id="${escapeHtml(product.id)}" aria-label="Eén meer" type="button">+</button></div></div><button class="remove-button" data-remove="${escapeHtml(product.id)}" type="button">Verwijder</button></div>`).join('')+`<div class="cart-total"><span>Totaal ${isBusiness()?'excl.':'incl.'} btw</span><strong>${escapeHtml(euro(total))}</strong></div>`:'<div class="empty-state">Uw winkelmand is nog leeg.</div>';
    document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeFromCart(button.dataset.remove)));
    document.querySelectorAll('[data-quantity]').forEach(button=>button.addEventListener('click',()=>changeQuantity(button.dataset.id,Number(button.dataset.quantity))));
  }
  function openCart(){cartPanel?.classList.add('open');backdrop?.classList.add('open');cartPanel?.setAttribute('aria-hidden','false')}
  function closeCart(){cartPanel?.classList.remove('open');backdrop?.classList.remove('open');cartPanel?.setAttribute('aria-hidden','true')}

  document.getElementById('cartButton')?.addEventListener('click',openCart);
  document.getElementById('closeCart')?.addEventListener('click',closeCart);
  backdrop?.addEventListener('click',closeCart);
  document.getElementById('closeConfirmation')?.addEventListener('click',()=>document.getElementById('addConfirmation').close());
  document.getElementById('continueShopping')?.addEventListener('click',()=>document.getElementById('addConfirmation').close());
  document.getElementById('openDestination')?.addEventListener('click',event=>{if(event.currentTarget.dataset.destination!=='cart')return;event.preventDefault();document.getElementById('addConfirmation').close();openCart()});
  searchInput?.addEventListener('input',renderProducts);
  brandFilter?.addEventListener('change',()=>{document.querySelectorAll('[data-shop-brand]').forEach(node=>node.classList.toggle('active',node.dataset.shopBrand===brandFilter.value));renderProducts()});
  shopSort?.addEventListener('change',renderProducts);
  categoryFilter?.addEventListener('change',()=>{activeSubcategory='';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.remove('active'));renderProducts()});
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.category;if(categoryFilter)categoryFilter.value=category;activeSubcategory='';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.remove('active'));const panel=document.getElementById('strengthSubcategories');if(panel){panel.hidden=category!=='Kracht';if(category==='Kracht')panel.scrollIntoView({behavior:'smooth',block:'nearest'})}renderProducts();if(category!=='Kracht')document.getElementById('producten')?.scrollIntoView()}));
  document.querySelectorAll('[data-subcategory]').forEach(button=>button.addEventListener('click',()=>{activeSubcategory=button.dataset.subcategory||'';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.toggle('active',node===button&&Boolean(activeSubcategory)));if(categoryFilter)categoryFilter.value='Kracht';renderProducts();document.getElementById('producten')?.scrollIntoView({behavior:'smooth'})}));
  document.getElementById('checkoutButton')?.addEventListener('click',()=>{
    if(!cart.length)return;
    location.href='checkout/';
  });
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  loadProducts();
})();
