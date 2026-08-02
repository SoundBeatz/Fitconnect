from pathlib import Path
p=Path('admin/admin.js')
lines=p.read_text().splitlines()
out=[]
for line in lines:
    if line.startswith('function editProduct('):
        continue
    if line.startswith("$('#newProduct').addEventListener"):
        marker=";$('#duplicateProduct').addEventListener"
        if marker in line:
            line=line.split(marker,1)[0]
    out.append(line)
# Restore non-product bindings accidentally co-located with the removed filter line.
bootstrap_index=next(i for i,line in enumerate(out) if line.startswith("(async()=>{try{const session=await requireAdmin();if(!session)return;await loadAll()}"))
render_line="$('#logoutButton').addEventListener('click',async()=>{await client.auth.signOut();location.href='login.html'});function renderAll(){renderStats();syncBrandOptions();syncSupplierOptions();renderBrands();renderSuppliers();renderCustomers();renderTraining();renderWarranty();renderService()}"
if not any('function renderAll()' in line for line in out):
    out.insert(bootstrap_index,render_line)
p.write_text('\n'.join(out)+'\n')
