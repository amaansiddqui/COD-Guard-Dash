import { Activity, BarChart3, ClipboardList, MessageCircle, Settings2, ShieldCheck, Sparkles } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'decision', label: 'New order decision', icon: ShieldCheck },
  { id: 'whatsapp', label: 'WhatsApp simulator', icon: MessageCircle },
  { id: 'policy', label: 'Policy settings', icon: Settings2 },
  { id: 'data', label: 'Data & model', icon: Activity }
];

export default function Sidebar({ active, onChange, user }) {
  return <aside className="sidebar">
    <div className="brand-lockup">
      <div className="brand-icon"><ShieldCheck size={21} /></div>
      <div><strong>COD Guard</strong><span>RTO CONTROL CENTER</span></div>
    </div>
    <div className="workspace-label">WORKSPACE</div>
    <nav className="side-nav">
      {items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onChange(id)}>
        <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{active === id && <span className="nav-active-dot" />}
      </button>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-note"><Sparkles size={16} /><div><b>Balanced by design</b><span>Protect margin without blocking every new buyer.</span></div></div>
      <div className="profile-row"><div className="avatar">{user?.initials || 'CG'}</div><div><b>{user?.name || 'Operations Team'}</b><span>{user?.role || 'Founder workspace'}</span></div><ClipboardList size={16} className="muted" /></div>
    </div>
  </aside>;
}
