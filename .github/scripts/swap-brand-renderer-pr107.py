from pathlib import Path
p=Path('admin/index.html')
s=p.read_text()
old='brand-v1-bridge.js?v=20260802-commerce-brands-foundation-v1'
new='brand-renderer.js?v=20260802-commerce-brands-renderer-v1'
if old not in s: raise SystemExit('legacy bridge bootstrap token not found')
p.write_text(s.replace(old,new))
