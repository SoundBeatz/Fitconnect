(() => {
  'use strict';

  const registry = window.FitConnectRegistry;
  const products = window.FitConnectProductService;
  const notifications = window.FitConnectNotifications;
  if (!registry || !products) return;

  const selectedIds = (root) => [...root.querySelectorAll('[data-product-select]:checked')]
    .map((input) => input.value);

  async function run(action, selected, value) {
    for (const id of selected) {
      if (action === 'archive') await products.archive(id);
      else if (action === 'restore') await products.restore(id);
      else if (action === 'status') await products.update(id, { status: value });
      else if (action === 'category') await products.update(id, { category_id: value });
      else if (action === 'price-percent') {
        const product = await products.get(id, { includeArchived: true });
        const factor = 1 + Number(value || 0) / 100;
        await products.update(id, { price: Number(product.price || 0) * factor });
      }
    }
  }

  function mount(root = document) {
    root.querySelectorAll('[data-fc-product-bulk]').forEach((element) => {
      if (element.dataset.mounted) return;
      element.dataset.mounted = 'true';
      element.addEventListener('click', async (event) => {
        const action = event.target.dataset.productBulkAction;
        if (!action) return;

        const selected = selectedIds(document);
        const value = element.querySelector('[data-bulk-value]')?.value;
        if (!selected.length) {
          notifications?.warning?.('Selecteer eerst producten');
          return;
        }

        try {
          await run(action, selected, value);
          notifications?.success?.(`${selected.length} producten bijgewerkt`);
          registry.emit('catalog:bulk-complete', { action, ids: selected });
        } catch (error) {
          notifications?.error?.(error.message);
        }
      });
    });
  }

  const api = Object.freeze({ mount, run, version: '1.0.0' });
  registry.register('catalog.bulk', api, { replace: true });
  window.FitConnectProductBulk = api;
})();