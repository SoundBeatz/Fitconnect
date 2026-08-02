from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source block not found')
    return text.replace(old, new, 1)

admin_path=Path('admin/index.html')
admin=admin_path.read_text()
admin,count=re.subn(r'(<select[^>]+name="category"[^>]*>).*?(</select>)',r'\1<option value="">Kies hoofdcategorie</option>\2',admin,count=1,flags=re.S)
if count!=1: raise SystemExit('admin category select not found')
admin,count=re.subn(r'(<select[^>]+name="subcategory"[^>]*>).*?(</select>)',r'\1<option value="">Kies subcategorie</option>\2',admin,count=1,flags=re.S)
if count!=1: raise SystemExit('admin subcategory select not found')
admin_path.write_text(admin)

shop_html_path=Path('shop/index.html')
shop_html=shop_html_path.read_text()
shop_html,count=re.subn(r'(<select id="categoryFilter"[^>]*>).*?(</select>)',r'\1<option value="Alle">Alle categorieën</option>\2',shop_html,count=1,flags=re.S)
if count!=1: raise SystemExit('shop categoryFilter not found')
shop_html_path.write_text(shop_html)

repo_path=Path('shop/storefront-product-repository.js')
repo=repo_path.read_text()
repo=replace_once(repo,".eq('status','active').neq('category','Voeding')",".eq('status','active')",'remove Voeding query filter')
repo=replace_once(repo,"return (data||[]).map(record=>this.mapToStorefrontDomain(record));","return (data||[]).filter(record=>this.categorySlug(record.category)!=='nutrition').map(record=>this.mapToStorefrontDomain(record));",'add canonical nutrition filter')
repo=replace_once(repo,"    sanitizeSpecifications(value){","    categorySlug(value){return String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}\n    sanitizeSpecifications(value){",'add categorySlug')
repo_path.write_text(repo)

presenter_path=Path('shop/storefront-category-presenter.js')
presenter=presenter_path.read_text()
binding="""  function bindInteractions(){
    const categoryFilter=document.getElementById('categoryFilter');
    const subcategoryNodes=()=>[...document.querySelectorAll('[data-subcategory]')];
    const emit=(category,subcategory='')=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category,subcategory}}));
    categoryFilter?.addEventListener('change',()=>{subcategoryNodes().forEach(node=>node.classList.remove('active'));emit(categoryFilter.value,'');},true);
    document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();const category=button.dataset.category||'';if(categoryFilter)categoryFilter.value=category;subcategoryNodes().forEach(node=>node.classList.remove('active'));const panel=document.getElementById('strengthSubcategories');if(panel){panel.hidden=button.dataset.categorySlug!=='kracht';if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'nearest'});}emit(category,'');if(button.dataset.categorySlug!=='kracht')document.getElementById('producten')?.scrollIntoView();},true));
    subcategoryNodes().forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();subcategoryNodes().forEach(node=>node.classList.toggle('active',node===button&&Boolean(button.dataset.subcategory)));emit(categoryFilter?.value||'Alle',button.dataset.subcategory||'');document.getElementById('producten')?.scrollIntoView({behavior:'smooth'});},true));
  }
"""
presenter=replace_once(presenter,"  function init(){",binding+"  function init(){",'insert presenter interaction owner')
presenter=replace_once(presenter,"window.storefrontCategoryStore=store;store.subscribe","window.storefrontCategoryStore=store;bindInteractions();store.subscribe",'bind presenter interactions')
presenter_path.write_text(presenter)

shop_js_path=Path('shop/shop.js')
shop_js=shop_js_path.read_text()
legacy_blocks=[
"  categoryFilter?.addEventListener('change',()=>{activeSubcategory='';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.remove('active'));renderProducts()});\n",
"  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.category;if(categoryFilter)categoryFilter.value=category;activeSubcategory='';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.remove('active'));const panel=document.getElementById('strengthSubcategories');if(panel){panel.hidden=category!=='Kracht';if(category==='Kracht')panel.scrollIntoView({behavior:'smooth',block:'nearest'})}renderProducts();if(category!=='Kracht')document.getElementById('producten')?.scrollIntoView()}));\n",
"  document.querySelectorAll('[data-subcategory]').forEach(button=>button.addEventListener('click',()=>{activeSubcategory=button.dataset.subcategory||'';document.querySelectorAll('[data-subcategory]').forEach(node=>node.classList.toggle('active',node===button&&Boolean(activeSubcategory)));if(categoryFilter)categoryFilter.value='Kracht';renderProducts();document.getElementById('producten')?.scrollIntoView({behavior:'smooth'})}));\n"
]
for index,block in enumerate(legacy_blocks,1):
    shop_js=replace_once(shop_js,block,'',f'remove legacy category binding {index}')
listener="  window.addEventListener('fitconnect:storefront-category-selected',event=>{const detail=event.detail||{};if(categoryFilter&&detail.category)categoryFilter.value=detail.category;activeSubcategory=detail.subcategory||'';renderProducts()});\n"
shop_js=replace_once(shop_js,"  loadProducts();",listener+"  loadProducts();",'add storefront category event consumer')
shop_js_path.write_text(shop_js)
