(() => {
  'use strict';

  const registry = window.FitConnectRegistry;
  if (!registry) return;

  function parse(text, delimiter = ',') {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const source = String(text);

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1];

      if (character === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === delimiter && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && next === '\n') index += 1;
        row.push(cell);
        cell = '';
        if (row.some((value) => value !== '')) rows.push(row);
        row = [];
      } else {
        cell += character;
      }
    }

    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
    if (!rows.length) return { headers: [], rows: [] };

    const headers = rows.shift().map((value) => value.trim());
    return {
      headers,
      rows: rows.map((values) => Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? '']),
      )),
    };
  }

  function mapRows(parsed, mapping = {}) {
    return parsed.rows.map((row) => Object.fromEntries(
      Object.entries(mapping)
        .filter(([, target]) => target)
        .map(([source, target]) => [target, row[source]]),
    ));
  }

  async function execute(entity, records, { stopOnError = false } = {}) {
    const services = {
      contacts: window.FitConnectContactService,
      companies: window.FitConnectCompanyService,
      leads: window.FitConnectLeadService,
    };
    const service = services[entity];
    if (!service) throw new Error('Onbekende importentiteit');

    const result = { entity, total: records.length, created: 0, failed: 0, errors: [] };
    for (let index = 0; index < records.length; index += 1) {
      try {
        await service.create(records[index]);
        result.created += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({ row: index + 2, message: error.message });
        if (stopOnError) break;
      }
    }

    registry.emit('crm:csv-imported', result);
    return result;
  }

  const api = Object.freeze({ parse, mapRows, execute, version: '1.0.0' });
  registry.register('crm.csvImport', api, { replace: true, meta: { type: 'crm-service', version: api.version } });
  window.FitConnectCSVImport = api;
})();