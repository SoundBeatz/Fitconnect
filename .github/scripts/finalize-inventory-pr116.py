from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source not found')
    return text.replace(old, new, 1)

# Replace the bridge bootstrap wherever the current static runtime owns it.
bootstrap_updated=False
for path in [Path('admin/index.html'),Path('admin/interface.js')]:
    text=path.read_text()
    new_text,count=re.subn(r'inventory-v1-bridge\.js\?v=[^"\']+', 'inventory-renderer.js?v=20260802-commerce-inventory-renderer-v1', text, count=1)
    if count:
        path.write_text(new_text)
        bootstrap_updated=True
        break
if not bootstrap_updated:
    raise SystemExit('replace Inventory bridge bootstrap: source not found in admin/index.html or admin/interface.js')

renderer_path=Path('admin/product-renderer.js')
renderer=renderer_path.read_text()
renderer=replace_once(renderer,",stock:Number(f.stock?.value||0),delivery:",",delivery:",'remove stock from ProductFormFactory serialization')
renderer=replace_once(renderer,"assign('vat',product.vat);assign('stock',product.stock);assign('delivery',product.delivery);","assign('vat',product.vat);assign('delivery',product.delivery);",'remove stock from ProductFormFactory population')
renderer_path.write_text(renderer)

bridge=Path('admin/inventory-v1-bridge.js')
if not bridge.exists():
    raise SystemExit('inventory-v1-bridge.js missing')
bridge.unlink()
