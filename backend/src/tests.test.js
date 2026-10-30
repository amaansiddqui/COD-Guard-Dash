import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFeatures } from './ml/features.js';
import { FeatureEncoder } from './ml/features.js';
import { LogisticRegression } from './ml/logisticRegression.js';
import { decideOrder } from './services/policy.js';
import { estimateImpact, unitEconomics } from './services/economics.js';
import { createSession, handleReply, timeoutSession, confirmPayment } from './services/whatsapp.js';
import { DEFAULT_POLICY } from './config.js';

const validOrder = {
  order_id: 'TEST-101', order_datetime: '2026-10-30 14:25', customer_name: 'Aarav Sharma',
  phone: '9876543210', address: 'Flat 4, MG Road, near City Mall', city: 'Pune', state: 'Maharashtra',
  pincode: 411001, order_value: 649, num_items: 1, customer_prior_orders: 0,
  customer_prior_rto: 0, utm_source: 'meta_ads', courier: 'Delhivery'
};

test('feature extraction flags placeholder names and recognizes landmark phrases', () => {
  const features = extractFeatures({ ...validOrder, customer_name: 'test', address: 'Mandir ke paas, MG Road' });
  assert.equal(features.name_suspicious, 1);
  assert.equal(features.address_has_landmark, 1);
  assert.equal(features.phone_valid, 1);
});

test('feature encoder and logistic regression learn a simple binary separation', () => {
  const rows = Array.from({ length: 80 }, (_, index) => ({ ...validOrder, order_value: index, customer_name: index < 40 ? 'Low Risk' : 'High Risk' }));
  const encoder = new FeatureEncoder().fit(rows);
  const matrix = encoder.transformMany(rows);
  const labels = rows.map((row) => row.order_value >= 40 ? 1 : 0);
  const model = new LogisticRegression({ iterations: 500 }).fit(matrix, labels);
  assert.ok(model.predictProbability(encoder.transform(rows[0])) < model.predictProbability(encoder.transform(rows[79])));
});

test('placeholder data is routed to manual review, not auto-cancelled', () => {
  const decision = decideOrder({ ...validOrder, customer_name: 'asdf' }, 0.2, DEFAULT_POLICY);
  assert.equal(decision.action, 'HOLD');
  assert.match(decision.reason, /placeholder/i);
});

test('first-time buyer has a higher hold threshold than a returning buyer', () => {
  const first = decideOrder(validOrder, 0.80, DEFAULT_POLICY);
  const repeat = decideOrder({ ...validOrder, customer_prior_orders: 3 }, 0.80, DEFAULT_POLICY);
  assert.notEqual(first.action, 'HOLD');
  assert.equal(repeat.action, 'HOLD');
});

test('unit economics match the assignment inputs', () => {
  const economics = unitEconomics(DEFAULT_POLICY);
  assert.equal(Number(economics.rto_cost.toFixed(2)), 169.4);
  assert.equal(Number(economics.delivered_contribution.toFixed(2)), 402.38);
});

test('confirmed COD customer can be released to fulfilment', () => {
  const session = createSession(validOrder, 'CONFIRM', 'english', 20);
  const updated = handleReply(session, 'YES');
  assert.equal(updated.status, 'CONFIRMED_TO_SHIP');
});

test('NO in confirmation flow cancels before dispatch', () => {
  const session = createSession(validOrder, 'CONFIRM');
  const updated = handleReply(session, 'NO');
  assert.equal(updated.status, 'CANCELLED_BY_CUSTOMER');
});

test('random replies trigger a clarification and repeated ambiguity triggers manual review', () => {
  const session = createSession(validOrder, 'CONFIRM');
  handleReply(session, 'maybe');
  assert.equal(session.clarification_sent, true);
  handleReply(session, 'later');
  assert.equal(session.status, 'ON_HOLD_MANUAL_REVIEW');
});

test('24-hour timeout places unresolved order on hold', () => {
  const session = createSession(validOrder, 'CONFIRM');
  timeoutSession(session);
  assert.equal(session.status, 'ON_HOLD_24H');
});

test('prepaid YES requires payment confirmation before dispatch', () => {
  const session = createSession(validOrder, 'NUDGE');
  handleReply(session, 'YES');
  assert.equal(session.status, 'PAYMENT_PENDING');
  confirmPayment(session);
  assert.equal(session.status, 'PAYMENT_CONFIRMED_TO_SHIP');
});

test('prepaid NO falls back to COD confirmation, not automatic dispatch', () => {
  const session = createSession(validOrder, 'NUDGE');
  handleReply(session, 'NO');
  assert.equal(session.flow, 'CONFIRM');
  assert.equal(session.status, 'AWAITING_CONFIRMATION');
});

test('economic impact excludes ship-as-is orders and only counts hold as lost contribution', () => {
  const rows = [
    { action: 'SHIP', predicted_rto_risk: 0.2, customer_prior_orders: 0 },
    { action: 'HOLD', predicted_rto_risk: 0.9, customer_prior_orders: 0 }
  ];
  const impact = estimateImpact(rows, DEFAULT_POLICY);
  assert.ok(impact.genuine_cancel_loss > 0);
  assert.equal(impact.discount_cost, 0);
});
