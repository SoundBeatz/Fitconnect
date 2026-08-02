from pathlib import Path

path=Path('admin/index.html')
text=path.read_text()
tag='20260802-commerce-inventory-foundation-v1'
assets=['inventory-persistence-adapter','inventory-repository','inventory-service','inventory-store','inventory-v1-bridge']
if all(f'{asset}.js?v={tag}' in text for asset in assets):
    raise SystemExit('Inventory bootstrap already present')
needle='<script src="/admin/product-renderer.js?v=20260802-products-release-v1.0"></script>'
if needle not in text:
    raise SystemExit('product renderer bootstrap anchor not found')
block='\n'.join(f'<script src="/admin/{asset}.js?v={tag}"></script>' for asset in assets)
text=text.replace(needle,block+'\n'+needle,1)
path.write_text(text)
