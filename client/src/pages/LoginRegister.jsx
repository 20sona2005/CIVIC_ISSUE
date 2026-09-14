import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function LoginRegister() {
  const { t } = useTranslation();
  const [mode, setMode]       = useState('login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

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
      const payload  = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('login.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setForm({ name: '', email: '', password: '' });
    setShowPw(false);
    setError('');
  };

  return (
    <div className="auth-page">
      {/* ── Left branding panel ── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {t('login.brand')}
          </div>
          <h1 className="auth-headline">
            {t('login.headline').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p className="auth-sub">{t('login.sub')}</p>
          <div className="auth-features">
            {[
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                text: t('login.feature1'),
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                text: t('login.feature2'),
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                text: t('login.feature3'),
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
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => mode !== 'login' && switchMode()}
              type="button"
            >
              {t('login.tabSignIn')}
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => mode !== 'register' && switchMode()}
              type="button"
            >
              {t('login.tabCreate')}
            </button>
          </div>

          <div className="auth-form-header">
            <h2>{mode === 'login' ? t('login.welcomeBack') : t('login.getStarted')}</h2>
            <p>{mode === 'login' ? t('login.welcomeBackSub') : t('login.getStartedSub')}</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">{t('login.fullName')}</label>
                <input
                  id="name" name="name" type="text"
                  className="form-input"
                  placeholder={t('login.namePlaceholder')}
                  value={form.name}
                  onChange={handleChange}
                  required autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">{t('login.email')}</label>
              <input
                id="email" name="email" type="email"
                className="form-input"
                placeholder={t('login.emailPlaceholder')}
                value={form.email}
                onChange={handleChange}
                required autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">{t('login.password')}</label>
              <div className="pw-wrap">
                <input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder={mode === 'register' ? t('login.passwordPlaceholderRegister') : t('login.passwordPlaceholderLogin')}
                  value={form.password}
                  onChange={handleChange}
                  required minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
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
                <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> {t('login.pleaseWait')}</>
              ) : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
            </button>
          </form>

          <div className="auth-footer-links">
            <p className="auth-switch">
              {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}{' '}
              <button className="auth-switch-btn" onClick={switchMode} type="button">
                {mode === 'login' ? t('login.createOne') : t('login.signInLink')}
              </button>
            </p>
            <p className="auth-switch">
              {t('login.areYouAdmin')}{' '}
              <a href="/admin/login" className="auth-switch-btn">{t('login.adminLogin')}</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page { display: flex; min-height: 100vh; }
        .auth-left {
          flex: 1;
          background: linear-gradient(150deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
          display: flex; align-items: center; justify-content: center;
          padding: var(--sp-12) var(--sp-10);
          position: relative; overflow: hidden;
        }
        .auth-left::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 60%);
          pointer-events: none;
        }
        .auth-left-content { max-width: 400px; color: #fff; position: relative; z-index: 1; }
        .auth-brand-logo {
          display: flex; align-items: center; gap: var(--sp-2);
          font-size: 20px; font-weight: 700; letter-spacing: -0.3px;
          margin-bottom: var(--sp-8); opacity: 0.92;
        }
        .auth-headline {
          font-size: 34px; font-weight: 700; line-height: 1.2;
          letter-spacing: -0.5px; color: #fff; margin-bottom: var(--sp-4);
        }
        .auth-sub { font-size: 15px; color: rgba(255,255,255,0.78); line-height: 1.65; margin-bottom: var(--sp-8); }
        .auth-features { display: flex; flex-direction: column; gap: var(--sp-4); }
        .auth-feature {
          display: flex; align-items: center; gap: var(--sp-3);
          font-size: 14px; color: rgba(255,255,255,0.88); font-weight: 500;
        }
        .auth-feature-icon {
          width: 30px; height: 30px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .auth-right {
          width: 500px; display: flex; align-items: center; justify-content: center;
          padding: var(--sp-10); background: var(--surface);
        }
        .auth-form-box { width: 100%; max-width: 390px; animation: authFadeIn 0.3s ease; }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-tabs {
          display: flex; background: var(--bg); border-radius: var(--radius-sm);
          padding: 4px; margin-bottom: var(--sp-6); border: 1px solid var(--border);
        }
        .auth-tab {
          flex: 1; padding: 8px; font-family: var(--font); font-size: 13px; font-weight: 500;
          border: none; border-radius: 4px; background: transparent;
          color: var(--text-secondary); cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .auth-tab.active {
          background: var(--surface); color: var(--text-primary);
          box-shadow: var(--shadow-sm); font-weight: 600;
        }
        .auth-form-header { margin-bottom: var(--sp-6); }
        .auth-form-header h2 { margin-bottom: 4px; color: var(--text-primary); }
        .auth-form-header p  { font-size: 14px; color: var(--text-secondary); }
        .auth-footer-links { margin-top: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-2); }
        .auth-switch { text-align: center; font-size: 13px; color: var(--text-secondary); margin: 0; }
        .auth-switch-btn {
          background: none; border: none; color: var(--primary); font-size: 13px; font-weight: 500;
          cursor: pointer; padding: 0; font-family: var(--font); text-decoration: none;
          transition: color var(--transition-fast);
        }
        .auth-switch-btn:hover { color: var(--primary-hover); text-decoration: underline; }
        @media (max-width: 768px) {
          .auth-page    { flex-direction: column; }
          .auth-left    { padding: var(--sp-10) var(--sp-6); min-height: 260px; }
          .auth-headline{ font-size: 26px; }
          .auth-right   { width: 100%; padding: var(--sp-8) var(--sp-5); }
          .auth-form-box{ max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
