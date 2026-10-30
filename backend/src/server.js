import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { DATASET_PATH, DEFAULT_POLICY } from './config.js';
import { readCsv, normalizeOrders } from './utils/csv.js';
import { trainModels, predictRisk } from './ml/model.js';
import { decideOrder } from './services/policy.js';
import { actionCounts, estimateImpact, unitEconomics } from './services/economics.js';
import { buildBacktest, latestDaySummary } from './services/backtest.js';
import { applyAddressAdjustment, reviewAddressWithLlm } from './services/aiReview.js';
import { createSession, handleReply, timeoutSession, confirmPayment } from './services/whatsapp.js';
import { connectStorage, storageMode, saveOrder, listOrders, saveSession, getSession, listSessions, getPolicy, savePolicy } from './services/storage.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

let orders;
let modelBundle;
let backtest;

function safeNewOrder(payload) {
  return {
    order_id: String(payload.order_id || `CG-${Date.now().toString().slice(-8)}`).trim(),
    order_datetime: String(payload.order_datetime || new Date().toISOString().slice(0, 16).replace('T', ' ')),
    customer_name: String(payload.customer_name || '').trim(),
    phone: String(payload.phone || '').trim(),
    address: String(payload.address || '').trim(),
    city: String(payload.city || '').trim(),
    state: String(payload.state || '').trim(),
    pincode: payload.pincode === '' || payload.pincode == null ? null : Number(payload.pincode),
    order_value: Number(payload.order_value || 649),
    items: String(payload.items || 'New order'),
    num_items: Number(payload.num_items || 1),
    customer_prior_orders: Number(payload.customer_prior_orders || 0),
    customer_prior_rto: Number(payload.customer_prior_rto || 0),
    utm_source: String(payload.utm_source || 'direct'),
    courier: String(payload.courier || 'Unassigned'),
    payment_method: 'COD'
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, database: storageMode(), dataset_orders: orders?.length || 0 }));

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const policy = await getPolicy();
    const daily = latestDaySummary(backtest);
    const recent = await listOrders(8);
    res.json({
      database: storageMode(),
      dataset_latest_date: daily.sample_date,
      daily: { sample_date: daily.sample_date, order_count: daily.order_count, counts: daily.counts },
      impact: estimateImpact(backtest.rows, policy),
      unit_economics: unitEconomics(policy),
      backtest: {
        validation_period: backtest.validation_period,
        train_orders: backtest.train_orders,
        validation_orders: backtest.validation_orders,
        metrics: backtest.metrics,
        counts: backtest.action_counts,
        observed_rto_by_action: backtest.observed_rto_by_action
      },
      recent_decisions: recent
    });
  } catch (error) { next(error); }
});

app.get('/api/model', async (req, res, next) => {
  try {
    const total = orders.length;
    const rto = orders.filter((row) => row.target_rto === 1).length;
    const delivered = total - rto;
    const segments = {};
    for (const key of ['utm_source', 'city', 'courier']) {
      const groups = new Map();
      orders.forEach((row) => {
        const value = row[key] || 'Unknown';
        const group = groups.get(value) || { segment: value, orders: 0, rto: 0 };
        group.orders += 1; group.rto += row.target_rto; groups.set(value, group);
      });
      segments[key] = [...groups.values()].map((group) => ({ ...group, rto_rate: group.rto / group.orders }))
        .sort((a, b) => b.orders - a.orders).slice(0, 12);
    }
    res.json({
      dataset: { labelled_orders: total, rto, delivered, rto_rate: rto / total,
        date_min: orders[0].order_datetime, date_max: orders.at(-1).order_datetime },
      training: { period: backtest.validation_period, train_orders: backtest.train_orders,
        validation_orders: backtest.validation_orders, metrics: backtest.metrics, note: modelBundle.validationNote },
      segments
    });
  } catch (error) { next(error); }
});

app.get('/api/sample-order', (req, res) => {
  res.json({
    order_id: 'DEMO-1001', order_datetime: '2026-10-30 12:30', customer_name: 'Rahul Sharma',
    phone: '9876543210', address: 'Flat 302, Green Park Society, Hanuman Mandir ke paas',
    city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010', order_value: 649,
    items: 'Rice Water Shampoo Bar', num_items: 1, customer_prior_orders: 0,
    customer_prior_rto: 0, utm_source: 'meta_ads', courier: 'Delhivery'
  });
});

