(()=>{
  'use strict';
  const client=window.getFitConnectSupabase?.();
  if(!client||!window.BrandRepository||!window.BrandService||!window.BrandStore)return;
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const repository=new window.BrandRepository(client);
  const service=new window.BrandService(repository);
  const store=new window.BrandStore(service);
  window.brandStore=store;

  function statusLabel(status){return status==='active'?'Actief':status==='archived'?'Gearchiveerd':'Concept'}
  function renderLegacy(brands){
    const grid=document.getElementById('brandAdminGrid');
    const search=document.getElementById('brandSearch');
    const statusFilter=document.getElementById('brandStatusFilter');
    const query=String(search?.value||'').toLowerCase();
    const status=statusFilter?.value||'all';
    const visible=brands.filter(brand=>(status==='all'||brand.status===status)&&`${brand.name} ${brand.description||''}`.toLowerCase().includes(query));
    if(grid){grid.innerHTML=visible.map(brand=>`<article class="brand-admin-card" data-brand-card="${escapeHtml(brand.id)}">${brand.logoUrl?`<img src="${escapeHtml(brand.logoUrl)}" alt="Logo ${escapeHtml(brand.name)}">`:`<div class="brand-logo-placeholder">${escapeHtml(brand.name.slice(0,2).toUpperCase())}</div>`}<div><span class="status ${escapeHtml(brand.status)}">${statusLabel(brand.status)}</span><h3>${escapeHtml(brand.name)}</h3><p>${escapeHtml(brand.description||'Nog geen merkomschrijving.')}</p><button type="button" data-fdmp-edit-brand="${escapeHtml(brand.id)}">Bewerken</button></div></article>`).join('')||'<p>Geen merken gevonden.</p>'}
    const names=brands.filter(brand=>brand.status==='active').map(brand=>brand.name).sort((a,b)=>a.localeCompare(b,'nl'));
    const productSelect=document.getElementById('productBrandSelect');
    const productFilter=document.getElementById('productBrandFilter');
    if(productSelect){const selected=productSelect.value;productSelect.innerHTML='<option value="">Kies een vooraf aangemaakt merk</option>'+names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');if(names.includes(selected))productSelect.value=selected}
    if(productFilter){const selected=productFilter.value;productFilter.innerHTML='<option value="all">Alle merken</option>'+names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');if(names.includes(selected))productFilter.value=selected}
    document.querySelectorAll('[data-fdmp-edit-brand]').forEach(button=>button.addEventListener('click',()=>fillForm(store.getSnapshot(button.dataset.fdmpEditBrand))));
  }

  function fillForm(brand){if(!brand)return;const form=document.getElementById('brandForm');if(!form)return;const values={id:brand.id,name:brand.name,slug:brand.slug,description:brand.description,website:brand.website,address:brand.address,postalCode:brand.postalCode,city:brand.city,country:brand.country,status:brand.status,displayOrder:brand.displayOrder,logoUrl:brand.logoUrl};Object.entries(values).forEach(([key,value])=>{if(form.elements[key])form.elements[key].value=value??''});if(form.elements.featured)form.elements.featured.checked=Boolean(brand.featured);const title=document.getElementById('brandEditorTitle');if(title)title.textContent=brand.name;const preview=document.getElementById('brandLogoPreview');if(preview)preview.innerHTML=brand.logoUrl?`<img src="${escapeHtml(brand.logoUrl)}" alt="Merklogo voorbeeld">`:'Logo uploaden';window.dispatchEvent(new CustomEvent('fitconnect:brand-editor-opened',{detail:{id:brand.id,brand,form}}))}

  function serialize(form){const data=new FormData(form);return{id:String(data.get('id')||''),name:String(data.get('name')||''),slug:String(data.get('slug')||''),description:String(data.get('description')||''),website:String(data.get('website')||''),address:String(data.get('address')||''),postalCode:String(data.get('postalCode')||''),city:String(data.get('city')||''),country:String(data.get('country')||''),status:String(data.get('status')||'draft'),displayOrder:Number(data.get('displayOrder')||100),featured:data.get('featured')==='on',logoUrl:String(data.get('logoUrl')||'')}}

  store.subscribeEvent('brands.loaded',event=>renderLegacy(event.brands));
  store.subscribeEvent('brand.saved',event=>{renderLegacy(event.state.brands);fillForm(event.entity);window.fitConnectToast?.('Merk opgeslagen en beschikbaar voor producten');window.dispatchEvent(new CustomEvent('fitconnect:brand-saved',{detail:{id:event.id,brand:event.entity}}))});
  store.subscribeEvent('brands.error',event=>{console.error(event.error);window.fitConnectToast?.(event.error?.message||'Merken laden mislukt')});
  store.subscribeEvent('brand.rollback',event=>{console.error(event.error);window.fitConnectToast?.(event.error?.message||'Merk opslaan mislukt');if(event.snapshot)fillForm(event.snapshot)});

  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('brandForm');
    form?.addEventListener('submit',async event=>{event.preventDefault();event.stopImmediatePropagation();const model=serialize(form);const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Opslaan…'}try{await store.updateBrand(model.id||null,model)}finally{if(submit){submit.disabled=false;submit.textContent='Merk opslaan'}}},true);
    document.getElementById('brandSearch')?.addEventListener('input',()=>renderLegacy(store.getState().brands),true);
    document.getElementById('brandStatusFilter')?.addEventListener('change',()=>renderLegacy(store.getState().brands),true);
    store.loadBrands().catch(()=>{});
  });
})();
