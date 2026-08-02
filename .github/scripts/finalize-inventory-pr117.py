from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: source not found')
    return text.replace(old, new, 1)

# 1. Remove any known dead inventory calculations and direct inventory DOM writes
# from the remaining monolith. These substitutions are deliberately narrow.
admin_path = Path('admin/admin.js')
admin = admin_path.read_text()
admin = re.sub(r'[^;\n]*totalInventoryValue\s*\+=\s*Number\([^;\n]*\.stock[^;\n]*\);?', '', admin)
admin = re.sub(r'[^;\n]*querySelector\(["\']\.stock-indicator["\']\)[^;\n]*;?', '', admin)
admin = re.sub(r'[^;\n]*\[data-product-stock\][^;\n]*;?', '', admin)
admin_path.write_text(admin)

# 2. Remove ProductRenderer ownership of inventory values. The inventory column
# remains structurally present and is populated only by InventoryRenderer.
product_path = Path('admin/product-renderer.js')
product = product_path.read_text()
product = replace_once(
    product,
    '<td>${Number(product.stock||0)}</td>',
    '<td data-inventory-cell>—</td>',
    'replace ProductRenderer stock cell'
)
product = replace_once(
    product,
    ":sort==='stock-asc'?Number(a.stock)-Number(b.stock):new Date(b.createdAt||0)-new Date(a.createdAt||0)",
    ":new Date(b.createdAt||0)-new Date(a.createdAt||0)",
    'remove ProductRenderer stock sorting'
)
product = replace_once(
    product,
    "set('shopStockCount',active.reduce((sum,product)=>sum+Number(product.stock||0),0));",
    "set('shopStockCount','—');",
    'remove ProductRenderer stock aggregation'
)
product_path.write_text(product)

# 3. Make InventoryRenderer the only owner of the inventory table cell.
renderer_path = Path('admin/inventory-renderer.js')
renderer = renderer_path.read_text()
renderer = replace_once(
    renderer,
    "const cell=row.children?.[4];",
    "const cell=row.querySelector('[data-inventory-cell]');",
    'target keyed inventory cell'
)
renderer_path.write_text(renderer)

# 4. Safety assertions: admin.js must not keep local inventory state or direct
# inventory DOM ownership. ProductRenderer must not read product.stock.
admin = admin_path.read_text()
product = product_path.read_text()
renderer = renderer_path.read_text()
for forbidden in ('totalInventoryValue', '.stock-indicator', '[data-product-stock]', 'record.stock', 'product.stock'):
    if forbidden in admin:
        raise SystemExit(f'admin.js still contains forbidden inventory ownership: {forbidden}')
for forbidden in ('product.stock', 'a.stock', 'b.stock', "elements.stock", "[name=\"stock\"]"):
    if forbidden in product:
        raise SystemExit(f'product-renderer.js still contains forbidden inventory ownership: {forbidden}')
if "[data-inventory-cell]" not in product or "[data-inventory-cell]" not in renderer:
    raise SystemExit('keyed inventory cell contract missing')
