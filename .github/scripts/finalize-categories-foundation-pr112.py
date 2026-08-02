from pathlib import Path
p=Path('admin/index.html')
s=p.read_text()
tag='20260802-commerce-categories-foundation-v1'
block='\n'.join([
 f'<script src="/admin/category-repository.js?v={tag}"></script>',
 f'<script src="/admin/category-service.js?v={tag}"></script>',
 f'<script src="/admin/category-store.js?v={tag}"></script>',
 f'<script src="/admin/category-v1-bridge.js?v={tag}"></script>'
])
if 'category-repository.js' not in s:
    s=s.replace('</body>',block+'\n</body>')
p.write_text(s)
