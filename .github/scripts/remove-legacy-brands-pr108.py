from pathlib import Path

path = Path('admin/admin.js')
lines = path.read_text().splitlines()
output = []

for line in lines:
    if line.startswith('let brands=[],suppliers=[]'):
        output.append(line.replace('let brands=[],suppliers=[]', 'let suppliers=[]', 1))
        continue

    if line.startswith('async function loadAll(){'):
        line = line.replace(
            "const [b,su,c,ic,e,t,s]=await Promise.all([client.from('brands').select('*').order('display_order').order('name'),client.from('suppliers').select('*').order('name'),",
            "const [su,c,ic,e,t,s]=await Promise.all([client.from('suppliers').select('*').order('name'),",
            1,
        )
        line = line.replace('const auxiliary=[b,su,c,ic,e,t,s];', 'const auxiliary=[su,c,ic,e,t,s];', 1)
        line = line.replace('brands=b.error?[]:b.data||[];suppliers=', 'suppliers=', 1)
        output.append(line)
        continue

    if line.startswith((
        'function syncBrandOptions(',
        'function renderBrands(',
        'function renderBrandLogo(',
        'function clearBrand(',
        'function editBrand(',
        "$('#brandLogoInput').addEventListener(",
        "$('#brandForm').addEventListener('submit'",
        "$('#brandForm').elements.name.addEventListener(",
    )):
        continue

    if line.startswith("$('#logoutButton').addEventListener") and 'function renderAll()' in line:
        line = line.replace('syncBrandOptions();', '').replace('renderBrands();', '')
        output.append(line)
        continue

    output.append(line)

text = '\n'.join(output) + '\n'

for forbidden in (
    "from('brands')",
    'let brands=[]',
    'function renderBrands(',
    'function editBrand(',
    'function syncBrandOptions(',
    'function renderBrandLogo(',
    'function clearBrand(',
    "$('#brandLogoInput').addEventListener(",
    "$('#brandForm').addEventListener('submit'",
    "$('#brandAdminGrid').innerHTML",
):
    if forbidden in text:
        raise SystemExit(f'Legacy Brands token remains: {forbidden}')

for required in (
    "from('suppliers')",
    'function renderSuppliers(',
    'function editSupplier(',
    "$('#supplierForm').addEventListener('submit'",
    'function renderCustomers(',
    'function renderTraining(',
    'function renderWarranty(',
    'function renderService(',
    "$('#logoutButton').addEventListener",
    'function renderAll(){renderStats();syncSupplierOptions();renderSuppliers();renderCustomers();renderTraining();renderWarranty();renderService()}',
):
    if required not in text:
        raise SystemExit(f'Required non-Brand behavior missing: {required}')

path.write_text(text)
print('PR108 Brands legacy removal completed safely')
