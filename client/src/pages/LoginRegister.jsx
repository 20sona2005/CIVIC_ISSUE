import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Eye icons ─────────────────────────────────────────────────────────────────
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

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled }) {
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (e, idx) => {
    const inputs = e.currentTarget.closest('.lr-otp-boxes').querySelectorAll('input');
    if (e.key === 'Backspace') {
      if (digits[idx].trim()) {
        onChange(value.slice(0, idx) + value.slice(idx + 1));
      } else if (idx > 0) {
        inputs[idx - 1].focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft'  && idx > 0) { inputs[idx - 1].focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { inputs[idx + 1].focus(); return; }
    if (!/^\d$/.test(e.key)) return;
    const next = value.slice(0, idx) + e.key + value.slice(idx + 1);
    onChange(next.replace(/ +$/, ''));
    if (idx < 5) setTimeout(() => inputs[idx + 1].focus(), 0);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
  };

  return (
    <div className="lr-otp-boxes" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`lr-otp-box${d.trim() ? ' lr-otp-filled' : ''}`}
          value={d.trim()}
          onChange={() => {}}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

// ── Demo Aadhaar numbers (hint only — real check is on the backend) ────────────
const DEMO_NUMBERS = [
  '111122223333',
  '222233334444',
  '333344445555',
  '444455556666',
  '555566667777',
];

const OTP_EXPIRY_SECS = 5 * 60;
const RESEND_COOLDOWN = 60;

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginRegister() {
  const { t }      = useTranslation();
  const { login }  = useAuth();
  const navigate   = useNavigate();

  // ── mode: 'login' | 'register' ──────────────────────────────────────────
  const [mode, setMode]       = useState('login');

  // Email/password form
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);

  // Shared
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Register inline Aadhaar state ─────────────────────────────────────────
  // regAadhaarStep: 'idle' | 'input' | 'sending' | 'otp' | 'verified'
  const [regAadhaarStep, setRegAadhaarStep]       = useState('idle');
  const [regAadhaar, setRegAadhaar]               = useState('');
  const [regAadhaarUserId, setRegAadhaarUserId]   = useState('');
  const [regAadhaarMasked, setRegAadhaarMasked]   = useState('');
  const [regOtp, setRegOtp]                       = useState('');
  const [regAadhaarErr, setRegAadhaarErr]         = useState('');
  const [regAadhaarOk, setRegAadhaarOk]           = useState('');
  const [regShowHint, setRegShowHint]             = useState(false);
  const [regTimerSecs, setRegTimerSecs]           = useState(OTP_EXPIRY_SECS);
  const [regResendSecs, setRegResendSecs]         = useState(RESEND_COOLDOWN);
  const regTimerRef  = useRef(null);
  const regResendRef = useRef(null);

  const startRegTimer = useCallback(() => {
    setRegTimerSecs(OTP_EXPIRY_SECS);
    clearInterval(regTimerRef.current);
    regTimerRef.current = setInterval(() => {
      setRegTimerSecs(s => { if (s <= 1) { clearInterval(regTimerRef.current); return 0; } return s - 1; });
    }, 1000);
  }, []);

  const startRegResend = useCallback((from = RESEND_COOLDOWN) => {
    setRegResendSecs(from);
    clearInterval(regResendRef.current);
    regResendRef.current = setInterval(() => {
      setRegResendSecs(s => { if (s <= 1) { clearInterval(regResendRef.current); return 0; } return s - 1; });
    }, 1000);
  }, []);

  useEffect(() => () => {
    clearInterval(regTimerRef.current);
    clearInterval(regResendRef.current);
  }, []);

  const fmtTimer = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Shared helpers ────────────────────────────────────────────────────────
  const clearMessages = () => { setError(''); setSuccess(''); };

  const switchMode = (next) => {
    setMode(next);
    setForm({ name: '', email: '', password: '' });
    setShowPw(false);
    clearMessages();
    // reset register inline Aadhaar
    setRegAadhaarStep('idle');
    setRegAadhaar(''); setRegOtp('');
    setRegAadhaarUserId(''); setRegAadhaarMasked('');
    setRegAadhaarErr(''); setRegAadhaarOk('');
    setRegShowHint(false);
    clearInterval(regTimerRef.current);
    clearInterval(regResendRef.current);
  };

  // ── Email/password submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
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

  // ── Register inline: send Aadhaar OTP ────────────────────────────────────
  const handleRegAadhaarSend = async () => {
    setRegAadhaarErr(''); setRegAadhaarOk('');
    if (!regAadhaar || regAadhaar.length !== 12) {
      setRegAadhaarErr('Enter a valid 12-digit demo Aadhaar number.');
      return;
    }
    setRegAadhaarStep('sending');
    try {
      const { data } = await api.post('/aadhaar/verify-aadhaar', { aadhaarNumber: regAadhaar });
      setRegAadhaarUserId(data.userId);
      setRegAadhaarMasked(data.maskedEmail);
      setRegAadhaarStep('otp');
      startRegTimer();
      startRegResend();
    } catch (err) {
      setRegAadhaarErr(err.response?.data?.message || 'Aadhaar check failed. Try again.');
      setRegAadhaarStep('input');
    }
  };

  // ── Register inline: verify OTP ───────────────────────────────────────────
  const handleRegOtpVerify = async () => {
    setRegAadhaarErr(''); setRegAadhaarOk('');
    if (regOtp.length < 6) { setRegAadhaarErr('Enter the complete 6-digit OTP.'); return; }
    if (regTimerSecs === 0) { setRegAadhaarErr('OTP expired. Please resend.'); return; }
    try {
      await api.post('/aadhaar/verify-otp', { userId: regAadhaarUserId, otp: regOtp });
      setRegAadhaarStep('verified');
      setRegAadhaarOk('✓ Aadhaar verified successfully!');
      clearInterval(regTimerRef.current);
      clearInterval(regResendRef.current);
    } catch (err) {
      setRegAadhaarErr(err.response?.data?.message || 'Incorrect OTP. Try again.');
    }
  };

  // ── Register inline: resend OTP ───────────────────────────────────────────
  const handleRegResend = async () => {
    if (regResendSecs > 0) return;
    setRegAadhaarErr(''); setRegAadhaarOk('');
    try {
      const { data } = await api.post('/aadhaar/resend-otp', { userId: regAadhaarUserId });
      setRegAadhaarOk(data.message || 'New OTP sent.');
      setRegOtp('');
      startRegTimer();
      startRegResend();
    } catch (err) {
      const wait = err.response?.data?.waitSeconds;
      setRegAadhaarErr(err.response?.data?.message || 'Failed to resend OTP.');
      if (wait) startRegResend(wait);
    }
  };

  const regTimerColor = regTimerSecs <= 60 ? '#dc2626' : regTimerSecs <= 120 ? '#f59e0b' : 'var(--success)';

  // ─────────────────────────────────────────────────────────────────────────
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
              { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, text: t('login.feature1') },
              { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, text: t('login.feature2') },
              { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, text: t('login.feature3') },
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

          {/* ── Tabs: Sign In | Create Account | Aadhaar Login ── */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => mode !== 'login' && switchMode('login')}
              type="button"
            >{t('login.tabSignIn')}</button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => mode !== 'register' && switchMode('register')}
              type="button"
            >{t('login.tabCreate')}</button>
          </div>

          {/* ════════════════════════════════════════════════════════════
              EMAIL / PASSWORD FORMS (login + register — unchanged)
              ════════════════════════════════════════════════════════════ */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="auth-form-header">
                <h2>{mode === 'login' ? t('login.welcomeBack') : t('login.getStarted')}</h2>
                <p>{mode === 'login' ? t('login.welcomeBackSub') : t('login.getStartedSub')}</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                {mode === 'register' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">{t('login.fullName')}</label>
                    <input id="name" name="name" type="text" className="form-input"
                      placeholder={t('login.namePlaceholder')}
                      value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }}
                      required autoComplete="name" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="email">{t('login.email')}</label>
                  <input id="email" name="email" type="email" className="form-input"
                    placeholder={t('login.emailPlaceholder')}
                    value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); }}
                    required autoComplete="email" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">{t('login.password')}</label>
                  <div className="pw-wrap">
                    <input id="password" name="password"
                      type={showPw ? 'text' : 'password'} className="form-input"
                      placeholder={mode === 'register' ? t('login.passwordPlaceholderRegister') : t('login.passwordPlaceholderLogin')}
                      value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                      required minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    <button type="button" className="pw-toggle"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* ── Inline Aadhaar Verification (register only) ──────── */}
                {mode === 'register' && (
                  <div className="reg-aadhaar-section">

                    {/* Section header row */}
                    <div className="reg-aadhaar-header">
                      <span className="reg-aadhaar-label">
                        🪪 Aadhaar Verification
                      </span>
                      {regAadhaarStep === 'verified' ? (
                        <span className="reg-aadhaar-badge-verified">✓ Verified</span>
                      ) : (
                        <span className="reg-aadhaar-badge-demo">Demo · Academic</span>
                      )}
                    </div>

                    {/* Step: idle — show "Add Aadhaar" button */}
                    {regAadhaarStep === 'idle' && (
                      <button type="button" className="reg-aadhaar-open-btn"
                        onClick={() => setRegAadhaarStep('input')}>
                        + Verify with Demo Aadhaar
                      </button>
                    )}

                    {/* Step: input — Aadhaar number entry */}
                    {(regAadhaarStep === 'input' || regAadhaarStep === 'sending') && (
                      <div className="reg-aadhaar-body">
                        <p className="reg-aadhaar-disclaimer">
                          🎓 Academic project only. Does <strong>not</strong> connect to UIDAI.
                        </p>
                        <div className="reg-aadhaar-row">
                          <input
                            type="text" inputMode="numeric"
                            className="form-input adhr-number-input reg-aadhaar-input"
                            placeholder="XXXX XXXX XXXX"
                            value={regAadhaar.replace(/(\d{4})(\d{1,4})?(\d{1,4})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))}
                            onChange={e => { setRegAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12)); setRegAadhaarErr(''); }}
                            maxLength={14}
                            autoComplete="off"
                          />
                          <button type="button"
                            className="btn btn-primary reg-aadhaar-send-btn"
                            onClick={handleRegAadhaarSend}
                            disabled={regAadhaarStep === 'sending'}>
                            {regAadhaarStep === 'sending'
                              ? <span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                              : 'Send OTP'}
                          </button>
                        </div>
                        {regAadhaarErr && <p className="reg-aadhaar-err">{regAadhaarErr}</p>}

                        {/* Hint */}
                        <button type="button" className="auth-switch-btn reg-aadhaar-hint-toggle"
                          onClick={() => setRegShowHint(h => !h)}>
                          {regShowHint ? '▲ Hide' : '▼'} demo numbers
                        </button>
                        {regShowHint && (
                          <div className="reg-aadhaar-hint-grid">
                            {DEMO_NUMBERS.map(n => (
                              <button key={n} type="button" className="adhr-hint-btn"
                                onClick={() => { setRegAadhaar(n); setRegAadhaarErr(''); }}>
                                {n.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                              </button>
                            ))}
                          </div>
                        )}

                        <button type="button" className="reg-aadhaar-cancel"
                          onClick={() => { setRegAadhaarStep('idle'); setRegAadhaar(''); setRegAadhaarErr(''); }}>
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Step: otp — OTP entry */}
                    {regAadhaarStep === 'otp' && (
                      <div className="reg-aadhaar-body">
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                          OTP sent to <strong style={{ color: 'var(--primary)' }}>{regAadhaarMasked}</strong>
                        </p>
                        {/* Mini timer */}
                        <div className="reg-aadhaar-timer">
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Expires in</span>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: regTimerColor, fontSize: 13 }}>
                            {regTimerSecs === 0 ? 'Expired' : fmtTimer(regTimerSecs)}
                          </span>
                        </div>
                        {regAadhaarErr && <p className="reg-aadhaar-err">{regAadhaarErr}</p>}
                        {regAadhaarOk  && <p className="reg-aadhaar-ok">{regAadhaarOk}</p>}
                        <OtpBoxes value={regOtp} onChange={setRegOtp}
                          disabled={regTimerSecs === 0} />
                        <div className="reg-aadhaar-otp-actions">
                          <button type="button" className="btn btn-primary"
                            style={{ fontSize: 13, padding: '8px 16px' }}
                            onClick={handleRegOtpVerify}
                            disabled={regOtp.length < 6 || regTimerSecs === 0}>
                            Verify OTP
                          </button>
                          {regResendSecs > 0
                            ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resend in {regResendSecs}s</span>
                            : <button type="button" className="auth-switch-btn" style={{ fontSize: 12 }}
                                onClick={handleRegResend}>Resend OTP</button>
                          }
                        </div>
                        <button type="button" className="reg-aadhaar-cancel"
                          onClick={() => { setRegAadhaarStep('input'); setRegOtp(''); setRegAadhaarErr(''); setRegAadhaarOk(''); clearInterval(regTimerRef.current); }}>
                          ← Back
                        </button>
                      </div>
                    )}

                    {/* Step: verified — success state */}
                    {regAadhaarStep === 'verified' && (
                      <div className="reg-aadhaar-verified-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>
                          Demo Aadhaar <strong>XXXX-XXXX-{regAadhaar.slice(-4)}</strong> verified
                        </span>
                        <button type="button" className="reg-aadhaar-cancel"
                          onClick={() => { setRegAadhaarStep('idle'); setRegAadhaar(''); setRegOtp(''); setRegAadhaarOk(''); }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* ── /Inline Aadhaar ─────────────────────────────────── */}

                <button type="submit" className="btn btn-primary btn-full btn-lg"
                  disabled={loading} style={{ marginTop: 'var(--sp-4)' }}>
                  {loading
                    ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> {t('login.pleaseWait')}</>
                    : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
                </button>
              </form>

              <div className="auth-footer-links">
                <p className="auth-switch">
                  {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}{' '}
                  <button className="auth-switch-btn" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} type="button">
                    {mode === 'login' ? t('login.createOne') : t('login.signInLink')}
                  </button>
                </p>
                <p className="auth-switch">
                  {t('login.areYouAdmin')}{' '}
                  <a href="/admin/login" className="auth-switch-btn">{t('login.adminLogin')}</a>
                </p>
              </div>
            </>
          )}

        </div>
      </div>

      <style>{`
        /* ── Layout ─────────────────────────────────────────────────────── */
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

        /* ── Tabs — 3-tab variant ───────────────────────────────────────── */
        .auth-tabs {
          display: flex; background: var(--bg); border-radius: var(--radius-sm);
          padding: 4px; margin-bottom: var(--sp-6); border: 1px solid var(--border);
        }
        .auth-tab {
          flex: 1; padding: 8px 4px; font-family: var(--font); font-size: 13px; font-weight: 500;
          border: none; border-radius: 4px; background: transparent;
          color: var(--text-secondary); cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }
        .auth-tab.active {
          background: var(--surface); color: var(--text-primary);
          box-shadow: var(--shadow-sm); font-weight: 600;
        }
        /* ── Form header ────────────────────────────────────────────────── */
        .auth-form-header { margin-bottom: var(--sp-5); }
        .auth-form-header h2 { margin-bottom: 4px; color: var(--text-primary); }
        .auth-form-header p  { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

        /* ── Footer links ───────────────────────────────────────────────── */
        .auth-footer-links { margin-top: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-2); }
        .auth-switch { text-align: center; font-size: 13px; color: var(--text-secondary); margin: 0; }
        .auth-switch-btn {
          background: none; border: none; color: var(--primary); font-size: 13px; font-weight: 500;
          cursor: pointer; padding: 0; font-family: var(--font); text-decoration: none;
          transition: color var(--transition-fast);
        }
        .auth-switch-btn:hover { color: var(--primary-hover); text-decoration: underline; }
        .auth-switch-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Aadhaar-specific ───────────────────────────────────────────── */
        .adhr-disclaimer {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 8px; padding: 10px 14px;
          font-size: 12px; color: #92400e; line-height: 1.55;
          margin-bottom: var(--sp-4);
        }

        .adhr-number-input {
          font-size: 20px !important;
          font-weight: 700 !important;
          letter-spacing: 4px !important;
          font-family: 'Courier New', monospace !important;
        }
        .adhr-input-err { border-color: var(--danger) !important; }

        /* Timer row */
        .adhr-timer-row {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; padding: 9px 14px; margin-bottom: var(--sp-3);
        }

        /* OTP boxes */
        .lr-otp-boxes {
          display: flex; gap: 8px; justify-content: center;
          margin-top: var(--sp-2);
        }
        .lr-otp-box {
          width: 50px; height: 58px;
          border: 2px solid var(--border); border-radius: 10px;
          text-align: center; font-size: 22px; font-weight: 800;
          color: var(--text-primary); background: var(--bg); outline: none;
          font-family: 'Courier New', monospace;
          transition: border-color 0.15s, box-shadow 0.15s;
          caret-color: transparent;
        }
        .lr-otp-box:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .lr-otp-filled { border-color: var(--primary); background: var(--primary-light); }
        .lr-otp-box:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Demo hint */
        .adhr-hint-box {
          margin-top: 10px; background: var(--bg);
          border: 1px solid var(--border); border-radius: 10px;
          padding: 14px; text-align: left;
        }
        .adhr-hint-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
        }
        .adhr-hint-btn {
          background: none; border: 1px solid var(--border);
          border-radius: 6px; padding: 7px 10px;
          font-size: 13px; font-weight: 700; letter-spacing: 2px;
          color: #1e3a8a; cursor: pointer;
          font-family: 'Courier New', monospace;
          transition: background 0.12s, border-color 0.12s;
          white-space: nowrap;
        }
        .adhr-hint-btn:hover { background: var(--primary-light); border-color: var(--primary); }

        /* Success alert */
        .alert-success {
          background: #f0fdf4; color: #15803d;
          border: 1px solid #bbf7d0; border-radius: var(--radius-sm);
          padding: 10px 14px; font-size: 13px;
        }

        /* ── Register inline Aadhaar section ────────────────────────────── */
        .reg-aadhaar-section {
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-4);
          margin-bottom: var(--sp-3);
          background: var(--bg);
          transition: border-color 0.2s;
        }
        .reg-aadhaar-section:focus-within { border-color: var(--primary); }

        .reg-aadhaar-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .reg-aadhaar-label {
          font-size: 13px; font-weight: 700; color: var(--text-primary);
          font-family: var(--font);
        }
        .reg-aadhaar-badge-demo {
          font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
          background: #fef3c7; color: #92400e;
          border: 1px solid #fde68a; border-radius: 999px; padding: 2px 8px;
        }
        .reg-aadhaar-badge-verified {
          font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
          background: #f0fdf4; color: #15803d;
          border: 1px solid #86efac; border-radius: 999px; padding: 2px 8px;
        }

        .reg-aadhaar-open-btn {
          width: 100%; padding: 9px;
          border: 1.5px dashed var(--border); border-radius: var(--radius-sm);
          background: none; color: var(--primary);
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: var(--font);
          transition: background 0.14s, border-color 0.14s;
        }
        .reg-aadhaar-open-btn:hover {
          background: var(--primary-light); border-color: var(--primary);
        }

        .reg-aadhaar-disclaimer {
          font-size: 11px; color: #92400e; background: #fffbeb;
          border: 1px solid #fde68a; border-radius: 6px;
          padding: 7px 10px; margin-bottom: 10px; line-height: 1.5;
        }

        .reg-aadhaar-body { display: flex; flex-direction: column; gap: 8px; }

        .reg-aadhaar-row {
          display: flex; gap: 8px; align-items: stretch;
        }
        .reg-aadhaar-input {
          flex: 1; min-width: 0;
          font-size: 16px !important;
          letter-spacing: 3px !important;
          padding: 9px 12px !important;
        }
        .reg-aadhaar-send-btn {
          flex-shrink: 0; padding: 0 16px !important;
          font-size: 13px !important; white-space: nowrap;
          height: auto;
        }

        .reg-aadhaar-hint-toggle {
          font-size: 11px !important; color: var(--text-muted) !important;
          align-self: flex-start;
        }
        .reg-aadhaar-hint-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
        }

        .reg-aadhaar-timer {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 6px; padding: 6px 12px;
        }

        .reg-aadhaar-otp-actions {
          display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;
        }

        .reg-aadhaar-err {
          font-size: 12px; color: var(--danger);
          background: var(--danger-light); border: 1px solid #fca5a5;
          border-radius: 6px; padding: 6px 10px; margin: 0;
        }
        .reg-aadhaar-ok {
          font-size: 12px; color: var(--success);
          background: var(--success-light); border: 1px solid #86efac;
          border-radius: 6px; padding: 6px 10px; margin: 0;
        }

        .reg-aadhaar-verified-row {
          display: flex; align-items: center; gap: 8px;
          color: var(--success); font-size: 13px; font-weight: 600;
          background: var(--success-light); border: 1px solid #86efac;
          border-radius: var(--radius-sm); padding: 8px 12px;
        }
        .reg-aadhaar-verified-row svg { flex-shrink: 0; }

        .reg-aadhaar-cancel {
          background: none; border: none; cursor: pointer;
          font-size: 11px; color: var(--text-muted); font-family: var(--font);
          padding: 0; align-self: flex-start;
          transition: color 0.12s;
        }
        .reg-aadhaar-cancel:hover { color: var(--danger); }

        /* ── Responsive ─────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .auth-page     { flex-direction: column; }
          .auth-left     { padding: var(--sp-10) var(--sp-6); min-height: 260px; }
          .auth-headline { font-size: 26px; }
          .auth-right    { width: 100%; padding: var(--sp-8) var(--sp-5); }
          .auth-form-box { max-width: 100%; }
          .lr-otp-box    { width: 44px; height: 52px; font-size: 20px; }
          .adhr-hint-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 400px) {
          .auth-tab { font-size: 11px; padding: 7px 2px; }
          .lr-otp-box { width: 40px; height: 48px; font-size: 18px; }
        }
      `}</style>
    </div>
  );
}
