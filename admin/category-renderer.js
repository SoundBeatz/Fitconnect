(()=>{
  'use strict';
  let store=null;
  const slug=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const CategoryOptionFactory={
    render(select,items,{placeholder='',selected='',allValue=null}={}){
      if(!select)return;
      const previous=selected||select.value;
      select.replaceChildren();
      const first=document.createElement('option');first.value=allValue??'';first.textContent=placeholder;select.appendChild(first);
      items.forEach(item=>{const option=document.createElement('option');option.value=item.name;option.textContent=item.name;option.dataset.categoryId=item.id;option.dataset.slug=item.slug;if(item.parentKey)option.dataset.parentKey=item.parentKey;select.appendChild(option)});
      if([...select.options].some(option=>option.value===previous))select.value=previous;
    },
    renderChildren(select,categories,parentValue,selected=''){
      if(!select)return;
      const parent=categories.find(item=>item.type==='main'&&(item.name===parentValue||item.slug===slug(parentValue)||item.id===parentValue));
      const children=parent?categories.filter(item=>item.type==='sub'&&item.parentKey===parent.id):[];
      this.render(select,children,{placeholder:parent?'Kies subcategorie':'Kies eerst hoofdcategorie',selected});
      select.disabled=!parent;
    }
  };
  function sync(categories){
    const form=document.getElementById('productForm'),main=form?.elements?.category,sub=form?.elements?.subcategory,bundle=document.getElementById('bundleProductCategory');
    const mains=categories.filter(item=>item.type==='main');
    if(main){const selectedMain=main.value,selectedSub=sub?.value||'';CategoryOptionFactory.render(main,mains,{placeholder:'Kies hoofdcategorie',selected:selectedMain});CategoryOptionFactory.renderChildren(sub,categories,main.value,selectedSub);if(!main.dataset.categoryRendererBound){main.addEventListener('change',()=>CategoryOptionFactory.renderChildren(sub,categories,main.value));main.dataset.categoryRendererBound='true'}}
    if(bundle)CategoryOptionFactory.render(bundle,mains,{placeholder:'Alle categorieën',selected:bundle.value,allValue:'all'});
  }
  function init(){
    store=window.categoryStore;
    if(!store){console.error('[FDMP] CategoryStore ontbreekt');return}
    store.subscribeEvent('categories.loaded',({categories})=>{sync(categories);window.dispatchEvent(new CustomEvent('fitconnect:categories-loaded',{detail:{categories}}))});
    store.subscribeEvent('categories.error',({error})=>window.fitConnectToast?.(error?.message||'Categorieën laden mislukt'));
    store.loadCategories().catch(()=>{});
  }
  window.CategoryOptionFactory=CategoryOptionFactory;
  window.FitConnectCategoryRenderer={init};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();