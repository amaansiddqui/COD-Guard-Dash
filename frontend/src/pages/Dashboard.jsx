import { useEffect, useState } from 'react';
import { ArrowUpRight, IndianRupee, PackageCheck, ShieldAlert, Truck, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import DecisionBadge from '../components/DecisionBadge.jsx';
import { api } from '../services/api.js';

const ACTION_COLORS = { SHIP: '#18a879', CONFIRM: '#4f7df3', NUDGE: '#e6a23c', HOLD: '#e46a6a' };
const rupees = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;

export default function Dashboard({ refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/dashboard').then(setData).catch((err) => setError(err.message)); }, [refreshKey]);
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="loading-card">Loading founder dashboard...</div>;

  const chartData = ['SHIP', 'CONFIRM', 'NUDGE', 'HOLD'].map((key) => ({ action: ({ SHIP: 'Ship as-is', CONFIRM: 'Confirm', NUDGE: 'Prepaid', HOLD: 'Hold' })[key], count: data.backtest.counts[key], key }));
  const impact = data.impact;
  return <div className="page-stack">
    <div className="page-heading-row"><div><div className="eyebrow">FOUNDER VIEW / DAILY PULSE</div><h1>Hello!!  Here's your COD health.</h1><p className="page-subtitle">A quick view of risk decisions, avoided return costs, and contribution at risk.</p></div><div className="date-chip"><span className="live-dot" /> Sample data through {data.dataset_latest_date}</div></div>
    <div className="notice-bar"><ShieldAlert size={17} /><span><b>Historical sample view:</b> The supplied CSV ends on {data.dataset_latest_date}. Counts below are from the latest available sample day, not live Shopify orders.</span></div>
    <section className="metric-grid">
      <MetricCard label="Orders in latest sample day" value={data.daily.order_count} helper={`Date: ${data.daily.sample_date}`} icon={PackageCheck} tone="blue" />
      <MetricCard label="Estimated net impact" value={rupees(impact.net_impact)} helper="September chronological backtest" icon={IndianRupee} tone="green" />
      <MetricCard label="RTO cost avoided" value={rupees(impact.saved_rto_cost)} helper="Expected value, before order losses" icon={Truck} tone="purple" />
      <MetricCard label="Genuine-order contribution at risk" value={rupees(impact.genuine_cancel_loss)} helper="Manual holds only; expected value" icon={Wallet} tone="orange" />
    </section>
    <section className="two-column-grid">
      <div className="panel"><div className="panel-heading"><div><h2>Decision mix</h2><p>September 2026 holdout · {data.backtest.validation_orders} orders</p></div><span className="panel-icon"><BarChart3Icon /></span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><BarChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" /><XAxis dataKey="action" axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8290a6', fontSize: 11 }} /><Tooltip cursor={{ fill: '#f7f9fc' }} /><Bar dataKey="count" radius={[7, 7, 0, 0]} barSize={43}>{chartData.map((item) => <Cell key={item.key} fill={ACTION_COLORS[item.key]} />)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="legend-row">{chartData.map((item) => <span key={item.key}><i style={{ background: ACTION_COLORS[item.key] }} />{item.action}: <b>{item.count}</b></span>)}</div>
      </div>
      <div className="panel economics-panel"><div className="panel-heading"><div><h2>Money at a glance</h2><p>Estimated policy impact vs shipping every order as COD</p></div><span className="panel-icon"><IndianRupee size={18} /></span></div>
        <div className="impact-number">{rupees(impact.net_impact)}<span> net estimated benefit</span></div>
        <div className="impact-line"><span>Saved RTO costs</span><b className="positive">+{rupees(impact.saved_rto_cost)}</b></div>
        <div className="impact-line"><span>Genuine-order contribution at risk</span><b className="negative">-{rupees(impact.genuine_cancel_loss)}</b></div>
        <div className="impact-line"><span>Prepaid discount cost</span><b className="negative">-{rupees(impact.discount_cost)}</b></div>
        <div className="impact-line"><span>First-order CAC exposure (separate)</span><b>{rupees(impact.first_order_cac_exposure)}</b></div>
        <div className="formula-note">CAC is shown separately because acquisition spend is already incurred; it is not double-counted in incremental net impact.</div>
      </div>
    </section>
    <section className="two-column-grid bottom-grid">
      <div className="panel"><div className="panel-heading"><div><h2>Model check</h2><p>Time-based validation, not a random split</p></div><span className="text-link">{data.backtest.validation_period} holdout <ArrowUpRight size={14} /></span></div>
        <div className="model-stat-grid"><div><span>ROC-AUC</span><b>{Number(data.backtest.metrics.roc_auc).toFixed(3)}</b></div><div><span>Brier score</span><b>{Number(data.backtest.metrics.brier_score).toFixed(3)}</b></div><div><span>Train rows</span><b>{data.backtest.train_orders.toLocaleString('en-IN')}</b></div><div><span>Test rows</span><b>{data.backtest.validation_orders.toLocaleString('en-IN')}</b></div></div>
        <p className="muted small-copy">Predicted risk is used to route orders, not as a guarantee of delivery. Confirm/prepaid outcomes are planning assumptions until real WhatsApp data is collected.</p>
      </div>
      <div className="panel"><div className="panel-heading"><div><h2>Latest decisions</h2><p>Orders submitted through this demo</p></div><span className="text-link">Recent</span></div>
        {data.recent_decisions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Order</th><th>Risk</th><th>Action</th></tr></thead><tbody>{data.recent_decisions.slice(0, 6).map((item) => <tr key={`${item.order_id}-${item.created_at}`}><td><b>{item.order_id}</b><small>{new Date(item.created_at).toLocaleString()}</small></td><td>{Math.round(item.predicted_rto_risk * 100)}%</td><td><DecisionBadge action={item.action} /></td></tr>)}</tbody></table></div> : <div className="empty-state compact">No live demo decisions yet. Run a new order decision to see it here.</div>}
      </div>
    </section>
    <p className="footnote">Financial figures are expected-value estimates using editable response, conversion, and effectiveness assumptions. They are not realized savings.</p>
  </div>;
}

function BarChart3Icon() { return <ArrowUpRight size={18} />; }
