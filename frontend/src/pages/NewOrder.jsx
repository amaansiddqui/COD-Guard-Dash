import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import DecisionBadge from '../components/DecisionBadge.jsx';
import { api } from '../services/api.js';

const blank = {
  order_id: '', order_datetime: '2026-10-30 12:30', customer_name: '', phone: '', address: '',
  city: '', state: '', pincode: '', order_value: 649, items: 'Rice Water Shampoo Bar', num_items: 1,
  customer_prior_orders: 0, customer_prior_rto: 0, utm_source: 'meta_ads', courier: 'Delhivery', language: 'hinglish'
};

export default function NewOrder({ onSessionCreated, onDecisionSaved }) {
  const [form, setForm] = useState(blank);
  const [useAi, setUseAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/sample-order').then((sample) => setForm((current) => ({ ...current, ...sample }))).catch(() => {}); }, []);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSubmitting(true); setError(''); setResult(null);
    try {
      const response = await api('/decisions', { method: 'POST', body: JSON.stringify({ ...form, use_ai_review: useAi }) });
      setResult(response); onDecisionSaved?.();
      if (response.whatsapp_session) onSessionCreated?.(response.whatsapp_session);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };
  return <div className="page-stack">
    <div className="page-heading-row"><div><div className="eyebrow">ORDER INTAKE / LIVE DECISION</div><h1>Score a new COD order</h1><p className="page-subtitle">Enter the details available before dispatch. The model returns a risk score, action, and a reason an operations teammate can understand.</p></div><div className="step-pill"><span>01</span> Decision engine</div></div>
    <div className="form-layout">
      <form className="panel order-form" onSubmit={submit}>
        <div className="form-section-title"><span className="section-number">1</span><div><h2>Customer & delivery</h2><p>Customer identity, contact and address routing details.</p></div></div>
        <div className="form-grid">
          <Field label="Order ID" name="order_id" value={form.order_id} onChange={change} placeholder="Auto-generated if empty" />
          <Field label="Customer name *" name="customer_name" value={form.customer_name} onChange={change} required />
          <Field label="Phone number *" name="phone" value={form.phone} onChange={change} required placeholder="10-digit mobile number" />
          <Field label="Pincode" name="pincode" value={form.pincode ?? ''} onChange={change} />
          <Field label="City *" name="city" value={form.city} onChange={change} required />
          <Field label="State" name="state" value={form.state} onChange={change} />
          <div className="field full"><label>Delivery address *</label><textarea name="address" value={form.address} onChange={change} rows="3" required placeholder="House / street / area / landmark" /></div>
        </div>
        <div className="form-section-title second"><span className="section-number">2</span><div><h2>Order & customer history</h2><p>Signals from checkout and past orders.</p></div></div>
        <div className="form-grid">
          <Field label="Order value (₹)" name="order_value" type="number" value={form.order_value} onChange={change} min="1" />
                    <Field label="Item name *" name="item_name" value={form.item_name} onChange={change} required />

          <Field label="Number of items" name="num_items" type="number" value={form.num_items} onChange={change} min="1" />
          <Field label="Previous orders" name="customer_prior_orders" type="number" value={form.customer_prior_orders} onChange={change} min="0" />
          <Field label="Previous RTOs" name="customer_prior_rto" type="number" value={form.customer_prior_rto} onChange={change} min="0" />
          <div className="field"><label>Acquisition source</label><select name="utm_source" value={form.utm_source} onChange={change}><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="direct">Direct</option><option value="instagram_organic">Instagram organic</option><option value="referral">Referral</option></select></div>
          <div className="field"><label>Courier</label><select name="courier" value={form.courier} onChange={change}><option>Delhivery</option><option>BlueDart</option><option>Xpressbees</option><option>DTDC</option><option>Unassigned</option></select></div>
          <div className="field"><label>WhatsApp language</label><select name="language" value={form.language} onChange={change}><option value="hinglish">Hinglish</option><option value="english">English</option><option value="hindi">Hindi</option></select></div>
        </div>
        <label className="toggle-row"><input type="checkbox" checked={useAi} onChange={(event) => setUseAi(event.target.checked)} /><span className="toggle-track" /><span><b>Optional AI address review</b><small>Uses OpenAI only to interpret address completeness in English/Hindi/Hinglish. Sends address, city and state to the configured API.</small></span><Sparkles size={17} /></label>
        <button className="primary-button submit-button" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" size={17} /> Scoring order...</> : <>Run decision engine <ArrowRight size={17} /></>}</button>
        {error && <div className="error-banner">{error}</div>}
      </form>
      <div className="result-column">
        {result ? <div className="panel decision-result">
          <div className="result-top"><span className="success-icon"><CheckCircle2 size={19} /></span><span>Decision generated</span></div>
          <div className="result-order">{result.order.order_id}</div>
          <div className="risk-readout"><div><span>Predicted RTO risk</span><b>{Math.round(result.decision.risk * 100)}<small>%</small></b></div><div className="risk-meter"><i style={{ width: `${Math.round(result.decision.risk * 100)}%` }} /></div></div>
          <div className="decision-callout"><span>Recommended action</span><DecisionBadge action={result.decision.action} /><p>{result.decision.reason}</p></div>
          {result.ai_review && <div className="ai-review-box"><Sparkles size={16} /><div><b>Address review</b><p>{result.ai_review.note || (result.ai_review.enabled ? `Completeness: ${result.ai_review.completeness}/100 · ${result.ai_review.issues.join(', ') || 'No issues detected.'}` : result.ai_review.error)}</p></div></div>}
          {result.whatsapp_session && <div className="next-step-card"><MessageCircle size={18} /><div><b>WhatsApp flow started</b><span>{result.whatsapp_session.flow === 'NUDGE' ? 'Prepaid offer sent in the simulator.' : 'Confirmation request sent in the simulator.'}</span></div><button className="text-button" onClick={() => onSessionCreated?.(result.whatsapp_session)}>Open chat <ArrowRight size={14} /></button></div>}
          {result.decision.action === 'SHIP' && <div className="positive-note"><CheckCircle2 size={16} /> This order is ready for normal COD fulfilment.</div>}
          {result.decision.action === 'HOLD' && <div className="warning-note"><ShieldCheck size={16} /> This is a manual-review hold, not a silent automatic cancellation.</div>}
          <button className="secondary-button full-width" onClick={() => setResult(null)}>Score another order</button>
        </div> : <div className="empty-result panel"><div className="empty-illustration"><ShieldCheck size={34} /></div><h2>Your decision appears here</h2><p>Submit the order details to see its estimated RTO risk, recommended action, and an explainable reason.</p><div className="empty-result-row"><ClipboardCheck size={16} /><span>Supervised model trained on 2,017 labelled orders</span></div><div className="empty-result-row"><MessageCircle size={16} /><span>Confirmation and prepaid flows launch automatically when required</span></div></div>}
        <div className="mini-info-card"><b>Policy guardrail</b><p>New customers have a higher hold threshold than returning customers. A high-risk first order is routed to review rather than being automatically cancelled.</p></div>
      </div>
    </div>
  </div>;
}

function Field({ label, name, value, onChange, type = 'text', ...props }) {
  return <div className="field"><label>{label}</label><input name={name} value={value ?? ''} type={type} onChange={onChange} {...props} /></div>;
}
