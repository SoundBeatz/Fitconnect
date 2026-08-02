from pathlib import Path
import re

TAG = "20260802-commerce-release-v1.0"

TARGETS = {
    Path("shop/index.html"): [
        "storefront-category-repository.js",
        "storefront-category-store.js",
        "storefront-category-presenter.js",
        "storefront-commerce-repositories.js",
        "storefront-inventory-service.js",
        "storefront-commerce-stores.js",
        "shop.js",
    ],
    Path("shop/product/index.html"): [
        "storefront-commerce-repositories.js",
        "storefront-inventory-service.js",
        "storefront-commerce-stores.js",
        "product.js",
    ],
    Path("admin/index.html"): [
        "deep-freeze.js",
        "brand-repository.js",
        "brand-service.js",
        "brand-store.js",
        "brand-renderer.js",
        "supplier-repository.js",
        "supplier-service.js",
        "supplier-store.js",
        "supplier-renderer.js",
        "category-repository.js",
        "category-service.js",
        "category-store.js",
        "category-renderer.js",
        "inventory-persistence-adapter.js",
        "inventory-repository.js",
        "inventory-service.js",
        "inventory-store.js",
        "inventory-renderer.js",
        "interface.js",
    ],
}

for path, assets in TARGETS.items():
    text = path.read_text(encoding="utf-8")
    original = text
    for asset in assets:
        pattern = rf'({re.escape(asset)})\?v=[^"\']+'
        text, count = re.subn(pattern, rf'\1?v={TAG}', text)
        if count == 0:
            raise SystemExit(f"Missing expected asset {asset} in {path}")
    path.write_text(text, encoding="utf-8")
    if text == original:
        raise SystemExit(f"No changes made to {path}")

print("Commerce release tags harmonized.")
