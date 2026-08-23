(()=>{'use strict';
const cfg=window.InvoiceConfig;
const freeze=value=>(window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class InvoiceRepository{
  constructor(client){if(!client)throw new TypeError('Supabase client is verplicht.');this.client=client}
  map(record={}){return freeze({...record,line_snapshot:freeze([...(record.line_snapshot||[])]),customer_snapshot:freeze({...record.customer_snapshot}),supplier_snapshot:freeze({...record.supplier_snapshot}),billing_address_snapshot:record.billing_address_snapshot?freeze({...record.billing_address_snapshot}):null})}
  async resolveOrganizationId(){
    const {data:{user},error:userError}=await this.client.auth.getUser();
    if(userError||!user)throw userError||new Error('Sessie verlopen');
    const {data:profile,error:profileError}=await this.client
      .from('profiles')
      .select('organization_id')
      .eq('id',user.id)
      .maybeSingle();
    if(profileError)throw profileError;
    if(profile?.organization_id)return profile.organization_id;
    throw new Error('Geen actieve FitConnect-organisatie gevonden voor dit account');
  }
  async list(organizationId){const {data,error}=await this.client.from('commerce_invoices').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false});if(error)throw error;return freeze((data||[]).map(record=>this.map(record)))}
  createBillingSnapshot(address,context={}){const repository=new window.AddressRepository();const model=address?.addressLine1?address:repository.mapToDomain(address,context);return repository.createAddressSnapshot(model,context)}
  async createDraft(payload){return this.#rpc(cfg.rpc.createDraft,payload)}
  async updateDraft(payload){return this.#rpc(cfg.rpc.updateDraft,payload)}
  async issue(payload){return this.#rpc(cfg.rpc.issue,payload)}
  async createSnapshot(payload){return this.#rpc(cfg.rpc.createSnapshot,payload)}
  async registerPayment(payload){return this.#rpc(cfg.rpc.registerPayment,payload)}
  async #rpc(name,payload){const {data,error}=await this.client.rpc(name,payload);if(error)throw error;return Array.isArray(data)?freeze(data.map(record=>this.map(record))):this.map(data||{})}
}
window.InvoiceRepository=InvoiceRepository;
})();