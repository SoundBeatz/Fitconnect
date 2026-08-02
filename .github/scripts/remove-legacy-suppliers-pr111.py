from pathlib import Path
import re

path = Path('admin/admin.js')
text = path.read_text()
original = text

if 'let suppliers=[],customers=[]' not in text:
    raise SystemExit('Supplier state declaration not found')
text = text.replace('let suppliers=[],customers=[]', 'let customers=[]', 1)

load_replacements = {
    "const [su,c,ic,e,t,s]=await Promise.all([client.from('suppliers').select('*').order('name'),client.from('profiles')": "const [c,ic,e,t,s]=await Promise.all([client.from('profiles')",
    'const auxiliary=[su,c,ic,e,t,s];': 'const auxiliary=[c,ic,e,t,s];',
    'suppliers=su.error?[]:su.data||[];customers=': 'customers='
}
for old, new in load_replacements.items():
    if old not in text:
        raise SystemExit(f'Expected loadAll fragment missing: {old[:90]}')
    text = text.replace(old, new, 1)

def remove_function(source: str, name: str) -> str:
    marker = f'function {name}('
    start = source.find(marker)
    if start < 0:
        return source
    brace = source.find('{', start)
    if brace < 0:
        raise SystemExit(f'Malformed function {name}')
    depth = 0
    quote = None
    escaped = False
    i = brace
    while i < len(source):
        ch = source[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
        else:
            if ch in ('"', "'", '`'):
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return source[:start] + source[i + 1:]
        i += 1
    raise SystemExit(f'Unclosed function {name}')

for name in ('syncSupplierOptions', 'renderSuppliers', 'clearSupplier', 'editSupplier'):
    text = remove_function(text, name)

# Remove the complete legacy supplier submit/new/clear/search handler chain only.
start = text.find("$('#supplierForm').addEventListener('submit'")
end_marker = "$('#supplierSearch').addEventListener('input',renderSuppliers);"
if start < 0 or end_marker not in text[start:]:
    raise SystemExit('Legacy supplier handler chain not found')
end = text.find(end_marker, start) + len(end_marker)
text = text[:start] + text[end:]

text = text.replace('syncSupplierOptions();', '')
text = text.replace('renderSuppliers();', '')

if text == original:
    raise SystemExit('No changes made')

for forbidden in (
    "from('suppliers')",
    'let suppliers=[]',
    'function syncSupplierOptions(',
    'function renderSuppliers(',
    'function clearSupplier(',
    'function editSupplier(',
    "$('#supplierForm').addEventListener('submit'",
    "$('#supplierGrid').innerHTML",
):
    if forbidden in text:
        raise SystemExit(f'Legacy Suppliers token remains: {forbidden}')

for required in (
    "from('profiles')",
    'function renderCustomers(',
    'function renderTraining(',
    'function renderWarranty(',
    'function renderService(',
    "$('#logoutButton').addEventListener",
    'renderAll();',
):
    if required not in text:
        raise SystemExit(f'Required non-Supplier behavior missing: {required}')

path.write_text(text)
print('PR111 Suppliers legacy removal completed safely')
