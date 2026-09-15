/**
 * AadhaarOtp.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * OTP verification page for Demo Aadhaar flow.
 * Features:
 *   - 6-box OTP input (keyboard nav + paste support)
 *   - 5-minute countdown timer
 *   - Resend OTP with 60-second cooldown
 *   - Loading, error, and success states
 *   - On success: stores JWT + user in localStorage, redirects to /
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OTP_EXPIRY_SECS  = 5 * 60;   // 5 minutes
const RESEND_COOLDOWN  = 60;        // seconds

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled }) {
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (e, idx) => {
    const inputs = e.currentTarget.closest('.adhr-otp-boxes').querySelectorAll('input');
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
    <div className="adhr-otp-boxes" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`adhr-otp-box ${d.trim() ? 'adhr-otp-filled' : ''}`}
          value={d.trim()}
          onChange={() => {}}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          autoComplete="one-time-code"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function useCountdown(initialSecs) {
  const [secs, setSecs] = useState(initialSecs);
  const intervalRef = useRef(null);

  const start = useCallback((from = initialSecs) => {
    setSecs(from);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, [initialSecs]);

  useEffect(() => { start(); return () => clearInterval(intervalRef.current); }, [start]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return { secs, fmt: fmt(secs), start, expired: secs === 0 };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AadhaarOtp() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  // State passed from AadhaarLogin
  const { userId, maskedEmail } = location.state || {};

  const [otp, setOtp]               = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const resendIntervalRef = useRef(null);

  const { secs: timerSecs, fmt: timerFmt, start: restartTimer, expired: timerExpired }
    = useCountdown(OTP_EXPIRY_SECS);

  // Redirect back if navigated here directly without state
  useEffect(() => {
    if (!userId) navigate('/aadhaar', { replace: true });
  }, [userId, navigate]);

  // Resend cooldown ticker
  useEffect(() => {
    resendIntervalRef.current = setInterval(() => {
      setResendCooldown(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(resendIntervalRef.current);
  }, []);

  const resetResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    if (timerExpired) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/aadhaar/verify-otp', { userId, otp });

      setSuccess('OTP verified! Redirecting to dashboard…');

      // Store in AuthContext (same pattern as existing login)
      login(data.user, data.token);

      // Small delay so user sees the success message
      setTimeout(() => navigate('/'), 1200);

    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(''); setSuccess('');

    try {
      const { data } = await api.post('/aadhaar/resend-otp', { userId });
      setSuccess(data.message || 'New OTP sent to your email.');
      setOtp('');
      restartTimer();
      resetResendCooldown();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP.';
      const wait = err.response?.data?.waitSeconds;
      setError(msg);
      if (wait) setResendCooldown(wait);
    }
  };

  if (!userId) return null;

  const timerColor = timerSecs <= 60 ? '#dc2626' : timerSecs <= 120 ? '#f59e0b' : '#16a34a';

  return (
    <div className="adhr-page">
      <div className="adhr-card">

        {/* Header */}
        <div className="adhr-header">
          <div className="adhr-logo">🔐</div>
          <h1 className="adhr-title">OTP Verification</h1>
          <p className="adhr-subtitle">
            An OTP has been sent to your registered email.
          </p>
          {maskedEmail && (
            <p className="adhr-masked-email">📧 {maskedEmail}</p>
          )}
        </div>

        {/* Timer */}
        <div className="adhr-timer-row">
          <span className="adhr-timer-label">OTP expires in</span>
          <span className="adhr-timer-val" style={{ color: timerColor }}>
            {timerExpired ? 'Expired' : timerFmt}
          </span>
        </div>
        {timerExpired && (
          <div className="adhr-alert adhr-alert-warn">
            ⏰ OTP has expired. Click <strong>Resend OTP</strong> to get a new one.
          </div>
        )}

        {/* Messages */}
        {error   && <div className="adhr-alert adhr-alert-error"   role="alert">{error}</div>}
        {success && <div className="adhr-alert adhr-alert-success" role="status">{success}</div>}

        {/* OTP input */}
        <form onSubmit={handleVerify} noValidate>
          <div className="adhr-form-group">
            <label className="adhr-label">Enter 6-Digit OTP</label>
            <OtpBoxes
              value={otp}
              onChange={setOtp}
              disabled={loading || !!success || timerExpired}
            />
          </div>

          <button
            type="submit"
            className="adhr-btn"
            disabled={loading || otp.length < 6 || !!success || timerExpired}
          >
            {loading ? (
              <><span className="adhr-spinner" /> Verifying…</>
            ) : (
              '✓ Verify OTP'
            )}
          </button>
        </form>

        {/* Resend section */}
        <div className="adhr-resend-row">
          <span className="adhr-resend-label">Didn't receive the OTP?</span>
          {resendCooldown > 0 ? (
            <span className="adhr-resend-wait">
              Resend in <strong>{resendCooldown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              className="adhr-resend-btn"
              onClick={handleResend}
              disabled={loading}
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Back link */}
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button
            type="button"
            className="adhr-back-link"
            onClick={() => navigate('/aadhaar')}
          >
            ← Back to Aadhaar entry
          </button>
        </div>

        {/* Demo notice */}
        <div className="adhr-demo-note">
          🎓 Demo Aadhaar Verification — College Project Only
        </div>
      </div>

      <style>{`
        .adhr-page {
          min-height:100vh;
          background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);
          display:flex; align-items:center; justify-content:center;
          padding:24px 16px;
        }
        .adhr-card {
          background:#ffffff; border-radius:16px;
          padding:36px 40px 28px; width:100%; max-width:440px;
          box-shadow:0 20px 60px rgba(0,0,0,0.2);
          animation:adhrFadeIn 0.3s ease;
        }
        @keyframes adhrFadeIn {
          from{opacity:0;transform:translateY(16px);}
          to{opacity:1;transform:translateY(0);}
        }

        /* Header */
        .adhr-header   { text-align:center; margin-bottom:20px; }
        .adhr-logo     { font-size:40px; margin-bottom:8px; line-height:1; }
        .adhr-title    {
          font-size:22px; font-weight:800; color:#1e3a8a;
          margin:0 0 6px; font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-subtitle {
          font-size:13px; color:#6b7280; margin:0 0 4px;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-masked-email {
          font-size:13px; font-weight:600; color:#2563eb;
          margin:4px 0 0; font-family:'Inter',system-ui,sans-serif;
        }

        /* Timer */
        .adhr-timer-row {
          display:flex; align-items:center; justify-content:space-between;
          background:#f9fafb; border:1px solid #e5e7eb;
          border-radius:8px; padding:10px 16px; margin-bottom:16px;
        }
        .adhr-timer-label {
          font-size:13px; color:#6b7280;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-timer-val {
          font-size:18px; font-weight:800;
          font-family:'Courier New',monospace; transition:color 0.3s;
        }

        /* Alerts */
        .adhr-alert {
          border-radius:8px; padding:10px 14px;
          font-size:13px; margin-bottom:14px; line-height:1.5;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-alert-error   { background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; }
        .adhr-alert-success { background:#f0fdf4; color:#16a34a; border:1px solid #86efac; }
        .adhr-alert-warn    { background:#fffbeb; color:#92400e; border:1px solid #fde68a; margin-bottom:14px; }

        /* Form */
        .adhr-form-group  { margin-bottom:20px; }
        .adhr-label {
          display:block; font-size:13px; font-weight:600;
          color:#374151; margin-bottom:12px; text-align:center;
          font-family:'Inter',system-ui,sans-serif;
        }

        /* OTP boxes */
        .adhr-otp-boxes {
          display:flex; gap:10px; justify-content:center;
        }
        .adhr-otp-box {
          width:52px; height:60px;
          border:2px solid #e5e7eb; border-radius:10px;
          text-align:center; font-size:24px; font-weight:800;
          color:#111827; background:#fff; outline:none;
          font-family:'Courier New',monospace;
          transition:border-color 0.15s, box-shadow 0.15s;
          caret-color:transparent;
        }
        .adhr-otp-box:focus {
          border-color:#2563eb;
          box-shadow:0 0 0 4px rgba(37,99,235,0.12);
        }
        .adhr-otp-filled { border-color:#2563eb; background:#eff6ff; }
        .adhr-otp-box:disabled { opacity:0.5; cursor:not-allowed; }

        /* Verify button */
        .adhr-btn {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#1e3a8a,#2563eb);
          color:#fff; border:none; border-radius:10px;
          font-size:15px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          font-family:'Inter',system-ui,sans-serif;
          transition:opacity 0.15s, transform 0.15s;
          box-shadow:0 4px 14px rgba(37,99,235,0.35);
        }
        .adhr-btn:hover:not(:disabled){ opacity:0.92; transform:translateY(-1px); }
        .adhr-btn:disabled{ opacity:0.45; cursor:not-allowed; transform:none; }

        /* Spinner */
        .adhr-spinner {
          width:14px; height:14px;
          border:2px solid rgba(255,255,255,0.35);
          border-top-color:#fff; border-radius:50%;
          animation:adhrSpin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes adhrSpin{ to{transform:rotate(360deg);} }

        /* Resend row */
        .adhr-resend-row {
          display:flex; align-items:center; justify-content:center;
          gap:10px; margin-top:16px;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-resend-label { font-size:13px; color:#6b7280; }
        .adhr-resend-wait  { font-size:13px; color:#9ca3af; }
        .adhr-resend-btn {
          background:none; border:none; cursor:pointer;
          font-size:13px; font-weight:600; color:#2563eb;
          font-family:'Inter',system-ui,sans-serif;
          transition:color 0.12s;
        }
        .adhr-resend-btn:hover:not(:disabled){ color:#1d4ed8; text-decoration:underline; }
        .adhr-resend-btn:disabled{ opacity:0.5; cursor:not-allowed; }

        /* Back link */
        .adhr-back-link {
          background:none; border:none; cursor:pointer;
          font-size:12px; color:#9ca3af;
          font-family:'Inter',system-ui,sans-serif;
          transition:color 0.12s;
        }
        .adhr-back-link:hover{ color:#6b7280; }

        /* Demo note */
        .adhr-demo-note {
          margin-top:20px; text-align:center;
          font-size:11px; color:#9ca3af;
          font-family:'Inter',system-ui,sans-serif;
        }

        /* Responsive */
        @media (max-width:480px){
          .adhr-card { padding:24px 16px 20px; }
          .adhr-otp-box { width:44px; height:52px; font-size:20px; }
          .adhr-title { font-size:19px; }
        }
      `}</style>
    </div>
  );
}
