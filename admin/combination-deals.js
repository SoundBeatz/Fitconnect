(()=>{'use strict';
const client=window.getFitConnectSupabase?.(),$=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])),money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
if(!client||!$('#combination-deals'))return;
let bundles=[],products=[],organizationId=null,currentItems=[];
const slugify=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const localDate=value=>value?new Date(value).toISOString().slice(0,16):'';
const toast=text=>{const node=$('#toast');if(!node)return;node.textContent=text;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3000)};
function bundleTotal(bundle){return (bundle.commerce_bundle_items||[]).reduce((sum,item)=>sum+Number(item.products?.price||0)*Number(item.quantity||0),0)}
function saving(bundle){const regular=bundleTotal(bundle),price=Number(bundle.bundle_price||0);return{regular,amount:Math.max(0,regular-price),percent:regular>0?Math.max(0,(regular-price)/regular*100):0}}
async function load(){
  $('#bundleRows').innerHTML='<tr><td colspan="7">Combinatiedeals laden…</td></tr>';
  const [org,bundleResult,productResult]=await Promise.all([
    client.rpc('commerce_current_organization'),
    client.from('commerce_bundles').select('*,commerce_bundle_items(id,product_id,quantity,position,required,products(id,name,brand,model,price,vat,stock,status))').order('featured',{ascending:false}).order('display_order').order('created_at',{ascending:false}),
    client.from('products').select('id,name,brand,model,price,vat,stock,status').eq('status','active').order('brand').order('name')
  ]);
  if(org.error)throw org.error;if(bundleResult.error)throw bundleResult.error;if(productResult.error)throw productResult.error;
  organizationId=org.data;bundles=bundleResult.data||[];products=productResult.data||[];render();
}
function render(){
  const q=$('#bundleSearch').value.trim().toLowerCase(),status=$('#bundleStatusFilter').value,rows=bundles.filter(bundle=>(status==='all'||bundle.status===status)&&`${bundle.name} ${bundle.slug}`.toLowerCase().includes(q));
  $('#bundleRows').innerHTML=rows.map(bundle=>{const save=saving(bundle),count=(bundle.commerce_bundle_items||[]).reduce((sum,item)=>sum+Number(item.quantity),0);return`<tr><td><strong>${esc(bundle.name)}</strong><br><small>${esc(bundle.slug)}</small></td><td>${count}</td><td>${money(save.regular)}</td><td>${money(bundle.bundle_price)}</td><td class="bundle-saving">${money(save.amount)} · ${save.percent.toFixed(1)}%</td><td><span class="status ${esc(bundle.status)}">${bundle.status==='active'?'Actief':bundle.status==='draft'?'Concept':'Gearchiveerd'}</span></td><td><button type="button" data-edit-bundle="${bundle.id}">Bewerken</button></td></tr>`}).join('')||'<tr><td colspan="7">Nog geen combinatiedeals gevonden.</td></tr>';
  const now=Date.now(),active=bundles.filter(bundle=>bundle.status==='active'&&(!bundle.starts_at||new Date(bundle.starts_at)<=now)&&(!bundle.ends_at||new Date(bundle.ends_at)>now)),scheduled=bundles.filter(bundle=>bundle.status==='active'&&bundle.starts_at&&new Date(bundle.starts_at)>now),average=active.length?active.reduce((sum,bundle)=>sum+saving(bundle).percent,0)/active.length:0;
  $('#activeBundleCount').textContent=active.length;$('#scheduledBundleCount').textContent=scheduled.length;$('#averageBundleSaving').textContent=`${average.toFixed(1)}%`;
  document.querySelectorAll('[data-edit-bundle]').forEach(button=>button.addEventListener('click',()=>edit(button.dataset.editBundle)));
}
function productPicker(selected=[]){
  const selection=new Map(selected.map(item=>[item.product_id,Number(item.quantity)]));
  $('#bundleProductPicker').innerHTML=products.map(product=>`<label class="bundle-product-option"><input type="checkbox" data-bundle-product="${product.id}" ${selection.has(product.id)?'checked':''}><span><strong>${esc(product.brand)} · ${esc(product.name)}</strong><small>${money(product.price)} incl. btw · ${Number(product.stock||0)} op voorraad</small></span><input type="number" min="1" max="99" value="${selection.get(product.id)||1}" data-bundle-quantity="${product.id}" aria-label="Aantal ${esc(product.name)}"></label>`).join('');
  $('#bundleProductPicker').querySelectorAll('input').forEach(input=>input.addEventListener('input',updatePreview));updatePreview();
}
function selectedItems(){return [...document.querySelectorAll('[data-bundle-product]:checked')].map((input,index)=>({product_id:input.dataset.bundleProduct,quantity:Number($(`[data-bundle-quantity="${input.dataset.bundleProduct}"]`).value||1),position:index,required:true}))}
function updatePreview(){const items=selectedItems(),regular=items.reduce((sum,item)=>sum+Number(products.find(product=>product.id===item.product_id)?.price||0)*item.quantity,0),price=Number($('#bundleForm').elements.bundlePrice.value||0),amount=Math.max(0,regular-price),percent=regular?amount/regular*100:0;$('#bundlePricePreview').innerHTML=`<span>Normale totaalprijs</span><strong>${money(regular)}</strong><em>Voordeel ${money(amount)} · ${percent.toFixed(1)}%</em>`}
function openEditor(){$('#bundleEditor').setAttribute('aria-hidden','false');$('.bundle-workspace').classList.add('editor-open')}
function closeEditor(){$('#bundleEditor').setAttribute('aria-hidden','true');$('.bundle-workspace').classList.remove('editor-open')}
function clear(){
  const form=$('#bundleForm');form.reset();form.elements.id.value='';form.elements.status.value='draft';currentItems=[];$('#bundleEditorTitle').textContent='Nieuwe combinatiedeal';$('#archiveBundle').hidden=true;productPicker();openEditor();
}
function edit(id){
  const bundle=bundles.find(item=>item.id===id);if(!bundle)return;const form=$('#bundleForm');
  Object.entries({id:bundle.id,name:bundle.name,slug:bundle.slug,shortDescription:bundle.short_description||'',description:bundle.description||'',imageUrl:bundle.image_url||'',bundlePrice:bundle.bundle_price,status:bundle.status,startsAt:localDate(bundle.starts_at),endsAt:localDate(bundle.ends_at)}).forEach(([name,value])=>form.elements[name].value=value);
  form.elements.featured.checked=Boolean(bundle.featured);form.elements.allowDiscountCodes.checked=Boolean(bundle.allow_discount_codes);currentItems=bundle.commerce_bundle_items||[];productPicker(currentItems);$('#bundleEditorTitle').textContent=bundle.name;$('#archiveBundle').hidden=false;openEditor();
}
$('#bundleForm').elements.name.addEventListener('input',event=>{const form=$('#bundleForm');if(!form.elements.id.value||!form.elements.slug.value)form.elements.slug.value=slugify(event.target.value)});
$('#bundleForm').elements.bundlePrice.addEventListener('input',updatePreview);
$('#bundleForm').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,fd=new FormData(form),items=selectedItems();
  if(!organizationId)return toast('Geen organisatie gevonden voor dit account.');
  if(items.length<2)return toast('Selecteer minimaal twee verschillende producten.');
  const regular=items.reduce((sum,item)=>sum+Number(products.find(product=>product.id===item.product_id)?.price||0)*item.quantity,0),price=Number(fd.get('bundlePrice'));
  if(price>=regular)return toast('De pakketprijs moet lager zijn dan de normale totaalprijs.');
  const payload={organization_id:organizationId,name:fd.get('name').trim(),slug:slugify(fd.get('slug')),short_description:fd.get('shortDescription').trim(),description:fd.get('description').trim(),image_url:fd.get('imageUrl').trim()||null,bundle_price:price,status:fd.get('status'),starts_at:fd.get('startsAt')?new Date(fd.get('startsAt')).toISOString():null,ends_at:fd.get('endsAt')?new Date(fd.get('endsAt')).toISOString():null,featured:fd.get('featured')==='on',allow_discount_codes:fd.get('allowDiscountCodes')==='on',updated_at:new Date().toISOString()};
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
