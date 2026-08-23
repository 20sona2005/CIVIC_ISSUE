import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function AdminLogin() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  if (user && isAdmin)  return <Navigate to="/admin" replace />;
  if (user && !isAdmin) return <Navigate to="/"      replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      if (data.user.role !== 'admin') {
        setError('Access denied. This portal is for admins only.');
        setLoading(false);
        return;
      }
      login(data.user, data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left dark branding panel ── */}
      <div className="auth-left admin-left">
        <div className="auth-left-content">
          <div className="auth-brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            CivicPulse
          </div>
          <h1 className="auth-headline">Admin Portal</h1>
          <p className="auth-sub">
            Manage reported civic issues, update statuses, and oversee community activity from one place.
          </p>
          <div className="auth-features">
            {[
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>,
                text: 'View and manage all reported issues',
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                text: 'Update issue statuses in real time',
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                text: 'Monitor community engagement',
              },
            ].map(({ icon, text }) => (
              <div key={text} className="auth-feature">
                <div className="auth-feature-icon">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-right">
        <div className="auth-form-box">
          <div className="admin-login-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin Access Only
          </div>

          <div className="auth-form-header">
            <h2>Admin Sign In</h2>
            <p>Sign in to manage civic issues</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email" name="email" type="email"
                className="form-input"
                placeholder="admin@civicpulse.com"
                value={form.email}
                onChange={handleChange}
                required autoComplete="email" autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 'var(--sp-2)' }}
            >
              {loading ? (
                <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in…</>
              ) : 'Sign In as Admin'}
            </button>
          </form>

          <div className="auth-footer-links" style={{ marginTop: 'var(--sp-5)' }}>
            <p className="auth-switch">
              Not an admin?{' '}
              <a href="/login" className="auth-switch-btn">Go to citizen login →</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          min-height: 100vh;
        }
        .auth-left {
          flex: 1;
          background: linear-gradient(150deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-12) var(--sp-10);
          position: relative;
          overflow: hidden;
        }
        .auth-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 60%);
          pointer-events: none;
        }
        .admin-left {
          background: linear-gradient(150deg, #0f172a 0%, #1e293b 55%, #334155 100%);
        }
        .auth-left-content {
          max-width: 400px;
          color: #fff;
          position: relative;
          z-index: 1;
        }
        .auth-brand-logo {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
          margin-bottom: var(--sp-8);
          opacity: 0.92;
        }
        .auth-headline {
          font-size: 34px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.5px;
          color: #fff;
          margin-bottom: var(--sp-4);
        }
        .auth-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.78);
          line-height: 1.65;
          margin-bottom: var(--sp-8);
        }
        .auth-features { display: flex; flex-direction: column; gap: var(--sp-4); }
        .auth-feature {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          font-size: 14px;
          color: rgba(255,255,255,0.88);
          font-weight: 500;
        }
        .auth-feature-icon {
          width: 30px; height: 30px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* Right */
        .auth-right {
          width: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-10);
          background: var(--surface);
        }
        .auth-form-box {
          width: 100%;
          max-width: 390px;
          animation: authFadeIn 0.3s ease;
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Admin badge */
        .admin-login-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fef3c7;
          color: #92400e;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: var(--sp-5);
          border: 1px solid #fde68a;
        }

        /* Form header */
        .auth-form-header { margin-bottom: var(--sp-6); }
        .auth-form-header h2 { margin-bottom: 4px; color: var(--text-primary); }
        .auth-form-header p  { font-size: 14px; color: var(--text-secondary); }

        /* Footer links */
        .auth-footer-links { display: flex; flex-direction: column; gap: var(--sp-2); }
        .auth-switch {
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }
        .auth-switch-btn {
          background: none; border: none;
          color: var(--primary);
          font-size: 13px; font-weight: 500;
          cursor: pointer; padding: 0;
          font-family: var(--font);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        .auth-switch-btn:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .auth-page   { flex-direction: column; }
          .auth-left   { padding: var(--sp-10) var(--sp-6); min-height: 220px; }
          .auth-headline { font-size: 26px; }
          .auth-right  { width: 100%; padding: var(--sp-8) var(--sp-5); }
          .auth-form-box { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
