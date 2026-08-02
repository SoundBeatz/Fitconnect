(()=>{
  'use strict';
  class InventoryPersistenceAdapter{
    constructor(supabaseClient){if(!supabaseClient)throw new TypeError('Supabase client is verplicht.');this.client=supabaseClient;}
    async readRawStock(productId){const {data,error}=await this.client.from('products').select('id,stock,status').eq('id',productId).single();if(error)throw error;return data;}
    async writeRawStock(productId,availableAmount){const amount=Number(availableAmount);const {data,error}=await this.client.from('products').update({stock:amount,updated_at:new Date().toISOString()}).eq('id',productId).select('id,stock,status').single();if(error)throw error;return data;}
  }
  window.InventoryPersistenceAdapter=InventoryPersistenceAdapter;
})();
