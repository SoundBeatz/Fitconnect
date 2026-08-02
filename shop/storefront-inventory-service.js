(()=>{
  'use strict';
  class StorefrontInventoryService{
    constructor(repository,{lowStockThreshold=5}={}){if(!repository)throw new TypeError('Inventory repository is verplicht.');this.repository=repository;this.lowStockThreshold=Math.max(0,Number(lowStockThreshold||5));this.AVAILABILITY_ENUM=Object.freeze({IN_STOCK:'IN_STOCK',LOW_STOCK:'LOW_STOCK',OUT_OF_STOCK:'OUT_OF_STOCK'});}
    async getAvailability(productId){const raw=await this.repository.getPublicStock(productId);let availability=this.AVAILABILITY_ENUM.OUT_OF_STOCK;if(raw.rawQuantity>this.lowStockThreshold)availability=this.AVAILABILITY_ENUM.IN_STOCK;else if(raw.rawQuantity>0)availability=this.AVAILABILITY_ENUM.LOW_STOCK;return (window.FitConnectDeepFreeze||Object.freeze)({productId:raw.productId,availability,canOrder:raw.rawQuantity>0&&raw.isProductActive});}
  }
  window.StorefrontInventoryService=StorefrontInventoryService;
})();
