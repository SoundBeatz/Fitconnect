from pathlib import Path
import re

path = Path('admin/admin.js')
text = path.read_text()
original = text

# 1. Remove brands from the shared global state declaration without touching siblings.
text = text.replace('let brands=[],suppliers=[]', 'let suppliers=[]', 1)

# 2. Replace loadAll with the same surrounding flows minus the brands query and assignment.
old_load = "async function loadAll(){setConnection('Gegevens synchroniseren…');const [b,su,c,ic,e,t,s]=await Promise.all([client.from('brands').select('*').order('display_order').order('name'),client.from('suppliers').select('*').order('name'),client.from('profiles').select('id,full_name,role,phone,company_name,address_line1,postal_code,city,country_code,created_at').order('created_at',{ascending:false}),client.from('invoice_customers').select('*').order('updated_at',{ascending:false}),client.from('customer_equipment').select('*,profiles(full_name),products(name)').order('created_at',{ascending:false}),client.from('training_plans').select('*').order('created_at',{ascending:false}),client.from('service_requests').select('*,profiles(full_name)').order('created_at',{ascending:false})]);const auxiliary=[b,su,c,ic,e,t,s];auxiliary.filter(result=>result.error).forEach(result=>console.error('Command Center module unavailable',result.error));brands=b.error?[]:b.data||[];suppliers=su.error?[]:su.data||[];customers=[...(c.error?[]:c.data||[]),...(ic.error?[]:(ic.data||[]).map(x=>({...x,full_name:x.company_name||x.contact_name,role:'invoice_customer',address_line1:x.address})))];equipment=e.error?[]:e.data||[];trainingPlans=t.error?[]:t.data||[];serviceRequests=s.error?[]:s.data||[];renderAll();try{await loadOrders()}catch(error){console.error('Orders unavailable',error);$('#orderRows').innerHTML='<tr><td colspan=\"6\">Bestellingen konden niet worden geladen.</td></tr>'}setConnection(auxiliary.some(result=>result.error)?'Gegevens geladen · enkele modules niet beschikbaar':'Verbonden met FitConnect Database')}"
new_load = "async function loadAll(){setConnection('Gegevens synchroniseren…');const [su,c,ic,e,t,s]=await Promise.all([client.from('suppliers').select('*').order('name'),client.from('profiles').select('id,full_name,role,phone,company_name,address_line1,postal_code,city,country_code,created_at').order('created_at',{ascending:false}),client.from('invoice_customers').select('*').order('updated_at',{ascending:false}),client.from('customer_equipment').select('*,profiles(full_name),products(name)').order('created_at',{ascending:false}),client.from('training_plans').select('*').order('created_at',{ascending:false}),client.from('service_requests').select('*,profiles(full_name)').order('created_at',{ascending:false})]);const auxiliary=[su,c,ic,e,t,s];auxiliary.filter(result=>result.error).forEach(result=>console.error('Command Center module unavailable',result.error));suppliers=su.error?[]:su.data||[];customers=[...(c.error?[]:c.data||[]),...(ic.error?[]:(ic.data||[]).map(x=>({...x,full_name:x.company_name||x.contact_name,role:'invoice_customer',address_line1:x.address})))];equipment=e.error?[]:e.data||[];trainingPlans=t.error?[]:t.data||[];serviceRequests=s.error?[]:s.data||[];renderAll();try{await loadOrders()}catch(error){console.error('Orders unavailable',error);$('#orderRows').innerHTML='<tr><td colspan=\"6\">Bestellingen konden niet worden geladen.</td></tr>'}setConnection(auxiliary.some(result=>result.error)?'Gegevens geladen · enkele modules niet beschikbaar':'Verbonden met FitConnect Database')}"
if old_load not in text:
    raise SystemExit('Expected loadAll block not found; refusing unsafe migration')
text = text.replace(old_load, new_load, 1)

# Helper: remove a top-level function declaration by balanced braces.
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
    escape = False
    template_depth = 0
    i = brace
    while i < len(source):
        ch = source[i]
        if quote:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote and template_depth == 0:
                quote = None
            elif quote == '`' and ch == '$' and i + 1 < len(source) and source[i+1] == '{':
                template_depth += 1
                i += 1
            elif quote == '`' and ch == '}' and template_depth:
                template_depth -= 1
        else:
            if ch in ('\"', "'", '`'):
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return source[:start] + source[i+1:]
        i += 1
    raise SystemExit(f'Unclosed function {name}')

for function_name in ('syncBrandOptions', 'renderBrands', 'editBrand'):
    text = remove_function(text, function_name)

# Remove direct legacy brand form and brand UI handlers while preserving unrelated bindings.
patterns = [
    r"\$\('#brandForm'\)\?\.addEventListener\('submit',[\s\S]*?\}\);",
    r"\$\('#newBrand'\)\?\.addEventListener\('click',[\s\S]*?\);",
    r"\$\('#clearBrand'\)\?\.addEventListener\('click',[\s\S]*?\);",
    r"\$\('#brandSearch'\)\?\.addEventListener\('input',[\s\S]*?\);",
    r"\$\('#brandStatusFilter'\)\?\.addEventListener\('change',[\s\S]*?\);"
]
for pattern in patterns:
    text = re.sub(pattern, '', text, count=1)

# Remove legacy calls from renderAll only, keeping all other renderers intact.
text = text.replace('renderBrands();', '')
text = text.replace('syncBrandOptions();', '')

if text == original:
    raise SystemExit('No changes made; refusing empty migration')

# Safety gates before writing.
for forbidden in ["from('brands')", 'let brands=[]', 'function renderBrands(', 'function editBrand(', 'function syncBrandOptions(']:
    if forbidden in text:
        raise SystemExit(f'Legacy token remains: {forbidden}')
for required in ["from('suppliers')", 'function renderSuppliers(', 'renderAll();', "$('#logoutButton')"]:
    if required not in text:
        raise SystemExit(f'Required non-Brand behavior missing: {required}')

path.write_text(text)
print('PR108 Brands legacy removal completed safely')