app.post('/api/decisions', async (req, res, next) => {
  try {
    const order = safeNewOrder(req.body || {});
    if (!order.customer_name || !order.phone || !order.address || !order.city) {
      return res.status(400).json({ error: 'Customer name, phone, address and city are required.' });
    }
    let risk = predictRisk(modelBundle, order);
    let aiReview = null;
    if (req.body?.use_ai_review) {
      aiReview = await reviewAddressWithLlm({ address: order.address, city: order.city, state: order.state });
      risk = applyAddressAdjustment(risk, aiReview);
    }
    const policy = await getPolicy();
    const decision = decideOrder(order, risk, policy);
    const saved = {
      order_id: order.order_id, input: order, predicted_rto_risk: risk,
      action: decision.action, action_label: decision.action_label, reason: decision.reason,
      decision_status: decision.action === 'SHIP' ? 'READY_TO_SHIP' : decision.action === 'HOLD' ? 'MANUAL_REVIEW' : 'ACTION_REQUIRED',
      created_at: new Date().toISOString()
    };
    await saveOrder(saved);
    let session = null;
    if (['CONFIRM', 'NUDGE'].includes(decision.action)) {
      session = createSession(order, decision.action, req.body?.language || 'hinglish', policy.prepaid_discount);
      await saveSession(session);
    }
    res.status(201).json({ order, decision, ai_review: aiReview, whatsapp_session: session });
  } catch (error) { next(error); }
});

app.get('/api/orders', async (req, res, next) => {
  try { res.json(await listOrders(Math.min(Number(req.query.limit) || 50, 200))); }
  catch (error) { next(error); }
});

app.get('/api/policy', async (req, res, next) => {
  try { res.json(await getPolicy()); } catch (error) { next(error); }
});

app.put('/api/policy', async (req, res, next) => {
  try {
    const current = await getPolicy();
    const nextPolicy = { ...current };
    for (const key of Object.keys(DEFAULT_POLICY)) {
      if (req.body?.[key] !== undefined) {
        const value = Number(req.body[key]);
        if (!Number.isFinite(value)) return res.status(400).json({ error: `Policy value ${key} must be numeric.` });
        nextPolicy[key] = value;
      }
    }
    if (!(nextPolicy.ship_max_risk >= 0 && nextPolicy.ship_max_risk < nextPolicy.confirm_max_risk
      && nextPolicy.confirm_max_risk < nextPolicy.hold_risk_returning
      && nextPolicy.confirm_max_risk <= 1 && nextPolicy.hold_risk_returning <= 1
      && nextPolicy.hold_risk_first_time <= 1
      && nextPolicy.hold_risk_first_time >= nextPolicy.hold_risk_returning)) {
      return res.status(400).json({ error: 'Risk thresholds must be ordered: ship < confirm < returning hold, and first-time hold must be at least confirm. All risk values must be <= 1.' });
    }
    for (const key of ['confirmation_response_rate', 'confirmation_rto_reduction', 'prepaid_conversion_rate', 'prepaid_rto_rate', 'gross_margin_rate', 'damage_rate']) {
      if (nextPolicy[key] < 0 || nextPolicy[key] > 1) return res.status(400).json({ error: `${key} must be between 0 and 1.` });
    }
    await savePolicy(nextPolicy);
    backtest = buildBacktest(modelBundle, nextPolicy);
    res.json(nextPolicy);
  } catch (error) { next(error); }
});

app.get('/api/whatsapp', async (req, res, next) => {
  try { res.json(await listSessions(30)); } catch (error) { next(error); }
});

app.post('/api/whatsapp/:sessionId/reply', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'WhatsApp session not found.' });
    const updated = handleReply(session, req.body?.reply);
    await saveSession(updated);
    res.json(updated);
  } catch (error) { next(error); }
});

app.post('/api/whatsapp/:sessionId/timeout', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'WhatsApp session not found.' });
    const updated = timeoutSession(session);
    await saveSession(updated);
    res.json(updated);
  } catch (error) { next(error); }
});

app.post('/api/whatsapp/:sessionId/payment-confirmed', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'WhatsApp session not found.' });
    const updated = confirmPayment(session);
    await saveSession(updated);
    res.json(updated);
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Unexpected server error.' });
});

async function start() {
  orders = normalizeOrders(readCsv(DATASET_PATH));
  modelBundle = trainModels(orders);
  const policy = await getPolicy();
  backtest = buildBacktest(modelBundle, policy);
  await connectStorage(process.env.MONGODB_URI);
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`COD Guard API running at http://localhost:${port}`);
    console.log(`Trained on ${orders.length} labelled orders; validation AUC: ${modelBundle.metrics.roc_auc?.toFixed(3) ?? 'n/a'}`);
  });
}

start().catch((error) => { console.error('Startup failed:', error); process.exit(1); });
