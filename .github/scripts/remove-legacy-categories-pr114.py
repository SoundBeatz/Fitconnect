from pathlib import Path
import re


def replace_once(text, pattern, replacement, label, flags=0):
    new, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return new

# Remove static functional category options from the two HTML shells.
admin_path = Path('admin/index.html')
admin = admin_path.read_text()
admin = re.sub(r'(<select[^>]+name="category"[^>]*>).*?(</select>)', r'\1<option value="">Kies hoofdcategorie</option>\2', admin, count=1, flags=re.S)
admin = re.sub(r'(<select[^>]+name="subcategory"[^>]*>).*?(</select>)', r'\1<option value="">Kies subcategorie</option>\2', admin, count=1, flags=re.S)
admin_path.write_text(admin)

shop_html_path = Path('shop/index.html')
shop_html = shop_html_path.read_text()
shop_html = re.sub(r'(<select id="categoryFilter"[^>]*>).*?(</select>)', r'\1<option value="Alle">Alle categorieën</option>\2', shop_html, count=1, flags=re.S)
shop_html_path.write_text(shop_html)

# Replace the textual nutrition exception with canonical slug filtering.
repo_path = Path('shop/storefront-product-repository.js')
repo = repo_path.read_text()
repo = replace_once(repo, r"\.eq\('status','active'\)\.neq\('category','Voeding'\)", ".eq('status','active')", 'remove Voeding query filter')
repo = repo.replace("return (data||[]).map(record=>this.mapToStorefrontDomain(record));", "return (data||[]).filter(record=>this.categorySlug(record.category)!=='nutrition').map(record=>this.mapToStorefrontDomain(record));", 1)
repo = repo.replace("    sanitizeSpecifications(value){", "    categorySlug(value){return String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}\n    sanitizeSpecifications(value){", 1)
repo_path.write_text(repo)

# Move public category/subcategory interaction ownership to the presenter.
presenter_path = Path('shop/storefront-category-presenter.js')
presenter = presenter_path.read_text()
presenter = presenter.replace("  function init(){", "  function bindInteractions(){\n    const categoryFilter=document.getElementById('categoryFilter');\n    categoryFilter?.addEventListener('change',()=>window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category:categoryFilter.value,subcategory:''}})),true);\n    document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();const category=button.dataset.category||'';if(categoryFilter)categoryFilter.value=category;window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category,subcategory:''}}));document.getElementById('producten')?.scrollIntoView({behavior:'smooth'});},true));\n    document.querySelectorAll('[data-subcategory]').forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();window.dispatchEvent(new CustomEvent('fitconnect:storefront-category-selected',{detail:{category:categoryFilter?.value||'Alle',subcategory:button.dataset.subcategory||''}}));document.getElementById('producten')?.scrollIntoView({behavior:'smooth'});},true));\n  }\n  function init(){", 1)
presenter = presenter.replace("window.storefrontCategoryStore=store;store.subscribe", "window.storefrontCategoryStore=store;bindInteractions();store.subscribe", 1)
presenter_path.write_text(presenter)

# Remove legacy storefront category/subcategory bindings and consume presenter events.
shop_js_path = Path('shop/shop.js')
shop_js = shop_js_path.read_text()
patterns = [
    r"\n\s*document\.querySelectorAll\('\[data-category\]'\)\.forEach\(.*?\);",
    r"\n\s*document\.querySelectorAll\('\[data-subcategory\]'\)\.forEach\(.*?\);",
]
for pattern in patterns:
    shop_js = re.sub(pattern, '', shop_js, flags=re.S)
listener = "\n  window.addEventListener('fitconnect:storefront-category-selected',event=>{const detail=event.detail||{};if(categoryFilter&&detail.category)categoryFilter.value=detail.category;activeSubcategory=detail.subcategory||'';renderProducts();});\n"
shop_js = shop_js.replace("  loadProducts();", listener + "  loadProducts();", 1)
shop_js_path.write_text(shop_js)
