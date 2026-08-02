from pathlib import Path
p=Path('admin/index.html')
s=p.read_text()
old='supplier-v1-bridge.js?v=20260802-commerce-suppliers-foundation-v1'
new='supplier-renderer.js?v=20260802-commerce-suppliers-renderer-v1'
if old not in s: raise SystemExit('Supplier bridge bootstrap not found')
p.write_text(s.replace(old,new,1))
