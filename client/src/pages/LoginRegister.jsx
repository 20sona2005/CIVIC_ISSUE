import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LoginRegister() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setForm({ name: '', email: '', password: '' });
    setError('');
  };

  return (
    <div className="auth-page">
      {/* Left panel — branding */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">CivicPulse</div>
          <h1 className="auth-headline">
            Report civic issues.<br />Track resolutions.
          </h1>
          <p className="auth-sub">
            A platform for citizens to report, track, and resolve civic issues in their communities.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <span>Report issues in under 2 minutes</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <span>Pin exact locations for faster resolution</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <span>Track status from reported to resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-box">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => mode !== 'login' && switchMode()}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => mode !== 'register' && switchMode()}
              type="button"
            >
              Create Account
            </button>
          </div>

          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
            <p>
              {mode === 'login'
                ? 'Sign in to your CivicPulse account'
                : 'Create your free account today'}
            </p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button className="auth-switch-btn" onClick={switchMode} type="button">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          min-height: 100vh;
        }

        /* Left branding panel */
        .auth-left {
          flex: 1;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-12) var(--sp-10);
        }
        .auth-left-content {
          max-width: 400px;
          color: #fff;
        }
        .auth-brand {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.3px;
          margin-bottom: var(--sp-8);
          opacity: 0.9;
        }
        .auth-headline {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.5px;
          color: #fff;
          margin-bottom: var(--sp-4);
        }
        .auth-sub {
          font-size: 16px;
          color: rgba(255,255,255,0.75);
          line-height: 1.6;
          margin-bottom: var(--sp-8);
        }
        .auth-features {
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }
        .auth-feature {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          font-size: 14px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
        }
        .auth-feature-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Right form panel */
        .auth-right {
          width: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-8) var(--sp-8);
          background: var(--surface);
        }
        .auth-form-box {
          width: 100%;
          max-width: 380px;
        }

        /* Tabs */
        .auth-tabs {
          display: flex;
          background: var(--bg);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: var(--sp-6);
        }
        .auth-tab {
          flex: 1;
          padding: 8px;
          font-family: var(--font);
          font-size: 13px;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .auth-tab.active {
          background: var(--surface);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        /* Form header */
        .auth-form-header {
          margin-bottom: var(--sp-6);
        }
        .auth-form-header h2 {
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .auth-form-header p {
          font-size: 14px;
          color: var(--text-secondary);
        }

        /* Alert spacing */
        .auth-form-box .alert {
          margin-bottom: var(--sp-4);
        }

        /* Switch link */
        .auth-switch {
          margin-top: var(--sp-5);
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .auth-switch-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          font-family: var(--font);
        }
        .auth-switch-btn:hover {
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .auth-page { flex-direction: column; }
          .auth-left  { padding: var(--sp-10) var(--sp-6); min-height: 280px; }
          .auth-headline { font-size: 28px; }
          .auth-right { width: 100%; padding: var(--sp-8) var(--sp-4); }
          .auth-form-box { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
