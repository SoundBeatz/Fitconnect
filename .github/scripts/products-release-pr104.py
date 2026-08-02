from pathlib import Path

TAG='20260802-products-release-v1.0'

def replace(path, replacements):
    p=Path(path)
    text=p.read_text()
    for old,new in replacements:
        if old not in text:
            raise SystemExit(f'Missing expected token in {path}: {old}')
        text=text.replace(old,new)
    p.write_text(text)

replace('shop/index.html',[
    ('storefront-product-repository.js?v=20260802-storefront-read-v1',f'storefront-product-repository.js?v={TAG}'),
    ('storefront-product-store.js?v=20260802-storefront-read-v1',f'storefront-product-store.js?v={TAG}'),
    ('shop.js?v=20260802-storefront-read-v1',f'shop.js?v={TAG}'),
])

replace('shop/product/index.html',[
    ('../storefront-product-repository.js?v=20260802-storefront-read-v1',f'../storefront-product-repository.js?v={TAG}'),
    ('../storefront-product-store.js?v=20260802-storefront-read-v1',f'../storefront-product-store.js?v={TAG}'),
    ('product.js?v=20260802-storefront-read-v1',f'product.js?v={TAG}'),
])

replace('admin/index.html',[
    ('product-config.js?v=20260802-product-fdmp-1',f'product-config.js?v={TAG}'),
    ('product-repository.js?v=20260802-product-fdmp-1',f'product-repository.js?v={TAG}'),
    ('product-service.js?v=20260802-product-fdmp-1',f'product-service.js?v={TAG}'),
    ('product-store.js?v=20260802-product-fdmp-1',f'product-store.js?v={TAG}'),
    ('product-renderer.js?v=20260802-product-renderer-v1',f'product-renderer.js?v={TAG}'),
    ('interface.js?v=20260802-recovery-release-v1.1',f'interface.js?v={TAG}'),
])
