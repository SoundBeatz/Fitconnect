(()=>{'use strict';
const cfg=window.AddressConfig;
class AddressService{
  #repository;
  #hooks;
  constructor(repository=new window.AddressRepository(),hooks={}){this.#repository=repository;this.#hooks={beforeNormalize:hooks.beforeNormalize||null,afterNormalize:hooks.afterNormalize||null,beforeSnapshot:hooks.beforeSnapshot||null,afterSnapshot:hooks.afterSnapshot||null}}
  normalize(record,context={}){this.#hooks.beforeNormalize?.(record,context);const model=this.#repository.mapToDomain(record,context);this.validate(model);this.#hooks.afterNormalize?.(model,context);return model}
  validate(model){if(!model.addressLine1)throw new Error('Adresregel is verplicht');if(!model.city)throw new Error('Plaats is verplicht');if(!model.countryCode||model.countryCode.length!==2)throw new Error('Landcode moet ISO-2 zijn');const pattern=cfg.postalPatterns[model.countryCode];if(pattern&&model.postalCode&&!pattern.test(model.postalCode))throw new Error(`Ongeldige postcode voor ${model.countryCode}`);return true}
  createSnapshot(model,context={}){this.validate(model);this.#hooks.beforeSnapshot?.(model,context);const snapshot=this.#repository.createAddressSnapshot(model,context);this.#hooks.afterSnapshot?.(snapshot,context);return snapshot}
}
window.AddressService=AddressService;
})();