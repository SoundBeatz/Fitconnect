from pathlib import Path

p=Path('admin/admin.js')
lines=p.read_text().splitlines()
out=[]
remove_prefixes=(
  'function bindProductControls()', 'bindProductControls();', 'async function loadProducts()',
  'function renderRecent()', 'function renderProducts()', 'function editProduct()',
  "$('#productForm').addEventListener('submit'", "$('#duplicateProduct').addEventListener('click'",
  "['productSearch','productBrandFilter','productCategoryFilter','productStatus','productSort']"
)
for line in lines:
  if line.startswith('let products=[],'): line=line.replace('let products=[],','let ')
  if line.startswith(remove_prefixes): continue
  if line.startswith('async function loadAll()'):
    line=line.replace("setConnection('Gegevens synchroniseren…');await loadProducts();", "setConnection('Gegevens synchroniseren…');")
    line=line.replace("'Producten geladen · enkele andere modules niet beschikbaar'", "'Gegevens geladen · enkele modules niet beschikbaar'")
  if line.startswith('function renderStats()'):
    line="function renderStats(){const setText=(selector,value)=>{const element=$(selector);if(element)element.textContent=value};setText('#customerTotal',customers.filter(c=>c.role==='customer').length);setText('#warrantyTotal',equipment.filter(e=>!e.warranty_until||new Date(e.warranty_until)>=new Date()).length);setText('#serviceTotal',serviceRequests.filter(s=>s.status!=='closed').length)}"
  if "function renderAll(){" in line:
    line=line.replace('function renderAll(){renderStats();renderRecent();syncBrandOptions();syncSupplierOptions();renderProducts();', 'function renderAll(){renderStats();syncBrandOptions();syncSupplierOptions();')
  if line.startswith("(async()=>{try{const session=await requireAdmin();if(!session)return;await loadAll()}"):
    line=line.replace(";$('#productRows').innerHTML='<tr><td colspan=\"7\">Producten konden niet worden geladen. Klik op Vernieuwen.</td></tr>'",'')
  out.append(line)
marker="$('#mediaInput').addEventListener('change',e=>uploadFiles(e.target.files));"
adapter="window.addEventListener('fitconnect:product-editor-opened',event=>{const product=event.detail?.product||{};currentImages=Array.isArray(product.images)?[...product.images]:[];renderMedia();updateSeoPreview()});"
if adapter not in out: out.insert(out.index(marker),adapter)
p.write_text('\n'.join(out)+'\n')

r=Path('admin/product-renderer.js')
s=r.read_text()
if 'function visibleProducts(products)' not in s:
  old="  function renderInitial(products){const body=document.getElementById('productRows');if(!body)return;body.innerHTML='';products.forEach(product=>body.appendChild(ProductCardFactory.createRow(product,openEditor)));const count=document.getElementById('productResultCount');if(count)count.textContent=`${products.length} ${products.length===1?'product':'producten'}`}"
  new="""  function visibleProducts(products){const q=(document.getElementById('productSearch')?.value||'').trim().toLowerCase(),status=document.getElementById('productStatus')?.value||'all',brand=document.getElementById('productBrandFilter')?.value||'all',category=document.getElementById('productCategoryFilter')?.value||'all',sort=document.getElementById('productSort')?.value||'newest';const rows=products.filter(product=>{const spec=product.specifications||{};return(status==='all'||product.status===status)&&(brand==='all'||product.brand===brand)&&(category==='all'||product.category===category)&&`${product.name} ${product.brand} ${product.model||''} ${product.category||''} ${spec.Subcategorie||''} ${spec.SKU||''} ${spec.EAN||''}`.toLowerCase().includes(q)});const collator=new Intl.Collator('nl',{sensitivity:'base'});return rows.sort((a,b)=>sort==='name-asc'?collator.compare(a.name,b.name):sort==='brand-asc'?collator.compare(a.brand,b.brand):sort==='price-asc'?Number(a.price)-Number(b.price):sort==='price-desc'?Number(b.price)-Number(a.price):sort==='stock-asc'?Number(a.stock)-Number(b.stock):new Date(b.createdAt||0)-new Date(a.createdAt||0))}
  function renderProductStats(products){const active=products.filter(product=>product.status==='active'),set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};set('productTotal',active.length);set('shopProductCount',active.length);set('shopStockCount',active.reduce((sum,product)=>sum+Number(product.stock||0),0));const recent=document.getElementById('recentProducts');if(recent)recent.innerHTML=products.slice(0,4).map(product=>`<div class=\"list-row\"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand)} · ${escapeHtml(product.model||'')}</small></div><span class=\"status ${escapeHtml(product.status)}\">${escapeHtml(product.status==='active'?'Actief':product.status==='archived'?'Gearchiveerd':'Concept')}</span></div>`).join('')||'<p>Nog geen producten.</p>'}
  function renderInitial(products){const body=document.getElementById('productRows');if(!body)return;const visible=visibleProducts(products);body.innerHTML='';visible.forEach(product=>body.appendChild(ProductCardFactory.createRow(product,openEditor)));const count=document.getElementById('productResultCount');if(count)count.textContent=`${visible.length} ${visible.length===1?'product':'producten'}`;renderProductStats(products)}"""
  if old not in s: raise SystemExit('renderInitial contract not found')
  s=s.replace(old,new)
anchor="    document.getElementById('refreshProducts')?.addEventListener('click',()=>productStore.loadProducts(),true);"
if "document.getElementById('duplicateProduct')?.addEventListener" not in s:
  addition="""    document.getElementById('refreshProducts')?.addEventListener('click',()=>productStore.loadProducts(),true);
    ['productSearch','productBrandFilter','productCategoryFilter','productStatus','productSort'].forEach(id=>{const node=document.getElementById(id);node?.addEventListener(id==='productSearch'?'input':'change',()=>renderInitial(productStore.getState().products))});
    document.getElementById('duplicateProduct')?.addEventListener('click',async()=>{const id=document.getElementById('productForm')?.elements.id?.value||'';const source=productStore.getSnapshot(id);if(!source)return;const copy={...source,id:null,name:`Kopie van ${source.name}`,slug:`${source.slug}-kopie-${Date.now()}`,status:'draft',createdAt:null,updatedAt:null};try{const saved=await productStore.updateProduct(null,copy);openEditor(saved.id);window.fitConnectToast?.('Product gedupliceerd')}catch(error){window.fitConnectToast?.(error.message||'Dupliceren mislukt')}});"""
  if anchor not in s: raise SystemExit('renderer controls anchor not found')
  s=s.replace(anchor,addition)
s=s.replace("window.FitConnectProductRenderer={init,openEditor,ProductCardFactory,ProductFormFactory};","window.FitConnectProductRenderer={init,openEditor,render:()=>renderInitial(store?.getState().products||[]),ProductCardFactory,ProductFormFactory};")
r.write_text(s)
