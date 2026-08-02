(()=>{'use strict';
const cfg=window.OrderConfig,client=window.getFitConnectSupabase?.();
if(!cfg||!client||!window.OrderRepository||!window.OrderService||!window.OrderStore)return;
const repository=new window.OrderRepository(client);const store=window.orderStore=window.orderStore||new window.OrderStore(new window.OrderService(repository));
function markRows(orders=[]){const index=new Map(orders.map(order=>[String(order.id),order]));document.querySelectorAll('#orderRows [data-manage-order]').forEach(button=>{const order=index.get(String(button.dataset.manageOrder));const row=button.closest('tr');if(!row||!order)return;row.dataset.orderId=order.id;row.dataset.orderStatus=order.orderStatus;row.dataset.paymentStatus=order.paymentStatus})}
function markDetail(order){const detail=document.getElementById('orderAdminDetail');if(!detail||!order)return;detail.dataset.orderId=order.id;detail.dataset.orderStatus=order.orderStatus;detail.dataset.paymentStatus=order.paymentStatus}
window.addEventListener(cfg.events.loaded,event=>markRows(event.detail?.orders||store.getSnapshot().orders));
window.addEventListener(cfg.events.saved,event=>{const order=event.detail?.order;if(order){markRows(store.getSnapshot().orders);markDetail(order)}});
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-manage-order]');if(!button)return;const order=store.select(button.dataset.manageOrder);queueMicrotask(()=>markDetail(order))},true);
window.addEventListener('fitconnect:order-refresh-requested',()=>store.load().catch(error=>window.fitConnectToast?.(error.message||'Bestellingen laden mislukt.')));
window.FitConnectOrderV1Bridge=Object.freeze({store,repository,refresh:()=>store.load()});
store.load().catch(error=>console.warn('[FDMP Order] Passieve hydration mislukt.',error));
})();