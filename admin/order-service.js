(()=>{'use strict';
const freeze=value=>(window.FitConnectDeepFreeze||window.deepFreeze||window.DeepFreeze||Object.freeze)(value);
class OrderService{
  constructor(repository,hooks={}){if(!repository)throw new TypeError('OrderRepository is verplicht.');this.repository=repository;this.hooks=freeze({beforeLoad:hooks.beforeLoad||null,afterLoad:hooks.afterLoad||null,beforeUpdate:hooks.beforeUpdate||null,afterUpdate:hooks.afterUpdate||null})}
  async list(){await this.hooks.beforeLoad?.();const orders=await this.repository.list();await this.hooks.afterLoad?.(orders);return orders}
  validateTransition(current,next){if(!window.OrderConfig.statuses.includes(next))throw new RangeError(`Ongeldige orderstatus: ${next}`);if(current===next)return true;const allowed=window.OrderConfig.transitions[current]||[];if(!allowed.includes(next))throw new Error(`Statusovergang ${current} → ${next} is niet toegestaan.`);return true}
  validateTracking(command){if(command.orderStatus==='shipped'){if(!command.tracking?.carrier?.trim()||!command.tracking?.code?.trim())throw new Error('Vervoerder en Track & Trace-code zijn verplicht bij verzending.');if(command.tracking?.url&&!/^https:\/\//i.test(command.tracking.url))throw new Error('Track & Trace-link moet HTTPS gebruiken.')}return true}
  normalizeCommand(current,changes={}){const command=freeze({id:current.id,orderStatus:String(changes.orderStatus||current.orderStatus),tracking:freeze({carrier:String(changes.tracking?.carrier??current.tracking?.carrier??'').trim(),code:String(changes.tracking?.code??current.tracking?.code??'').trim(),url:String(changes.tracking?.url??current.tracking?.url??'').trim()}),source:'admin-command-center'});this.validateTransition(current.orderStatus,command.orderStatus);this.validateTracking(command);return command}
  async update(current,changes){const command=this.normalizeCommand(current,changes);await this.hooks.beforeUpdate?.(command,current);const result=await this.repository.update(command);await this.hooks.afterUpdate?.(result,current);return result}
  isPaid(order){return order?.paymentStatus==='paid'}
}
window.OrderService=OrderService;
})();