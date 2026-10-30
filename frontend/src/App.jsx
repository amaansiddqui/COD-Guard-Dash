import { useEffect, useState } from 'react';
import { Bell, ChevronDown, CircleHelp, LogOut, Menu, ShieldCheck } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import Login from './components/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewOrder from './pages/NewOrder.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import PolicySettings from './pages/PolicySettings.jsx';
import DataModel from './pages/DataModel.jsx';
import { api } from './services/api.js';
import { getStoredUser, clearUserSession } from './services/auth.js';

const titles = { dashboard: 'Overview', decision: 'New order decision', whatsapp: 'WhatsApp simulator', policy: 'Policy settings', data: 'Data & model' };
export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [active, setActive] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [health, setHealth] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api('/health').then(setHealth).catch(() => setHealth({ ok: false }));
    }
  }, [user]);

  const handleLogout = () => {
    clearUserSession();
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  const openSession = (session) => { setActiveSession(session); setActive('whatsapp'); };
  const page = {
    dashboard: <Dashboard refreshKey={refreshKey} />,
    decision: <NewOrder onSessionCreated={openSession} onDecisionSaved={() => setRefreshKey((key) => key + 1)} />,
    whatsapp: <WhatsApp activeSession={activeSession} onSessionUpdate={setActiveSession} />,
    policy: <PolicySettings onSaved={() => setRefreshKey((key) => key + 1)} />,
    data: <DataModel />
  }[active];

  return <div className="app-shell">
    <div className={`mobile-backdrop ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
    <div className={`sidebar-wrap ${mobileOpen ? 'open' : ''}`}><Sidebar active={active} onChange={(id) => { setActive(id); setMobileOpen(false); }} user={user} /></div>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <span className="topbar-context">Workspace <b>/</b> {titles[active]}</span>
        </div>
        <div className="topbar-right">
          <span className={`connection-status ${health?.ok ? 'connected' : ''}`}><i />{health?.database || 'Connecting...'}</span>
          <button className="icon-button" title="Notifications"><Bell size={18} /></button>
          <button className="help-button"><CircleHelp size={17} /><span>Help</span></button>
          <div className="topbar-user" title={`${user.name} (${user.email})`}>
            <div className="avatar">{user.initials || 'AM'}</div>
            <ChevronDown size={14} />
          </div>
          <button className="topbar-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </header>
      <div className="page-content">{page}</div>
      <footer className="app-footer"><span><ShieldCheck size={14} /> COD Guard ·</span><span>Decision support demo · Not connected to live Shopify or WhatsApp</span></footer>
    </main>
  </div>;
}
