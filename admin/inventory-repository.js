(()=>{
  'use strict';
  class InventoryRepository{
    constructor(persistenceAdapter){if(!persistenceAdapter)throw new TypeError('PersistenceAdapter is verplicht.');this.adapter=persistenceAdapter;}
    async getStockLevel(productId){return this.mapToDomain(await this.adapter.readRawStock(productId));}
    async saveStockLevel(productId,domainModel){return this.mapToDomain(await this.adapter.writeRawStock(productId,domainModel.available));}
    mapToDomain(record){const freeze=window.FitConnectDeepFreeze||Object.freeze;return freeze({productId:record.id,available:Number(record.stock||0),reserved:0,incoming:0,damaged:0,quarantine:0,allocated:0,warehouseId:'wh-central-01',status:record.status||'active'});}
    async logMutation(){throw new Error('Not implemented');}
    async listStockMutations(){throw new Error('Not implemented');}
    async reserveStock(){throw new Error('Not implemented');}
    async releaseStock(){throw new Error('Not implemented');}
  }
  window.InventoryRepository=InventoryRepository;
})();
