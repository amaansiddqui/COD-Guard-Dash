import fs from 'node:fs';

// Small RFC-4180-style parser; handles quoted commas, escaped quotes and newlines.
export function parseCsvText(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((value) => value !== '')) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

export function readCsv(filePath) {
  return parseCsvText(fs.readFileSync(filePath, 'utf8'));
}

export function normalizeOrders(rows) {
  const cleaned = [];
  for (const source of rows) {
    const row = { ...source };
    row.order_id = String(row.order_id ?? '').trim();
    row.order_datetime = String(row.order_datetime ?? '').trim();
    row.customer_name = String(row.customer_name ?? '').trim();
    row.phone = String(row.phone ?? '').trim();
    row.address = String(row.address ?? '').trim();
    row.city = String(row.city ?? '').trim();
    row.state = String(row.state ?? '').trim();
    row.utm_source = String(row.utm_source ?? '').trim();
    row.courier = String(row.courier ?? '').trim();
    row.payment_method = String(row.payment_method || 'COD').trim().toUpperCase();
    row.final_status = String(row.final_status ?? '').trim().toUpperCase();
    for (const key of ['order_value', 'num_items', 'customer_prior_orders', 'customer_prior_rto', 'pincode']) {
      const value = Number(row[key]);
      row[key] = Number.isFinite(value) ? value : null;
    }
    if (!['DELIVERED', 'RTO'].includes(row.final_status)) continue;
    if (!/^\d{4}-\d{2}-\d{2}/.test(row.order_datetime)) continue;
    row.status_norm = row.final_status;
    row.target_rto = row.final_status === 'RTO' ? 1 : 0;
    cleaned.push(row);
  }
  return cleaned.sort((a, b) => a.order_datetime.localeCompare(b.order_datetime));
}
