from pathlib import Path
path=Path('admin/index.html')
text=path.read_text()
marker='<script src="brand-repository.js?v=20260802-commerce-brands-foundation-v1"></script>'
insert='''<script src="supplier-repository.js?v=20260802-commerce-suppliers-foundation-v1"></script>\n<script src="supplier-service.js?v=20260802-commerce-suppliers-foundation-v1"></script>\n<script src="supplier-store.js?v=20260802-commerce-suppliers-foundation-v1"></script>\n<script src="supplier-v1-bridge.js?v=20260802-commerce-suppliers-foundation-v1"></script>\n'''
if insert.strip() in text: raise SystemExit('already injected')
if marker not in text: raise SystemExit('brand marker missing')
text=text.replace(marker,insert+marker,1)
path.write_text(text)
