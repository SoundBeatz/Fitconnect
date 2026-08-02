from pathlib import Path
import re

TAG = "20260802-commerce-release-v1.0"

SHOP_TARGETS = {
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
}

ADMIN_EXISTING = [
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
    "inventory-renderer.js",
    "interface.js",
]

INVENTORY_DEPENDENCIES = [
    "inventory-persistence-adapter.js",
    "inventory-repository.js",
    "inventory-service.js",
    "inventory-store.js",
]


def retag(text, asset, path):
    pattern = rf'({re.escape(asset)})\?v=[^"\']+'
    text, count = re.subn(pattern, rf'\1?v={TAG}', text)
    if count == 0:
        raise SystemExit(f"Missing expected asset {asset} in {path}")
    return text


for path, assets in SHOP_TARGETS.items():
    text = path.read_text(encoding="utf-8")
    original = text
    for asset in assets:
        text = retag(text, asset, path)
    path.write_text(text, encoding="utf-8")
    if text == original:
        raise SystemExit(f"No changes made to {path}")

admin_path = Path("admin/index.html")
admin = admin_path.read_text(encoding="utf-8")
original_admin = admin

for asset in ADMIN_EXISTING:
    admin = retag(admin, asset, admin_path)

renderer_tag = f'<script src="inventory-renderer.js?v={TAG}"></script>'
if renderer_tag not in admin:
    raise SystemExit("Inventory renderer tag missing after retagging")

missing = [asset for asset in INVENTORY_DEPENDENCIES if asset not in admin]
if missing:
    dependency_tags = "\n".join(
        f'<script src="{asset}?v={TAG}"></script>' for asset in INVENTORY_DEPENDENCIES
    )
    admin = admin.replace(renderer_tag, f'{dependency_tags}\n{renderer_tag}', 1)

for asset in INVENTORY_DEPENDENCIES:
    if asset not in admin:
        raise SystemExit(f"Inventory dependency was not inserted: {asset}")
    admin = retag(admin, asset, admin_path)

admin_path.write_text(admin, encoding="utf-8")
if admin == original_admin:
    raise SystemExit("No changes made to admin/index.html")

print("Commerce release tags and Inventory bootstrap harmonized.")
