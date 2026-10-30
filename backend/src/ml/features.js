const NUMERIC_FEATURES = [
  'order_value', 'num_items',   'customer_prior_orders', 'customer_prior_rto',
  'order_hour', 'weekday', 'is_weekend', 'name_length', 'name_tokens',
  'name_suspicious', 'phone_valid', 'address_length', 'address_tokens',
  'address_short', 'address_has_landmark', 'pincode_missing', 'city_missing'
];
const CATEGORICAL_FEATURES = ['city', 'state', 'utm_source', 'courier', 'pincode_prefix'];
const SUSPICIOUS_NAMES = new Set([
  'asdf', 'test', 'testing', 'unknown', 'na', 'n/a', 'none', 'xxx', 'qwerty',
  'dummy', 'fake', 'customer', 'test user', 'test order', 'abc', 'aaa', 'aaaa'
]);
const LANDMARK = /near|opp|opposite|mandir|temple|school|chowk|market|bank|masjid|hospital|bus stop|ke paas|saamne|samne|railway|metro|petrol pump|gali|street/i;
const digits = (value) => String(value ?? '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function dateParts(value) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return { hour: null, weekday: null };
  const [, year, month, day, hour] = match;
  const weekday = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
  return { hour: hour === undefined ? null : Number(hour), weekday: (weekday + 6) % 7 };
}

export function extractFeatures(row) {
  const name = String(row.customer_name ?? '').trim();
  const address = String(row.address ?? '').trim();
  const phone = digits(row.phone);
  const pincode = asNumber(row.pincode);
  const { hour, weekday } = dateParts(row.order_datetime);
  const pin = pincode === null ? '' : String(Math.trunc(pincode)).padStart(6, '0');
  const values = {
    order_value: asNumber(row.order_value),
    num_items: asNumber(row.num_items),
    customer_prior_orders: asNumber(row.customer_prior_orders),
    customer_prior_rto: asNumber(row.customer_prior_rto),
    order_hour: hour,
    weekday,
    is_weekend: weekday === null ? null : Number(weekday >= 5),
    name_length: name.length,
    name_tokens: name ? name.split(/\s+/).length : 0,
    name_suspicious: Number(SUSPICIOUS_NAMES.has(name.toLowerCase())),
    phone_valid: Number(/^[6-9]\d{9}$/.test(phone)),
    address_length: address.length,
    address_tokens: address ? address.split(/\s+/).length : 0,
    address_short: Number(address.length < 15),
    address_has_landmark: Number(LANDMARK.test(address)),
    pincode_missing: Number(pincode === null),
    city_missing: Number(!String(row.city ?? '').trim()),
    city: String(row.city ?? '').trim() || 'Unknown',
    state: String(row.state ?? '').trim() || 'Unknown',
    utm_source: String(row.utm_source ?? '').trim() || 'Unknown',
    courier: String(row.courier ?? '').trim() || 'Unknown',
    pincode_prefix: pin ? pin.slice(0, 3) : 'Unknown'
  };
  return values;
}

export class FeatureEncoder {
  fit(rows) {
    const frames = rows.map(extractFeatures);
    this.numericStats = {};
    for (const key of NUMERIC_FEATURES) {
      const values = frames.map((frame) => frame[key]).filter((value) => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
      const median = values.length ? values[Math.floor(values.length / 2)] : 0;
      const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      const variance = values.length ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length : 0;
      this.numericStats[key] = { median, mean, std: Math.sqrt(variance) || 1 };
    }
    this.categories = {};
    for (const key of CATEGORICAL_FEATURES) {
      const counts = new Map();
      frames.forEach((frame) => counts.set(frame[key], (counts.get(frame[key]) || 0) + 1));
      this.categories[key] = ['Unknown', ...Array.from(counts.entries())
        .filter(([value, count]) => value !== 'Unknown' && count >= 3)
        .map(([value]) => value).sort()];
    }
    this.featureNames = [
      ...NUMERIC_FEATURES,
      ...CATEGORICAL_FEATURES.flatMap((key) => this.categories[key].map((value) => `${key}=${value}`))
    ];
    return this;
  }

  transform(row) {
    const frame = extractFeatures(row);
    const vector = [];
    for (const key of NUMERIC_FEATURES) {
      const stat = this.numericStats[key];
      const value = frame[key] === null ? stat.median : frame[key];
      vector.push((value - stat.mean) / stat.std);
    }
    for (const key of CATEGORICAL_FEATURES) {
      const value = this.categories[key].includes(frame[key]) ? frame[key] : 'Unknown';
      for (const category of this.categories[key]) vector.push(Number(category === value));
    }
    return vector;
  }

  transformMany(rows) { return rows.map((row) => this.transform(row)); }
}

export { NUMERIC_FEATURES, CATEGORICAL_FEATURES, SUSPICIOUS_NAMES, LANDMARK, digits };
