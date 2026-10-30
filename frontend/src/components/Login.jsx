import { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  User, 
  TrendingUp, 
  MessageSquare, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  Database 
} from 'lucide-react';
import { saveUserToSession } from '../services/auth.js';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@codguard.io');
  const [password, setPassword] = useState('codguard123');
  const [name, setName] = useState('Ayush Mishra');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);

    const initials = (name.trim() || email)
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'OP';

    const userProfile = {
      name: name.trim() || 'Operations User',
      email: email.trim(),
      initials,
      role: 'Operations Lead',
      loginAt: new Date().toISOString()
    };

    saveUserToSession(userProfile);
    setLoading(false);
    onLoginSuccess(userProfile);
  };

  return (
    <div className="login-page-container">
      <div className="login-split-card">
        {/* Left Side: COD Guard Info & Features */}
        <div className="login-info-side">
          <div className="login-brand-badge">
            <div className="login-brand-icon">
              <ShieldCheck size={24} />
            </div>
            <div className="login-brand-text">
              <strong>COD Guard</strong>
              <span>RTO CONTROL PLATFORM</span>
            </div>
          </div>

          <div className="login-hero-pitch">
            <h2>Smarter COD decisions. Higher delivered revenue.</h2>
            <p>
              Pre-dispatch risk scoring and automated WhatsApp workflows designed to prevent RTO losses without rejecting genuine buyers.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Zap size={18} />
              </div>
              <div className="login-feature-text">
                <strong>Real-time ML Risk Scoring</strong>
                <p>Instant RTO probability calculation based on customer history, location & order value.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <MessageSquare size={18} />
              </div>
              <div className="login-feature-text">
                <strong>Automated WhatsApp Verification</strong>
                <p>Interactive confirmation journeys &amp; ₹20 prepaid discount nudges before courier dispatch.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Sliders size={18} />
              </div>
              <div className="login-feature-text">
                <strong>Dynamic Policy &amp; Economics</strong>
                <p>Simulate net financial returns, adjust thresholds, and safeguard customer acquisition cost.</p>
              </div>
            </div>
          </div>

          <div className="login-stats-row">
            <div className="login-stat-pill">
              <TrendingUp size={15} />
              <span>~28.4% Baseline RTO</span>
            </div>
            <div className="login-stat-pill">
              <CheckCircle2 size={15} />
              <span>4 Decision Tiers</span>
            </div>
            <div className="login-stat-pill">
              <Database size={15} />
              <span>MERN + ML Engine</span>
            </div>
          </div>
        </div>

        {/* Right Side: Credential Input & Login Form */}
        <div className="login-form-side">
          <div className="login-form-header">
            <span className="login-auth-tag">OPERATIONS PORTAL</span>
            <h1>Welcome back</h1>
            <p>Enter your credentials to access the workspace</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Full Name</label>
              <div className="login-input-wrap">
                <User size={16} />
                <input
                  type="text"
                  placeholder="Ayush Mishra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="login-field">
              <label>Work Email</label>
              <div className="login-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="admin@codguard.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              <span>{loading ? 'Signing in...' : 'Sign In to Workspace'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="login-demo-hint">
            <div className="hint-header">
              <span className="demo-badge">DEMO MODE</span>
              <span>Pre-filled credentials ready</span>
            </div>
            <p>
              Session state is saved in <code>sessionStorage</code> and auto-clears when the tab is closed or when you click <b>Sign out</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
