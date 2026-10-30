const labels = { SHIP: 'Ship as-is', CONFIRM: 'Confirm first', NUDGE: 'Prepaid nudge', HOLD: 'Hold / review' };
export default function DecisionBadge({ action }) {
  return <span className={`decision-badge ${String(action || '').toLowerCase()}`}>{labels[action] || action || 'Pending'}</span>;
}
