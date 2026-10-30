export function unitEconomics(config) {
  const rtoCost = Number(config.forward_shipping) + Number(config.return_shipping)
    + Number(config.packaging_handling) + Number(config.damage_rate) * Number(config.returned_product_cost);
  const deliveredContribution = Number(config.average_order_value) * Number(config.gross_margin_rate);
  const cancelBreakEvenRisk = deliveredContribution / (deliveredContribution + rtoCost);
  return { rto_cost: rtoCost, delivered_contribution: deliveredContribution, cancel_break_even_risk: cancelBreakEvenRisk };
}

export function actionCounts(rows) {
  const counts = { SHIP: 0, CONFIRM: 0, NUDGE: 0, HOLD: 0 };
  rows.forEach((row) => { if (Object.hasOwn(counts, row.action)) counts[row.action] += 1; });
  return counts;
}

export function estimateImpact(rows, config) {
  const { rto_cost: rtoCost, delivered_contribution: contribution } = unitEconomics(config);
  const response = Number(config.confirmation_response_rate);
  const confirmReduction = Number(config.confirmation_rto_reduction);
  const conversion = Number(config.prepaid_conversion_rate);
  const prepaidRto = Number(config.prepaid_rto_rate);
  const discount = Number(config.prepaid_discount);
  let savedRtoCost = 0;
  let genuineCancelLoss = 0;
  let discountCost = 0;
  let firstOrderCacExposure = 0;
  let expectedAvoidedRtos = 0;

  rows.forEach((row) => {
    const risk = Number(row.predicted_rto_risk || row.risk || 0);
    const action = String(row.action || 'SHIP');
    const firstTime = Number(row.customer_prior_orders || 0) <= 0;
    if (action === 'SHIP') return;
    let avoidedRate = 0;
    let lostGenuine = 0;
    if (action === 'CONFIRM') {
      avoidedRate = risk * ((1 - response) + response * confirmReduction);
    } else if (action === 'NUDGE') {
      avoidedRate = conversion * Math.max(risk - prepaidRto, 0)
        + (1 - conversion) * risk * ((1 - response) + response * confirmReduction);
      discountCost += conversion * discount;
    } else if (action === 'HOLD') {
      avoidedRate = risk;
      lostGenuine = 1 - risk;
      if (firstTime) firstOrderCacExposure += Number(config.new_customer_cac);
    }
    expectedAvoidedRtos += avoidedRate;
    savedRtoCost += avoidedRate * rtoCost;
    genuineCancelLoss += lostGenuine * contribution;
  });
  const net = savedRtoCost - genuineCancelLoss - discountCost;
  return {
    orders: rows.length,
    saved_rto_cost: savedRtoCost,
    genuine_cancel_loss: genuineCancelLoss,
    discount_cost: discountCost,
    first_order_cac_exposure: firstOrderCacExposure,
    expected_avoided_rtos: expectedAvoidedRtos,
    net_impact: net
  };
}
