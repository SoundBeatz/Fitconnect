from pathlib import Path
import re

path = Path('admin/admin.js')
text = path.read_text()
original = text

# Remove Brands from the shared state while preserving all neighbouring domains.
if 'let brands=[],suppliers=[]' not in text:
    raise SystemExit('Brands state declaration not found')
text = text.replace('let brands=[],suppliers=[]', 'let suppliers=[]', 1)

# Surgically remove the Brands request from loadAll.
load_replacements = {
    "const [b,su,c,ic,e,t,s]=await Promise.all([client.from('brands').select('*').order('display_order').order('name'),client.from('suppliers').select('*').order('name'),":
    "const [su,c,ic,e,t,s]=await Promise.all([client.from('suppliers').select('*').order('name'),",
    'const auxiliary=[b,su,c,ic,e,t,s];': 'const auxiliary=[su,c,ic,e,t,s];',
    'brands=b.error?[]:b.data||[];suppliers=': 'suppliers='
}
for old, new in load_replacements.items():
    if old not in text:
        raise SystemExit(f'Expected loadAll fragment missing: {old[:80]}')
    text = text.replace(old, new, 1)

# Remove a named top-level function by balancing braces while respecting strings and templates.
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

for function_name in ('syncBrandOptions', 'renderBrands', 'editBrand'):
    text = remove_function(text, function_name)

# Remove only standalone Brands UI bindings. Patterns are deliberately anchored to the next top-level statement.
for selector, event in (
    ('brandForm', 'submit'),
    ('newBrand', 'click'),
    ('clearBrand', 'click'),
    ('brandSearch', 'input'),
    ('brandStatusFilter', 'change'),
):
    pattern = rf"\$\('#{selector}'\)\?\.addEventListener\('{event}',.*?\);(?=\$\(|[A-Za-z_$])"
    text = re.sub(pattern, '', text, count=1, flags=re.S)

# Legacy render calls are no longer allowed anywhere in the monolith.
text = text.replace('renderBrands();', '')
text = text.replace('syncBrandOptions();', '')

if text == original:
    raise SystemExit('No changes made; refusing empty migration')

for forbidden in (
    "from('brands')",
    'let brands=[]',
    'function renderBrands(',
    'function editBrand(',
    'function syncBrandOptions(',
    "$('#brandForm')?.addEventListener('submit'",
    "$('#brandAdminGrid').innerHTML",
):
    if forbidden in text:
        raise SystemExit(f'Legacy Brands token remains: {forbidden}')

for required in (
    "from('suppliers')",
    'function renderSuppliers(',
    'renderAll();',
    "$('#logoutButton')",
    'function renderCustomers(',
):
    if required not in text:
        raise SystemExit(f'Required non-Brand behavior missing: {required}')

path.write_text(text)
print('PR108 Brands legacy removal completed safely')
