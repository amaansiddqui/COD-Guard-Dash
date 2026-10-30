import { actionCounts, estimateImpact } from './economics.js';
import { applyPolicy } from './policy.js';

export function buildBacktest(modelResult, policy) {
  const scored = applyPolicy(modelResult.validationRows, policy);
  const counts = actionCounts(scored);
  const observed = {};
  for (const action of ['SHIP', 'CONFIRM', 'NUDGE', 'HOLD']) {
    const rows = scored.filter((row) => row.action === action);
    observed[action] = rows.length ? rows.filter((row) => row.target_rto === 1).length / rows.length : null;
  }
  return {
    validation_period: modelResult.validationPeriod,
    train_orders: modelResult.trainCount,
    validation_orders: modelResult.validationCount,
    metrics: modelResult.metrics,
    action_counts: counts,
    observed_rto_by_action: observed,
    financial_impact: estimateImpact(scored, policy),
    rows: scored
  };
}

export function latestDaySummary(backtest) {
  const dates = backtest.rows.map((row) => String(row.order_datetime).slice(0, 10)).sort();
  const latestDate = dates.at(-1);
  const rows = backtest.rows.filter((row) => String(row.order_datetime).startsWith(latestDate));
  return { sample_date: latestDate, counts: actionCounts(rows), order_count: rows.length, rows };
}
