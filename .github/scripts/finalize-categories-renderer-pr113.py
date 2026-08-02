from pathlib import Path

TAG='20260802-commerce-categories-renderer-v1'
admin=Path('admin/index.html')
text=admin.read_text()
text=text.replace('category-v1-bridge.js?v=20260802-commerce-categories-foundation-v1',f'category-renderer.js?v={TAG}')
admin.write_text(text)

shop=Path('shop/index.html')
text=shop.read_text()
needle='<script src="storefront-product-store.js?v=20260802-products-release-v1.0"></script>'
insert=needle+f'\n<script src="storefront-category-repository.js?v={TAG}"></script>\n<script src="storefront-category-store.js?v={TAG}"></script>\n<script src="storefront-category-presenter.js?v={TAG}"></script>'
if 'storefront-category-repository.js' not in text:text=text.replace(needle,insert)
shop.write_text(text)
