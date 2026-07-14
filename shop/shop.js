(()=>{
  const SUPABASE_URL='https://lwpiqshyqzsgwejvmbyo.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4uU82UPeAcOGFtyvx5NxA_6e3A_RBj';
  const grid=document.getElementById('productGrid');
  const searchInput=document.getElementById('searchInput');
  const categoryFilter=document.getElementById('categoryFilter');
  const cartPanel=document.getElementById('cartPanel');
  const backdrop=document.getElementById('backdrop');
  const cartItems=document.getElementById('cartItems');
  let products=[];
  let cart=JSON.parse(localStorage.getItem('fitconnect-cart')||'[]');

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const validImage=product=>{
    const first=Array.isArray(product.images)?product.images[0]:null;
    return typeof first==='string'&&(first.startsWith('https://')||first.startsWith('http://')||first.startsWith('/'))?first:null;
  };
  const stockText=product=>Number(product.stock)>0?`${product.stock} op voorraad`:'Op aanvraag';

  async function loadProducts(){
    grid.innerHTML='<div class="empty-state">Producten laden…</div>';
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,slug,brand,model,name,category,price,stock,delivery,warranty,short_description,images,featured&status=eq.active&order=featured.desc,created_at.desc`,{
        headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}
      });
      if(!response.ok)throw new Error(`Product API ${response.status}`);
      products=await response.json();
      renderProducts();
      renderCart();
    }catch(error){
      console.error('FitConnect shop kon producten niet laden',error);
      grid.innerHTML='<div class="empty-state">De producten konden niet worden geladen. Probeer de pagina opnieuw te openen.</div>';
    }
  }

  function renderProducts(){
    const q=(searchInput?.value||'').trim().toLowerCase();
    const category=categoryFilter?.value||'Alle';
    const visible=products.filter(product=>(category==='Alle'||product.category===category)&&`${product.name} ${product.brand} ${product.model||''} ${product.category} ${product.short_description||''}`.toLowerCase().includes(q));
    grid.innerHTML=visible.length?visible.map(product=>{
      const image=validImage(product);
      const visualStyle=image?` style="background-image:linear-gradient(rgba(10,11,13,.08),rgba(10,11,13,.28)),url('${escapeHtml(image)}')"`:'';
      return `<article class="product-card ${product.featured?'featured-product':''}">
        <a class="product-visual ${image?'has-image':''}" href="product/?slug=${encodeURIComponent(product.slug)}" aria-label="Bekijk ${escapeHtml(product.name)}"${visualStyle}>
          <span>${escapeHtml((product.category||'Product').toUpperCase())}</span>
          ${product.featured?'<b class="featured-badge">FitConnect keuze</b>':''}
          ${!image?`<div class="product-placeholder"><small>${escapeHtml(product.brand)}</small><strong>${escapeHtml(product.model||product.name)}</strong></div>`:''}
        </a>
        <div class="product-copy">
          <p class="product-brand">${escapeHtml(product.brand)}${product.model?` · ${escapeHtml(product.model)}`:''}</p>
          <h3><a href="product/?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a></h3>
          <p>${escapeHtml(product.short_description||'Professioneel geselecteerd en geleverd met persoonlijk FitConnect-advies.')}</p>
          <div class="product-facts"><span>${escapeHtml(stockText(product))}</span><span>${escapeHtml(product.delivery||'Levertijd op aanvraag')}</span></div>
          <a class="detail-link" href="product/?slug=${encodeURIComponent(product.slug)}">Bekijk details en specificaties →</a>
          <div class="product-meta"><strong>${euro(product.price)}</strong><button class="add-button" data-id="${escapeHtml(product.id)}" type="button">Toevoegen</button></div>
        </div>
      </article>`;
    }).join(''):'<div class="empty-state">Geen producten gevonden. Probeer een andere zoekterm of categorie.</div>';
    document.querySelectorAll('.add-button').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.id)));
  }

  function addToCart(id){if(!cart.includes(id))cart.push(id);saveCart();openCart()}
  function removeFromCart(id){cart=cart.filter(item=>item!==id);saveCart()}
  function saveCart(){localStorage.setItem('fitconnect-cart',JSON.stringify(cart));renderCart()}
  function renderCart(){
    const count=document.getElementById('cartCount');
    if(count)count.textContent=cart.length;
    if(!cartItems)return;
    const known=cart.map(id=>products.find(product=>product.id===id)).filter(Boolean);
    cartItems.innerHTML=known.length?known.map(product=>`<div class="cart-item"><div><h4>${escapeHtml(product.name)}</h4><span>${escapeHtml(product.category)} · ${euro(product.price)}</span></div><button class="remove-button" data-remove="${escapeHtml(product.id)}" type="button">Verwijder</button></div>`).join(''):'<div class="empty-state">Uw winkelmand is nog leeg.</div>';
    document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeFromCart(button.dataset.remove)));
  }
  function openCart(){cartPanel?.classList.add('open');backdrop?.classList.add('open');cartPanel?.setAttribute('aria-hidden','false')}
  function closeCart(){cartPanel?.classList.remove('open');backdrop?.classList.remove('open');cartPanel?.setAttribute('aria-hidden','true')}

  document.getElementById('cartButton')?.addEventListener('click',openCart);
  document.getElementById('closeCart')?.addEventListener('click',closeCart);
  backdrop?.addEventListener('click',closeCart);
  searchInput?.addEventListener('input',renderProducts);
  categoryFilter?.addEventListener('change',renderProducts);
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{if(categoryFilter)categoryFilter.value=button.dataset.category;renderProducts();document.getElementById('producten')?.scrollIntoView()}));
  document.getElementById('checkoutButton')?.addEventListener('click',()=>{
    const selected=cart.map(id=>products.find(product=>product.id===id)).filter(Boolean);
    if(!selected.length)return;
    const list=selected.map(product=>product.name).join('\n- ');
    const body=encodeURIComponent(`Hallo FitConnect,\n\nIk ontvang graag prijs en advies voor:\n- ${list}\n\nNaam:\nTelefoon:\nPostcode:\nAanvullende wensen:`);
    location.href=`mailto:info@fitconnect.nl?subject=Aanvraag%20FitConnect%20Shop&body=${body}`;
  });
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  loadProducts();
})();