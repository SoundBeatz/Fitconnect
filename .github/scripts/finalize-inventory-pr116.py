from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source not found')
    return text.replace(old, new, 1)

index_path=Path('admin/index.html')
index=index_path.read_text()
renderer_tag='<script src="inventory-renderer.js?v=20260802-commerce-inventory-renderer-v1"></script>'
if 'inventory-renderer.js?v=20260802-commerce-inventory-renderer-v1' not in index:
    old_match=re.search(r'<script src="[^"]*inventory-v1-bridge\.js\?v=[^"]+"></script>',index)
    if old_match:
        index=index.replace(old_match.group(0),renderer_tag,1)
    else:
        anchor_match=re.search(r'<script src="[^"]*product-renderer\.js\?v=[^"]+"></script>',index)
        if not anchor_match:
            raise SystemExit('insert Inventory renderer before Product renderer: source not found')
        index=index.replace(anchor_match.group(0),renderer_tag+'\n'+anchor_match.group(0),1)
index_path.write_text(index)

renderer_path=Path('admin/product-renderer.js')
renderer=renderer_path.read_text()
renderer=replace_once(renderer,",stock:Number(f.stock?.value||0),delivery:",",delivery:",'remove stock from ProductFormFactory serialization')
renderer=replace_once(renderer,"assign('vat',product.vat);assign('stock',product.stock);assign('delivery',product.delivery);","assign('vat',product.vat);assign('delivery',product.delivery);",'remove stock from ProductFormFactory population')
renderer_path.write_text(renderer)

bridge=Path('admin/inventory-v1-bridge.js')
if not bridge.exists():
    raise SystemExit('inventory-v1-bridge.js missing')
bridge.unlink()
