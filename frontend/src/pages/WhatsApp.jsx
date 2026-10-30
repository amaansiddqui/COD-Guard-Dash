import { useEffect, useState } from 'react';
import { ArrowDown, Check, Clock3, CreditCard, MessageCircle, Send, Smartphone } from 'lucide-react';
import { api } from '../services/api.js';

export default function WhatsApp({ activeSession, onSessionUpdate }) {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(activeSession?.session_id || '');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = sessions.find((item) => item.session_id === selectedId) || activeSession;
  const refresh = async () => {
    try {
      const data = await api('/whatsapp'); setSessions(data);
      if (activeSession?.session_id) setSelectedId(activeSession.session_id);
      else if (!selectedId && data[0]) setSelectedId(data[0].session_id);
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { refresh(); }, [activeSession?.session_id]);
  const save = async (url, body = {}) => {
    if (!selected) return;
    setBusy(true); setError('');
    try { const updated = await api(url, { method: 'POST', body: JSON.stringify(body) });
      setSessions((items) => [updated, ...items.filter((item) => item.session_id !== updated.session_id)]);
      onSessionUpdate?.(updated);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const sendReply = async (value) => { const next = value ?? reply; if (!next.trim()) return; await save(`/whatsapp/${selected.session_id}/reply`, { reply: next }); setReply(''); };
  const statusText = (status) => String(status || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
  return <div className="page-stack">
    <div className="page-heading-row"><div><div className="eyebrow">CUSTOMER EXPERIENCE / MOCK MESSAGING</div><h1>WhatsApp confirmation simulator</h1><p className="page-subtitle">Test how the customer journey changes for confirmation and prepaid nudges, without a real WhatsApp account.</p></div><div className="mock-pill"><span className="mock-pulse" /> MOCK API</div></div>
    <div className="whatsapp-layout">
      <div className="panel session-list"><div className="panel-heading"><div><h2>Active conversations</h2><p>{sessions.length} saved simulator session(s)</p></div><MessageCircle size={18} className="muted" /></div>
        {sessions.length ? sessions.map((item) => <button key={item.session_id} onClick={() => setSelectedId(item.session_id)} className={`session-item ${selectedId === item.session_id ? 'selected' : ''}`}><div className="session-avatar">{String(item.order?.customer_name || 'C').slice(0, 1).toUpperCase()}</div><div className="session-main"><b>{item.order?.customer_name || item.order_id}</b><span>{item.order_id} · {item.flow === 'NUDGE' ? 'Prepaid nudge' : 'COD confirm'}</span></div><span className={`status-dot ${item.status?.toLowerCase().includes('hold') ? 'warn' : item.status?.includes('CONFIRMED') ? 'good' : ''}`} /></button>) : <div className="empty-state">No conversations yet. Submit an order that needs confirmation or a prepaid nudge.</div>}
      </div>
      <div className="panel chat-panel">
        {selected ? <>
          <div className="chat-header"><div className="session-avatar large"><Smartphone size={18} /></div><div><b>{selected.order?.customer_name || selected.order_id}</b><span>{selected.order_id} · {statusText(selected.status)}</span></div><span className="chat-mock-tag">SIMULATOR</span></div>
          <div className="chat-context"><span>{selected.flow === 'NUDGE' ? 'PREPAID INCENTIVE FLOW' : 'COD CONFIRMATION FLOW'}</span><b>24-hour response window</b></div>
          <div className="chat-messages">
            {(selected.messages || []).map((message, index) => <div key={`${message.at}-${index}`} className={`message-row ${message.from === 'business' ? 'outgoing' : 'incoming'}`}><div className="message-bubble"><p>{message.text}</p><span>{new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {message.from === 'business' && <Check size={12} />}</span></div></div>)}
            {!(selected.messages || []).length && <div className="empty-state">No messages.</div>}
          </div>
          <div className="quick-replies"><span>Simulate customer reply</span><div><button onClick={() => sendReply('YES')} disabled={busy}>YES</button><button onClick={() => sendReply('NO')} disabled={busy}>NO</button><button onClick={() => sendReply('Maybe later')} disabled={busy}>Random reply</button></div></div>
          <form className="chat-input-row" onSubmit={(event) => { event.preventDefault(); sendReply(); }}><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Or type a customer reply..." /><button className="send-button" disabled={busy || !reply.trim()}><Send size={16} /></button></form>
          <div className="chat-actions">
            {selected.status === 'PAYMENT_PENDING' && <button className="primary-button small" onClick={() => save(`/whatsapp/${selected.session_id}/payment-confirmed`)} disabled={busy}><CreditCard size={15} /> Simulate payment webhook</button>}
            {!['CONFIRMED_TO_SHIP', 'CANCELLED_BY_CUSTOMER', 'PAYMENT_CONFIRMED_TO_SHIP', 'ON_HOLD_24H'].includes(selected.status) && <button className="secondary-button small" onClick={() => save(`/whatsapp/${selected.session_id}/timeout`)} disabled={busy}><Clock3 size={15} /> Simulate 24-hour timeout</button>}
          </div>
          {error && <div className="error-banner slim">{error}</div>}
        </> : <div className="empty-result chat-empty"><div className="empty-illustration"><MessageCircle size={33} /></div><h2>Choose a conversation</h2><p>Start a WhatsApp flow from the New order decision screen, then test YES, NO, random replies and timeout handling here.</p><div className="empty-result-row"><ArrowDown size={16} /><span>New Order → Submit → Open chat</span></div></div>}
      </div>
    </div>
    <div className="notice-bar"><Clock3 size={17} /><span><b>Safety rule:</b> Silence is not consent. A 24-hour timeout creates a manual-review hold; prepaid YES creates a payment link but never dispatches until the mock payment webhook is confirmed.</span></div>
  </div>;
}
