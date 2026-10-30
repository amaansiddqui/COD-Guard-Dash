export default function MetricCard({ label, value, helper, icon: Icon, tone = 'blue' }) {
  return <div className="metric-card">
    <div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18} /></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-helper">{helper}</div>
  </div>;
}
