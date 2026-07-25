(()=>{'use strict';
const client=window.getFitConnectSupabase?.(),$=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])),money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
if(!client||!$('#combination-deals'))return;
let bundles=[],products=[],organizationId=null,currentItems=[],currentMedia=[],productPage=1;
const selectedProducts=new Map(),productsPerPage=30;
const mediaBucket='product-media';
const slugify=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const localDate=value=>value?new Date(value).toISOString().slice(0,16):'';
const toast=text=>{const node=$('#toast');if(!node)return;node.textContent=text;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3000)};
const parseDecimal=value=>{const normalized=String(value??'').trim().replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');return normalized===''?0:Number(normalized)};
const formatDecimal=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value).toFixed(2).replace('.',','):'';
const isVideoFile=url=>/\.(mp4|webm|mov)(?:[?#]|$)/i.test(String(url||''));
const safeName=name=>String(name||'bestand').toLowerCase().replace(/[^a-z0-9.]+/g,'-').replace(/-+/g,'-');
function bundleTotal(bundle){return (bundle.commerce_bundle_items||[]).reduce((sum,item)=>sum+Number(item.products?.price||0)*Number(item.quantity||0),0)}
function saving(bundle){const regular=bundleTotal(bundle),price=Number(bundle.bundle_price||0);return{regular,amount:Math.max(0,regular-price),percent:regular>0?Math.max(0,(regular-price)/regular*100):0}}
async function load(){
  $('#bundleRows').innerHTML='<tr><td colspan="7">Combinatiedeals laden…</td></tr>';
  const [org,bundleResult,productResult]=await Promise.all([
    client.rpc('commerce_current_organization'),
    client.from('commerce_bundles').select('*,commerce_bundle_items(id,product_id,quantity,position,required,products(id,name,brand,model,price,vat,stock,status))').order('featured',{ascending:false}).order('display_order').order('created_at',{ascending:false}),
    client.from('products').select('id,name,brand,model,category,subcategory,sku,price,vat,stock,status').eq('status','active').order('brand').order('name')
  ]);
  if(org.error)throw org.error;if(bundleResult.error)throw bundleResult.error;if(productResult.error)throw productResult.error;
  organizationId=org.data||window.FitConnectBusiness?.getContext?.().organizationId||null;bundles=bundleResult.data||[];products=productResult.data||[];renderProductFilters();render();
}
function render(){
  const q=$('#bundleSearch').value.trim().toLowerCase(),status=$('#bundleStatusFilter').value,rows=bundles.filter(bundle=>(status==='all'||bundle.status===status)&&`${bundle.name} ${bundle.slug}`.toLowerCase().includes(q));
  $('#bundleRows').innerHTML=rows.map(bundle=>{const save=saving(bundle),count=(bundle.commerce_bundle_items||[]).reduce((sum,item)=>sum+Number(item.quantity),0);return`<tr><td><strong>${esc(bundle.name)}</strong><br><small>${esc(bundle.slug)}</small></td><td>${count}</td><td>${money(save.regular)}</td><td>${money(bundle.bundle_price)}</td><td class="bundle-saving">${money(save.amount)} · ${save.percent.toFixed(1)}%</td><td><span class="status ${esc(bundle.status)}">${bundle.status==='active'?'Actief':bundle.status==='draft'?'Concept':'Gearchiveerd'}</span></td><td><button type="button" data-edit-bundle="${bundle.id}">Bewerken</button></td></tr>`}).join('')||'<tr><td colspan="7">Nog geen combinatiedeals gevonden.</td></tr>';
  const now=Date.now(),active=bundles.filter(bundle=>bundle.status==='active'&&(!bundle.starts_at||new Date(bundle.starts_at)<=now)&&(!bundle.ends_at||new Date(bundle.ends_at)>now)),scheduled=bundles.filter(bundle=>bundle.status==='active'&&bundle.starts_at&&new Date(bundle.starts_at)>now),average=active.length?active.reduce((sum,bundle)=>sum+saving(bundle).percent,0)/active.length:0;
  $('#activeBundleCount').textContent=active.length;$('#scheduledBundleCount').textContent=scheduled.length;$('#averageBundleSaving').textContent=`${average.toFixed(1)}%`;
  document.querySelectorAll('[data-edit-bundle]').forEach(button=>button.addEventListener('click',()=>edit(button.dataset.editBundle)));
}
function renderProductFilters(){
  const category=$('#bundleProductCategory'),current=category?.value||'all';
  if(!category)return;
  const values=[...new Set(products.map(product=>product.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nl'));
  category.innerHTML='<option value="all">Alle categorieën</option>'+values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  category.value=values.includes(current)?current:'all';
}
function rememberVisibleSelection(){
  document.querySelectorAll('[data-bundle-product]').forEach(input=>{
    const id=input.dataset.bundleProduct,quantity=Math.max(1,Number($(`[data-bundle-quantity="${id}"]`)?.value||selectedProducts.get(id)||1));
    if(input.checked)selectedProducts.set(id,quantity);else selectedProducts.delete(id);
  });
}
function filteredProducts(){
  const query=$('#bundleProductSearch')?.value.trim().toLowerCase()||'',category=$('#bundleProductCategory')?.value||'all';
  return products.filter(product=>(category==='all'||product.category===category)&&`${product.name} ${product.brand} ${product.model||''} ${product.sku||''} ${product.category||''} ${product.subcategory||''}`.toLowerCase().includes(query));
}
function productPicker(selected){
  if(selected){selectedProducts.clear();selected.forEach(item=>selectedProducts.set(item.product_id,Number(item.quantity)||1))}
  const matches=filteredProducts(),pages=Math.max(1,Math.ceil(matches.length/productsPerPage));productPage=Math.min(productPage,pages);
  const shown=matches.slice((productPage-1)*productsPerPage,productPage*productsPerPage),picker=$('#bundleProductPicker');
  picker.innerHTML=shown.map(product=>`<label class="bundle-product-option"><input type="checkbox" data-bundle-product="${product.id}" ${selectedProducts.has(product.id)?'checked':''}><span><strong>${esc(product.brand)} · ${esc(product.name)}</strong><small>${esc(product.category||'Geen categorie')} · ${money(product.price)} incl. btw · ${Number(product.stock||0)} op voorraad</small></span><input type="number" min="1" max="99" value="${selectedProducts.get(product.id)||1}" data-bundle-quantity="${product.id}" aria-label="Aantal ${esc(product.name)}"></label>`).join('')||'<p class="bundle-product-empty">Geen producten gevonden met deze filters.</p>';
  $('#bundleProductResultCount').textContent=`${matches.length} producten`;
  $('#bundleProductPage').textContent=`Pagina ${productPage} van ${pages}`;
  $('#bundleProductPrev').disabled=productPage<=1;$('#bundleProductNext').disabled=productPage>=pages;
  picker.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{rememberVisibleSelection();renderSelectedProducts();updatePreview()}));
  renderSelectedProducts();updatePreview();
}
function selectedItems(){return [...selectedProducts].map(([product_id,quantity],position)=>({product_id,quantity:Number(quantity)||1,position,required:true}))}
function renderSelectedProducts(){
  const items=selectedItems(),target=$('#bundleSelectedProducts');
  target.innerHTML=items.length?items.map(item=>{const product=products.find(entry=>entry.id===item.product_id);return product?`<article><div><strong>${esc(product.brand)} · ${esc(product.name)}</strong><small>${item.quantity} × ${money(product.price)}</small></div><button type="button" data-remove-selected="${product.id}" aria-label="${esc(product.name)} verwijderen">×</button></article>`:''}).join(''):'<p>Nog geen producten geselecteerd.</p>';
  target.querySelectorAll('[data-remove-selected]').forEach(button=>button.addEventListener('click',()=>{selectedProducts.delete(button.dataset.removeSelected);productPicker()}));
  $('#bundleSelectedCount').textContent=`${items.length} geselecteerd`;
}
function regularTotal(){return selectedItems().reduce((sum,item)=>sum+Number(products.find(product=>product.id===item.product_id)?.price||0)*item.quantity,0)}
function pricingMethod(){return $('#bundleForm').elements.pricingMethod.value}
function setPricingMethod(method){
  const form=$('#bundleForm');
  form.elements.pricingMethod.value=method;
  document.querySelectorAll('[data-pricing-field]').forEach(label=>{
    const active=label.dataset.pricingField===method,input=label.querySelector('input');
    label.classList.toggle('active',active);input.readOnly=!active;
  });
}
function updatePreview(event){
  const form=$('#bundleForm'),regular=regularTotal(),method=pricingMethod();
  let price=parseDecimal(form.elements.bundlePrice.value),amount=parseDecimal(form.elements.discountAmount.value),percent=parseDecimal(form.elements.discountPercent.value);
  if(method==='amount')price=Math.max(0,regular-amount);
  if(method==='percent')price=Math.max(0,regular*(1-percent/100));
  amount=Math.max(0,regular-price);percent=regular?amount/regular*100:0;
  form.elements.bundlePrice.value=event?.target===form.elements.bundlePrice?form.elements.bundlePrice.value:formatDecimal(price);
  form.elements.discountAmount.value=event?.target===form.elements.discountAmount?form.elements.discountAmount.value:formatDecimal(amount);
  form.elements.discountPercent.value=event?.target===form.elements.discountPercent?form.elements.discountPercent.value:formatDecimal(percent);
  $('#bundlePricePreview').innerHTML=`<span>Normale totaalprijs</span><strong>${money(regular)}</strong><em>Pakketprijs ${money(price)} · Voordeel ${money(amount)} · ${percent.toFixed(2)}%</em>`;
}
function renderMedia(){
  const grid=$('#bundleMediaGrid');
  grid.innerHTML=currentMedia.length?currentMedia.map((url,index)=>`<article class="bundle-media-item"><div class="bundle-media-preview">${isVideoFile(url)?`<video src="${esc(url)}" controls preload="metadata"></video>`:`<img src="${esc(url)}" alt="Dealafbeelding ${index+1}">`}</div><footer><span>${isVideoFile(url)?'Video':'Foto'} ${index+1}</span><button type="button" data-remove-bundle-media="${index}">Verwijder</button></footer></article>`).join(''):'<p>Nog geen extra media toegevoegd.</p>';
  grid.querySelectorAll('[data-remove-bundle-media]').forEach(button=>button.addEventListener('click',()=>removeMedia(Number(button.dataset.removeBundleMedia))));
}
function storagePathFromUrl(url){const marker=`/storage/v1/object/public/${mediaBucket}/`,position=String(url).indexOf(marker);return position>=0?decodeURIComponent(String(url).slice(position+marker.length)):null}
async function removeMedia(index){
  const url=currentMedia[index];if(!url)return;
  try{const path=storagePathFromUrl(url);if(path){const result=await client.storage.from(mediaBucket).remove([path]);if(result.error)throw result.error}currentMedia.splice(index,1);renderMedia();toast('Media verwijderd. Sla de deal nog op.')}catch(error){toast(error.message||'Media verwijderen mislukt.')}
}
async function uploadMedia(files){
  const selected=[...files].filter(file=>file.type.startsWith('image/')||file.type.startsWith('video/'));if(!selected.length)return;
  const slug=$('#bundleForm').elements.slug.value.trim();if(!slug)return toast('Vul eerst de naam of slug van de deal in.');
  const status=$('#bundleUploadStatus');status.hidden=false;
  try{
    for(let index=0;index<selected.length;index++){
      const file=selected[index],limit=file.type.startsWith('video/')?100*1024*1024:10*1024*1024;
      if(file.size>limit)throw new Error(`${file.name} is groter dan ${file.type.startsWith('video/')?'100':'10'} MB.`);
      status.textContent=`Uploaden ${index+1} van ${selected.length}: ${file.name}`;
      const path=`combination-deals/${slug}/${Date.now()}-${index}-${safeName(file.name)}`;
      const result=await client.storage.from(mediaBucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(result.error)throw result.error;
      currentMedia.push(client.storage.from(mediaBucket).getPublicUrl(path).data.publicUrl);
    }
    renderMedia();toast('Media geüpload. Klik nu op Deal opslaan.');
  }catch(error){toast(error.message||'Uploaden mislukt.')}finally{status.hidden=true;$('#bundleMediaInput').value=''}
}
function openEditor(){$('#bundleEditor').setAttribute('aria-hidden','false');$('.bundle-workspace').classList.add('editor-open')}
function closeEditor(){$('#bundleEditor').setAttribute('aria-hidden','true');$('.bundle-workspace').classList.remove('editor-open')}
function clear(){
  const form=$('#bundleForm');form.reset();form.elements.id.value='';form.elements.status.value='draft';setPricingMethod('price');currentItems=[];currentMedia=[];selectedProducts.clear();productPage=1;renderMedia();$('#bundleEditorTitle').textContent='Nieuwe combinatiedeal';$('#archiveBundle').hidden=true;productPicker([]);openEditor();
}
function edit(id){
  const bundle=bundles.find(item=>item.id===id);if(!bundle)return;const form=$('#bundleForm');
  Object.entries({id:bundle.id,name:bundle.name,slug:bundle.slug,shortDescription:bundle.short_description||'',description:bundle.description||'',imageUrl:bundle.image_url||'',videoUrl:bundle.video_url||'',bundlePrice:formatDecimal(bundle.bundle_price),status:bundle.status,startsAt:localDate(bundle.starts_at),endsAt:localDate(bundle.ends_at)}).forEach(([name,value])=>form.elements[name].value=value);
  form.elements.featured.checked=Boolean(bundle.featured);form.elements.allowDiscountCodes.checked=Boolean(bundle.allow_discount_codes);setPricingMethod('price');currentItems=bundle.commerce_bundle_items||[];currentMedia=Array.isArray(bundle.media_urls)?[...bundle.media_urls]:[];renderMedia();productPicker(currentItems);$('#bundleEditorTitle').textContent=bundle.name;$('#archiveBundle').hidden=false;openEditor();
}
$('#bundleForm').elements.name.addEventListener('input',event=>{const form=$('#bundleForm');if(!form.elements.id.value||!form.elements.slug.value)form.elements.slug.value=slugify(event.target.value)});
$('#bundleForm').elements.bundlePrice.addEventListener('input',updatePreview);
$('#bundleForm').elements.discountAmount.addEventListener('input',updatePreview);
$('#bundleForm').elements.discountPercent.addEventListener('input',updatePreview);
document.querySelectorAll('[name="pricingMethod"]').forEach(input=>input.addEventListener('change',event=>{setPricingMethod(event.target.value);updatePreview()}));
['bundlePrice','discountAmount','discountPercent'].forEach(name=>$('#bundleForm').elements[name].addEventListener('blur',event=>{event.target.value=formatDecimal(parseDecimal(event.target.value));updatePreview()}));
$('#bundleMediaInput').addEventListener('change',event=>uploadMedia(event.target.files));
$('#bundleProductSearch').addEventListener('input',()=>{rememberVisibleSelection();productPage=1;productPicker()});
$('#bundleProductCategory').addEventListener('change',()=>{rememberVisibleSelection();productPage=1;productPicker()});
$('#bundleProductPrev').addEventListener('click',()=>{rememberVisibleSelection();productPage=Math.max(1,productPage-1);productPicker()});
$('#bundleProductNext').addEventListener('click',()=>{rememberVisibleSelection();productPage+=1;productPicker()});
const dropzone=$('#bundleMediaDropzone');['dragenter','dragover'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.add('is-dragging')}));['dragleave','drop'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.remove('is-dragging')}));dropzone.addEventListener('drop',event=>uploadMedia(event.dataTransfer.files));
$('#bundleForm').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,fd=new FormData(form),items=selectedItems();
  if(!organizationId){const refreshed=await client.rpc('commerce_current_organization');organizationId=refreshed.data||window.FitConnectBusiness?.getContext?.().organizationId||null}
  if(!organizationId)return toast('Geen organisatiecontext beschikbaar. Vernieuw de pagina en probeer opnieuw.');
  if(items.length<2)return toast('Selecteer minimaal twee verschillende producten.');
  const regular=items.reduce((sum,item)=>sum+Number(products.find(product=>product.id===item.product_id)?.price||0)*item.quantity,0),price=parseDecimal(fd.get('bundlePrice'));
  if(!Number.isFinite(price)||price<=0)return toast('Voer een geldige pakketprijs of korting in.');
  if(price>=regular)return toast('De korting moet groter zijn dan nul en lager dan de normale totaalprijs.');
  const payload={organization_id:organizationId,name:fd.get('name').trim(),slug:slugify(fd.get('slug')),short_description:fd.get('shortDescription').trim(),description:fd.get('description').trim(),image_url:fd.get('imageUrl').trim()||null,media_urls:currentMedia,video_url:fd.get('videoUrl').trim()||null,bundle_price:price,status:fd.get('status'),starts_at:fd.get('startsAt')?new Date(fd.get('startsAt')).toISOString():null,ends_at:fd.get('endsAt')?new Date(fd.get('endsAt')).toISOString():null,featured:fd.get('featured')==='on',allow_discount_codes:fd.get('allowDiscountCodes')==='on',updated_at:new Date().toISOString()};
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try{
    const id=fd.get('id');let bundleId=id;
    if(id){const result=await client.from('commerce_bundles').update(payload).eq('id',id).select('id').single();if(result.error)throw result.error;const removed=await client.from('commerce_bundle_items').delete().eq('bundle_id',id);if(removed.error)throw removed.error}
    else{const result=await client.from('commerce_bundles').insert(payload).select('id').single();if(result.error)throw result.error;bundleId=result.data.id}
    const lines=await client.from('commerce_bundle_items').insert(items.map(item=>({...item,bundle_id:bundleId,organization_id:organizationId})));if(lines.error)throw lines.error;
    await load();edit(bundleId);toast('Combinatiedeal opgeslagen.');
  }catch(error){console.error(error);toast(error.message||'Combinatiedeal opslaan mislukt.')}finally{submit.disabled=false}
});
$('#archiveBundle').addEventListener('click',async()=>{const id=$('#bundleForm').elements.id.value;if(!id)return;const result=await client.from('commerce_bundles').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',id);if(result.error)return toast(result.error.message);await load();closeEditor();toast('Combinatiedeal gearchiveerd.')});
$('#newBundle').addEventListener('click',clear);$('#closeBundleEditor').addEventListener('click',closeEditor);$('#refreshBundles').addEventListener('click',()=>load().catch(error=>toast(error.message)));$('#bundleSearch').addEventListener('input',render);$('#bundleStatusFilter').addEventListener('change',render);
document.querySelector('[data-view="combination-deals"]')?.addEventListener('click',()=>load().catch(error=>{$('#bundleRows').innerHTML=`<tr><td colspan="7">${esc(error.message)}</td></tr>`}));
})();
