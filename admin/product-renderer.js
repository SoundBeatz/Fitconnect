(()=>{
  'use strict';
  let store=null;
  let initialized=false;

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const money=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(value||0));
  const parseImages=value=>{try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed:[]}catch{return []}};

  const ProductCardFactory={
    createRow(product,onEdit){
      const row=document.createElement('tr');
      row.dataset.productRow=product.id;
      row.innerHTML=`<td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml([product.brand,product.model].filter(Boolean).join(' · '))}</small></td><td>${escapeHtml(product.brand||'—')}</td><td>${escapeHtml(product.category||'—')}</td><td>${escapeHtml(money(product.price))}</td><td>${Number(product.stock||0)}</td><td><span class="status ${escapeHtml(product.status)}">${escapeHtml(product.status==='active'?'Actief':product.status==='archived'?'Gearchiveerd':'Concept')}</span></td><td><button type="button" data-action="edit-product">Bewerken</button></td>`;
      row.querySelector('[data-action="edit-product"]').addEventListener('click',()=>onEdit(product.id));
      return row;
    },
    setSaving(row,isSaving){const button=row?.querySelector('[data-action="edit-product"]');if(!button)return;button.disabled=isSaving;button.textContent=isSaving?'Opslaan…':'Bewerken'}
  };

  const ProductFormFactory={
    serialize(form){
      const f=form.elements;
      const current=store.getSnapshot(f.id?.value||'')||{};
      const specifications={...(current.specifications||{})};
      const setSpec=(key,value)=>{const clean=String(value??'').trim();if(clean)specifications[key]=clean;else delete specifications[key]};
      setSpec('SKU',f.sku?.value);
      setSpec('EAN',f.ean?.value);
      setSpec('Subcategorie',f.subcategory?.value);
      setSpec('Soort gebruik',f.usageType?.value);
      setSpec('Weight stack (kg)',f.weightStack?.value);
      setSpec('Kleur',f.color?.value);
      setSpec('Materiaal',f.material?.value);
      setSpec('Max. belasting (kg)',f.maxLoad?.value);
      setSpec('Max. gebruikerslengte (cm)',f.maxUserHeight?.value);
      setSpec('Verstelbaar',f.adjustable?.value);
      setSpec('Soort garantie',f.warrantyType?.value);
      setSpec('Lengte product (cm)',f.length?.value);
      setSpec('Breedte product (cm)',f.width?.value);
      setSpec('Hoogte product (cm)',f.height?.value);
      setSpec('Netto gewicht (kg)',f.weight?.value);
      setSpec('Verzendgewicht (kg)',f.shippingWeight?.value);
      setSpec('Aantal colli',f.shippingPackages?.value);
      setSpec('Verpakking lengte (cm)',f.shippingLength?.value);
      setSpec('Verpakking breedte (cm)',f.shippingWidth?.value);
      setSpec('Verpakking hoogte (cm)',f.shippingHeight?.value);
      setSpec('AI bronomschrijving',f.contentPrompt?.value);
      setSpec('SEO titel',f.seoTitle?.value);
      setSpec('SEO meta-description',f.seoDescription?.value);
      setSpec('SEO slug',f.seoSlug?.value);
      setSpec('SEO H1',f.seoH1?.value);
      setSpec('SEO zoektermen',f.seoKeywords?.value);
      setSpec('SEO producttype',f.seoProductType?.value);
      setSpec('SEO conditie',f.seoCondition?.value);
      setSpec('Social titel',f.socialTitle?.value);
      setSpec('Social omschrijving',f.socialDescription?.value);
      return {
        brand:f.brand?.value||'',model:f.model?.value||'',name:f.name?.value||'',slug:f.slug?.value||'',category:f.category?.value||'',price:Number(f.price?.value||0),vat:Number(f.vat?.value??21),stock:Number(f.stock?.value||0),delivery:f.delivery?.value||'',warranty:f.warranty?.value||'',status:f.status?.value||'draft',shortDescription:f.shortDescription?.value||'',description:f.description?.value||'',images:parseImages(f.images?.value),featured:Boolean(f.featured?.checked),specifications,sku:f.sku?.value||'',purchasePrice:Number(f.purchasePrice?.value||current.purchasePrice||0)
      };
    },
    populate(form,product){
      const f=form.elements,spec=product.specifications||{};
      const assign=(name,value)=>{if(f[name])f[name].value=value??''};
      assign('id',product.id);assign('brand',product.brand);assign('model',product.model);assign('name',product.name);assign('slug',product.slug);assign('category',product.category);assign('price',product.price);assign('vat',product.vat);assign('stock',product.stock);assign('delivery',product.delivery);assign('warranty',product.warranty);assign('status',product.status);assign('shortDescription',product.shortDescription);assign('description',product.description);assign('images',JSON.stringify(product.images||[]));assign('sku',product.sku||spec.SKU);assign('ean',spec.EAN);assign('subcategory',spec.Subcategorie);assign('purchasePrice',product.purchasePrice);
      if(f.featured)f.featured.checked=Boolean(product.featured);
      form.dataset.productId=product.id||'';
    },
    rollback(form,snapshot){if(snapshot)this.populate(form,snapshot)}
  };

  function initStore(){
    if(store)return store;
    const client=window.getFitConnectSupabase?.();const config=window.FitConnectProductConfig;
    if(!client||!config||!window.ProductRepository||!window.ProductService||!window.ProductStore)throw new Error('Product FDMP-afhankelijkheden ontbreken.');
    const repository=new window.ProductRepository(client);const service=new window.ProductService(repository,config);store=new window.ProductStore(service,config);window.productStore=store;window.FitConnectProductFDMP={repository,service,store};return store;
  }

  function renderInitial(products){const body=document.getElementById('productRows');if(!body)return;body.innerHTML='';products.forEach(product=>body.appendChild(ProductCardFactory.createRow(product,openEditor)));const count=document.getElementById('productResultCount');if(count)count.textContent=`${products.length} ${products.length===1?'product':'producten'}`}
  function replaceRow(product){const body=document.getElementById('productRows');if(!body)return;const old=body.querySelector(`[data-product-row="${CSS.escape(product.id)}"]`);const next=ProductCardFactory.createRow(product,openEditor);if(old)old.replaceWith(next);else body.prepend(next)}
  function setRowSaving(id,isSaving){const row=document.querySelector(`[data-product-row="${CSS.escape(String(id||''))}"]`);ProductCardFactory.setSaving(row,isSaving)}

  function openEditor(id){const product=store.selectProduct(id);const form=document.getElementById('productForm');if(!form||!product)return;ProductFormFactory.populate(form,product);document.getElementById('productEditor')?.classList.add('open');document.getElementById('productEditor')?.setAttribute('aria-hidden','false');document.getElementById('productLayout')?.classList.add('is-editing');window.dispatchEvent(new CustomEvent('fitconnect:product-editor-opened',{detail:{id,product,form}}))}

  async function saveFromForm(event){event.preventDefault();event.stopImmediatePropagation();const form=event.currentTarget;const id=form.elements.id?.value||null;const button=form.querySelector('[type="submit"]');if(button){button.disabled=true;button.textContent='Opslaan…'}try{const saved=await store.updateProduct(id,ProductFormFactory.serialize(form));ProductFormFactory.populate(form,saved);window.fitConnectToast?.(`Product ${saved.name} opgeslagen`)}catch(error){ProductFormFactory.rollback(form,store.getSnapshot(id));window.fitConnectToast?.(error.message||'Product opslaan mislukt')}finally{if(button){button.disabled=false;button.textContent='Opslaan'}}}

  async function init(){
    if(initialized)return;initialized=true;const productStore=initStore();
    productStore.subscribe((state,event)=>{
      if(event.type==='products.loading'&&!state.products.length){const body=document.getElementById('productRows');if(body)body.innerHTML='<tr><td colspan="7">Producten laden via FDMP…</td></tr>'}
      if(event.type==='products.loaded')renderInitial(event.products||state.products);
      if(event.type==='product.saving')setRowSaving(event.id,true);
      if(event.type==='product.saved'){setRowSaving(event.id,false);replaceRow(event.product);window.dispatchEvent(new CustomEvent('fitconnect:product-saved',{detail:{id:event.product.id,product:event.product}}))}
      if(event.type==='product.rollback'){setRowSaving(event.id,false);const form=document.getElementById('productForm');if(form&&String(form.elements.id?.value||'')===String(event.id||''))ProductFormFactory.rollback(form,event.product)}
      if(event.type==='product.saving-complete')setRowSaving(event.id,false);
    });
    document.getElementById('productForm')?.addEventListener('submit',saveFromForm,true);
    document.getElementById('refreshProducts')?.addEventListener('click',()=>productStore.loadProducts(),true);
    const client=window.getFitConnectSupabase?.();const {data}=await client.auth.getSession();if(data?.session)await productStore.loadProducts();
  }

  window.FitConnectProductRenderer={init,openEditor,ProductCardFactory,ProductFormFactory};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
