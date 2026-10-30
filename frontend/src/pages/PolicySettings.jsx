import { useEffect, useState } from 'react';
import { Save, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { api } from '../services/api.js';

const groups = [
  { title: 'Decision thresholds', description: 'Change how predicted RTO risk is routed. Values are percentages.', fields: [
    ['ship_max_risk', 'Ship as-is below', 'Risk below this value moves directly to normal COD fulfilment.', 0, 1, 0.01, true],
    ['confirm_max_risk', 'Confirmation threshold', 'Risk from the ship threshold up to this value requires YES/NO confirmation.', 0, 1, 0.01, true],
    ['hold_risk_returning', 'Returning-customer hold threshold', 'Higher-risk repeat buyers are sent to manual review.', 0, 1, 0.01, true],
    ['hold_risk_first_time', 'First-time buyer hold threshold', 'Keep a higher threshold for new buyers to protect acquisition.', 0, 1, 0.01, true]
  ]},
  { title: 'WhatsApp and prepaid assumptions', description: 'Planning assumptions only. Update them when real response and conversion data is available.', fields: [
    ['confirmation_response_rate', 'Confirmation response rate', 'Share of customers expected to reply.', 0, 1, 0.01, true],
    ['confirmation_rto_reduction', 'RTO risk reduction after YES', 'Expected relative reduction in RTO risk among confirmers.', 0, 1, 0.01, true],
    ['prepaid_conversion_rate', 'Prepaid conversion rate', 'Expected share accepting the prepaid offer.', 0, 1, 0.01, true],
    ['prepaid_rto_rate', 'Prepaid RTO baseline', 'Assignment states prepaid orders have about 4% RTO.', 0, 1, 0.01, true],
    ['prepaid_discount', 'Prepaid discount (₹)', 'Flat discount offered to convert COD to prepaid.', 0, 200, 1, false]
  ]},
  { title: 'Unit economics', description: 'Used by the dashboard to estimate the cost of RTO and the impact of decisions.', fields: [
    ['average_order_value', 'Average order value (₹)', 'Assignment baseline: ₹649.', 1, 10000, 1, false],
    ['gross_margin_rate', 'Gross margin rate', 'Assignment baseline: 62%.', 0, 1, 0.01, true],
    ['new_customer_cac', 'New customer acquisition cost (₹)', 'Reported separately as CAC exposure, not double-counted as a sunk cost.', 0, 5000, 1, false],
    ['forward_shipping', 'Forward shipping (₹)', 'Cost to ship an order to the customer.', 0, 1000, 1, false],
    ['return_shipping', 'Return shipping (₹)', 'Cost to bring an RTO parcel back.', 0, 1000, 1, false],
    ['packaging_handling', 'Packaging + handling (₹)', 'Cost per returned order.', 0, 1000, 1, false],
    ['damage_rate', 'Returned-product damage rate', 'Share of returned items assumed unsellable.', 0, 1, 0.01, true],
    ['returned_product_cost', 'Average product cost (₹)', 'Cost of goods lost when the returned product is damaged.', 0, 5000, 1, false]
  ]}
];
const defaults = { ship_max_risk: .25, confirm_max_risk: .45, hold_risk_returning: .72, hold_risk_first_time: .88, confirmation_response_rate: .7, confirmation_rto_reduction: .5, prepaid_conversion_rate: .35, prepaid_rto_rate: .04, prepaid_discount: 20, average_order_value: 649, gross_margin_rate: .62, new_customer_cac: 300, forward_shipping: 65, return_shipping: 65, packaging_handling: 25, damage_rate: .08, returned_product_cost: 180 };

export default function PolicySettings({ onSaved }) {
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/policy').then(setValues).catch((err) => setError(err.message)); }, []);
  const update = (key, value) => setValues((current) => ({ ...current, [key]: Number(value) }));
  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try { const saved = await api('/policy', { method: 'PUT', body: JSON.stringify(values) }); setValues(saved); setMessage('Policy saved. Dashboard estimates have been recalculated.'); onSaved?.(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  if (!values) return <div className="loading-card">Loading policy settings...</div>;
  return <div className="page-stack">
    <div className="page-heading-row"><div><div className="eyebrow">OPERATIONS CONTROLS / CONFIGURATION</div><h1>Policy settings</h1><p className="page-subtitle">Tune thresholds and business assumptions without editing source code. All probability fields use 0 to 1 internally.</p></div><div className="step-pill"><SlidersHorizontal size={16} /> Editable controls</div></div>
    <div className="notice-bar"><SlidersHorizontal size={17} /><span><b>Recommended starting point:</b> Keep first-time buyers protected by setting their hold threshold higher than repeat buyers. Use manual review instead of blanket city/pincode blocks.</span></div>
    {groups.map((group) => <section className="panel policy-panel" key={group.title}><div className="panel-heading"><div><h2>{group.title}</h2><p>{group.description}</p></div></div><div className="policy-grid">{group.fields.map(([key, label, help, min, max, step, percent]) => <div className="policy-field" key={key}><div className="policy-label-row"><label htmlFor={key}>{label}</label><b>{percent ? `${(Number(values[key]) * 100).toFixed(0)}%` : key.includes('discount') || key.includes('cost') || key.includes('value') || key.includes('cac') || key.includes('shipping') || key.includes('handling') || key.includes('product_cost') ? `₹${Number(values[key]).toLocaleString('en-IN')}` : values[key]}</b></div><input id={key} type="range" min={min} max={max} step={step} value={values[key]} onChange={(event) => update(key, event.target.value)} /><p>{help}</p></div>)}</div></section>)}
    <div className="policy-footer"><button className="secondary-button" onClick={() => setValues(defaults)}><RotateCcw size={15} /> Reset to assignment defaults</button><button className="primary-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save policy'}</button></div>
    {message && <div className="success-banner">{message}</div>}{error && <div className="error-banner">{error}</div>}
  </div>;
}
