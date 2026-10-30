import { extractFeatures } from '../ml/features.js';

export const ACTION_LABELS = {
  SHIP: 'Ship as-is',
  CONFIRM: 'Ship after confirmation',
  NUDGE: 'Nudge to prepaid',
  HOLD: 'Hold / cancel'
};

export function decideOrder(order, risk, config) {
  const priorOrders = Number(order.customer_prior_orders || 0);
  const priorRto = Number(order.customer_prior_rto || 0);
  const name = String(order.customer_name || '').trim();
  const phone = String(order.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const address = String(order.address || '').trim();
  const city = String(order.city || '').trim();
  const features = extractFeatures(order);
  const firstTime = priorOrders <= 0;
  let action;
  let reason;

  if (features.name_suspicious) {
    action = 'HOLD';
    reason = 'The customer name looks like a placeholder. Verify the customer details before releasing the parcel.';
  } else if (!phone || !features.phone_valid) {
    action = 'HOLD';
    reason = 'The phone number is missing or is not a valid 10-digit Indian mobile number. Verify contact details before courier hand-off.';
  } else if (address.length < 8) {
    action = 'HOLD';
    reason = 'The delivery address is too short to route confidently. Ask the customer to complete it before shipment.';
  } else if (firstTime && risk >= Number(config.hold_risk_first_time)) {
    action = 'HOLD';
    reason = `Estimated RTO risk is ${(risk * 100).toFixed(0)}%, above the stricter first-order hold limit. Manual review protects the paid acquisition investment.`;
  } else if (!firstTime && risk >= Number(config.hold_risk_returning)) {
    action = 'HOLD';
    reason = `Estimated RTO risk is ${(risk * 100).toFixed(0)}%, above the returning-customer hold limit. Expected RTO cost justifies a manual stop.`;
  } else if (risk >= Number(config.confirm_max_risk)) {
    action = 'NUDGE';
    reason = firstTime
      ? `Estimated RTO risk is ${(risk * 100).toFixed(0)}%. Because this is a first order, offer a small prepaid incentive instead of automatically cancelling.`
      : `Estimated RTO risk is ${(risk * 100).toFixed(0)}%; ask the customer to switch to prepaid before shipment.`;
  } else if (risk >= Number(config.ship_max_risk)) {
    action = 'CONFIRM';
    reason = `Estimated RTO risk is ${(risk * 100).toFixed(0)}%; get explicit WhatsApp confirmation before dispatch.`;
  } else {
    action = 'SHIP';
    reason = `Estimated RTO risk is ${(risk * 100).toFixed(0)}%, below the ship-as-is threshold. No extra friction is recommended.`;
  }

  const signals = [];
  if (priorRto > 0) signals.push(`${priorRto} prior RTO(s)`);
  if (features.address_short) signals.push('short address');
  if (!features.address_has_landmark) signals.push('no obvious landmark phrase');
  if (!city) signals.push('city missing');
  if (signals.length) reason += ` Signals: ${signals.join(', ')}.`;
  return { action, action_label: ACTION_LABELS[action], risk, reason };
}

export function applyPolicy(rows, config) {
  return rows.map((row) => ({ ...row, ...decideOrder(row, Number(row.predicted_rto_risk || 0), config) }));
}
