from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source not found')
    return text.replace(old, new, 1)

index_path=Path('admin/index.html')
index=index_path.read_text()
old='inventory-v1-bridge.js?v=20260802-commerce-inventory-foundation-v1'
new='inventory-renderer.js?v=20260802-commerce-inventory-renderer-v1'
index=replace_once(index,old,new,'replace Inventory bridge bootstrap')
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
