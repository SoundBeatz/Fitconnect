from pathlib import Path

path = Path('admin/index.html')
text = path.read_text(encoding='utf-8')
tag = '20260802-commerce-brands-foundation-v1'
block = '\n'.join([
    f'<script src="brand-repository.js?v={tag}"></script>',
    f'<script src="brand-service.js?v={tag}"></script>',
    f'<script src="brand-store.js?v={tag}"></script>',
    f'<script src="brand-v1-bridge.js?v={tag}"></script>',
])
needle = '<script src="interface.js?v=20260802-products-release-v1.0"></script>'
if block not in text:
    if needle not in text:
        raise SystemExit('Expected interface bootstrap marker not found')
    text = text.replace(needle, block + '\n' + needle)
path.write_text(text, encoding='utf-8')
