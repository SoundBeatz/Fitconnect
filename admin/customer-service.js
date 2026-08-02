(()=>{'use strict';
const cfg=window.CustomerConfig;
const clean=(value,max)=>String(value??'').trim().slice(0,max);
class CustomerService{
  #repository;#before=new Map();#after=new Map();
  constructor(repository){if(!repository)throw new Error('CustomerService requires repository');this.#repository=repository}
  onBefore(action,handler){this.#register(this.#before,action,handler);return()=>this.#remove(this.#before,action,handler)}
  onAfter(action,handler){this.#register(this.#after,action,handler);return()=>this.#remove(this.#after,action,handler)}
  #register(map,action,handler){if(typeof handler!=='function')throw new TypeError('Lifecycle hook must be a function');const list=map.get(action)||[];list.push(handler);map.set(action,list)}
  #remove(map,action,handler){map.set(action,(map.get(action)||[]).filter(item=>item!==handler))}
  async #run(map,action,payload){let current=payload;for(const handler of map.get(action)||[])current=(await handler(current))??current;return current}
  normalize(input){
    const address=input.address||{};const fiscal=input.fiscal||{};
    return Object.freeze({...input,fullName:clean(input.fullName,cfg.limits.name),companyName:clean(input.companyName,cfg.limits.companyName),contactName:clean(input.contactName,cfg.limits.name),email:clean(input.email,cfg.limits.email).toLowerCase(),phone:clean(input.phone,cfg.limits.phone),address:Object.freeze({line1:clean(address.line1,cfg.limits.addressLine),postalCode:clean(address.postalCode,cfg.limits.postalCode).toUpperCase(),city:clean(address.city,cfg.limits.city),countryCode:clean(address.countryCode||cfg.fiscal.defaultCountryCode,cfg.limits.countryCode).toUpperCase()}),fiscal:Object.freeze({vatNumber:clean(fiscal.vatNumber,cfg.limits.vatNumber).toUpperCase(),kvkNumber:clean(fiscal.kvkNumber,cfg.limits.kvkNumber)})});
  }
  validate(customer){
    if(!customer.fullName&&!customer.companyName)throw new Error('Customer name or company name is required');
    if(customer.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))throw new Error('Invalid customer email');
    if(customer.discountPercent!=null&&(Number(customer.discountPercent)<0||Number(customer.discountPercent)>100))throw new Error('Discount must be between 0 and 100');
    return customer;
  }
  async list(context={}){let args=await this.#run(this.#before,'list',context);const customers=await this.#repository.list(args);return this.#run(this.#after,'list',customers)}
  async saveInvoiceCustomer(input,context){let customer=this.validate(this.normalize(input));customer=await this.#run(this.#before,'save',customer);const saved=await this.#repository.saveInvoiceCustomer(customer,context);return this.#run(this.#after,'save',saved)}
  createFiscalSnapshot(input){return this.#repository.createFiscalSnapshot(this.validate(this.normalize(input)))}
}
window.CustomerService=CustomerService;
})();