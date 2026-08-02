from pathlib import Path

FINAL = '20260802-commerce-release-v1.0'
OLD_TAGS = [
    '20260802-commerce-brands-foundation-v1',
    '20260802-commerce-brands-renderer-v1',
    '20260802-commerce-suppliers-foundation-v1',
    '20260802-commerce-suppliers-renderer-v1',
    '20260802-commerce-categories-foundation-v1',
    '20260802-commerce-categories-renderer-v1',
    '20260802-commerce-inventory-foundation-v1',
    '20260802-commerce-inventory-renderer-v1',
    '20260802-storefront-commerce-v1',
]

for path in Path('.github/workflows').glob('*.yml'):
    text = path.read_text(encoding='utf-8')
    updated = text
    for old in OLD_TAGS:
        updated = updated.replace(old, FINAL)
    if updated != text:
        path.write_text(updated, encoding='utf-8')

product = Path('.github/workflows/product-release-cache-harmonization.yml')
text = product.read_text(encoding='utf-8')
text = text.replace("COMMERCE_TAG='20260802-storefront-commerce-v1'", f"COMMERCE_TAG='{FINAL}'")
text = text.replace('grep -q "interface.js?v=$PRODUCT_TAG" admin/index.html', 'grep -q "interface.js?v=$COMMERCE_TAG" admin/index.html')
product.write_text(text, encoding='utf-8')

recovery = Path('.github/workflows/recovery-release-cache-harmonization.yml')
text = recovery.read_text(encoding='utf-8')
text = text.replace("PRODUCT_VERSION='20260802-products-release-v1.0'", "COMMERCE_VERSION='20260802-commerce-release-v1.0'")
text = text.replace('for asset in deep-freeze registry-config module-registry-repository module-registry-service module-registry-store module-registry-v6; do', 'for asset in registry-config module-registry-repository module-registry-service module-registry-store module-registry-v6; do')
text = text.replace('grep -q "interface.js?v=${PRODUCT_VERSION}" admin/index.html', 'grep -q "deep-freeze.js?v=${COMMERCE_VERSION}" admin/index.html\n          grep -q "interface.js?v=${COMMERCE_VERSION}" admin/index.html')
recovery.write_text(text, encoding='utf-8')

print('Commerce release guard expectations harmonized.')
