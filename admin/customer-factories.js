(()=>{'use strict';
const text=value=>String(value??'');
const CustomerCardFactory={
  createRow(customer){
    const row=document.createElement('tr');
    row.dataset.customerRow=customer.id;
    row.className=`customer-row role-${text(customer.role||'customer').replace(/[^a-z0-9_-]/gi,'-')}`;
    const nameCell=document.createElement('td');
    const strong=document.createElement('strong');
    strong.className='customer-name';
    strong.textContent=customer.fullName||customer.companyName||'Naam ontbreekt';
    nameCell.appendChild(strong);
    const phoneCell=document.createElement('td');
    phoneCell.textContent=customer.phone||'-';
    const roleCell=document.createElement('td');
    roleCell.textContent=customer.isB2BInvoiceOnly?'invoice_customer':customer.role||'customer';
    row.append(nameCell,phoneCell,roleCell);
    return row;
  },
  createEmptyRow(message='Nog geen klanten.'){
    const row=document.createElement('tr');
    const cell=document.createElement('td');
    cell.colSpan=3;
    cell.textContent=message;
    row.appendChild(cell);
    return row;
  },
  createLoadingRow(){return this.createEmptyRow('Klantengegevens synchroniseren via FDMP v2...')}
};
const field=(form,selector)=>form.querySelector(selector);
const set=(form,selector,value)=>{const input=field(form,selector);if(input)input.value=value??''};
const read=(form,selector)=>field(form,selector)?.value?.trim?.()||'';
const CustomerFormFactory={
  populate(form,customer){
    form.dataset.customerId=customer.id;
    set(form,'[data-customer-name]',customer.fullName);
    set(form,'[data-customer-company]',customer.companyName);
    set(form,'[data-customer-contact]',customer.contactName);
    set(form,'[data-customer-email]',customer.email);
    set(form,'[data-customer-phone]',customer.phone);
    set(form,'[data-customer-address]',customer.address?.line1);
    set(form,'[data-customer-zip]',customer.address?.postalCode);
    set(form,'[data-customer-city]',customer.address?.city);
    set(form,'[data-customer-country]',customer.address?.countryCode);
    set(form,'[data-customer-vat]',customer.fiscal?.vatNumber);
    set(form,'[data-customer-kvk]',customer.fiscal?.kvkNumber);
  },
  serialize(form,customer={}){
    return {...customer,
      fullName:read(form,'[data-customer-name]'),companyName:read(form,'[data-customer-company]'),
      contactName:read(form,'[data-customer-contact]'),email:read(form,'[data-customer-email]'),phone:read(form,'[data-customer-phone]'),
      address:{...(customer.address||{}),line1:read(form,'[data-customer-address]'),postalCode:read(form,'[data-customer-zip]'),city:read(form,'[data-customer-city]'),countryCode:read(form,'[data-customer-country]')||'NL'},
      fiscal:{...(customer.fiscal||{}),vatNumber:read(form,'[data-customer-vat]'),kvkNumber:read(form,'[data-customer-kvk]')}
    };
  },
  rollback(form,snapshot){if(snapshot)this.populate(form,snapshot)}
};
window.CustomerCardFactory=Object.freeze(CustomerCardFactory);
window.CustomerFormFactory=Object.freeze(CustomerFormFactory);
})();