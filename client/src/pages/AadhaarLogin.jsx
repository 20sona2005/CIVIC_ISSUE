/**
 * AadhaarLogin.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo Aadhaar Verification page — College Project Only.
 * Accepts a 12-digit demo Aadhaar number, validates it, calls the backend,
 * and navigates to the OTP page on success.
 *
 * DISCLAIMER: This is a simulated academic prototype. It does NOT connect
 * to UIDAI or any real Aadhaar infrastructure.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// ── Allowed demo numbers (client-side hint only — real check is on backend) ──
const DEMO_NUMBERS = [
  '111122223333',
  '222233334444',
  '333344445555',
  '444455556666',
  '555566667777',
];

export default function AadhaarLogin() {
  const [aadhaar, setAadhaar]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showHint, setShowHint] = useState(false);

  const navigate = useNavigate();

  // ── Format input as XXXX XXXX XXXX while typing ──────────────────────────
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaar(raw);
    setError('');
  };

  const displayValue = aadhaar
    .replace(/(\d{4})(\d{1,4})?(\d{1,4})?/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!aadhaar) {
      setError('Please enter your Demo Aadhaar number.');
      return;
    }
    if (aadhaar.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/aadhaar/verify-aadhaar', {
        aadhaarNumber: aadhaar,
      });

      // Navigate to OTP page, carry userId + maskedEmail as state
      navigate('/aadhaar/otp', {
        state: {
          userId:      data.userId,
          maskedEmail: data.maskedEmail,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adhr-page">
      <div className="adhr-card">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="adhr-header">
          <div className="adhr-logo">🏛️</div>
          <h1 className="adhr-title">Civic Issue Management System</h1>
          <div className="adhr-demo-badge">
            🎓 Demo Aadhaar Verification — College Project Only
          </div>
        </div>

        {/* ── Disclaimer ─────────────────────────────────────────────────── */}
        <div className="adhr-disclaimer">
          <strong>⚠️ Academic Prototype Notice:</strong> This verification
          is simulated for a final-year college project. It does{' '}
          <strong>NOT</strong> connect to UIDAI or any real Aadhaar system.
          Only the 5 demo Aadhaar numbers below are accepted.
        </div>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="adhr-form-group">
            <label className="adhr-label" htmlFor="aadhaar">
              Demo Aadhaar Number
            </label>
            <input
              id="aadhaar"
              type="text"
              inputMode="numeric"
              className={`adhr-input ${error ? 'adhr-input-error' : ''}`}
              placeholder="XXXX XXXX XXXX"
              value={displayValue}
              onChange={handleChange}
              maxLength={14}          /* 12 digits + 2 spaces */
              autoComplete="off"
              autoFocus
              aria-describedby={error ? 'adhr-err' : undefined}
            />
            {error && (
              <p id="adhr-err" className="adhr-error" role="alert">
                {error}
              </p>
            )}
            <p className="adhr-input-hint">
              Enter 12 digits — letters not allowed.
            </p>
          </div>

          <button
            type="submit"
            className="adhr-btn"
            disabled={loading}
          >
            {loading ? (
              <><span className="adhr-spinner" /> Verifying…</>
            ) : (
              'Verify Aadhaar →'
            )}
          </button>
        </form>

        {/* ── Demo numbers hint ──────────────────────────────────────────── */}
        <div className="adhr-hint-section">
          <button
            type="button"
            className="adhr-hint-toggle"
            onClick={() => setShowHint(h => !h)}
          >
            {showHint ? '▲ Hide' : '▼ Show'} demo Aadhaar numbers
          </button>

          {showHint && (
            <div className="adhr-hint-box">
              <p className="adhr-hint-title">
                Use any of these 5 demo numbers:
              </p>
              <ul className="adhr-hint-list">
                {DEMO_NUMBERS.map(n => (
                  <li key={n}>
                    <button
                      type="button"
                      className="adhr-hint-num"
                      onClick={() => { setAadhaar(n); setError(''); }}
                    >
                      {n.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="adhr-hint-note">
                Click any number to auto-fill the field.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Scoped styles ───────────────────────────────────────────────── */}
      <style>{`
        .adhr-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }

        .adhr-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 40px 40px 32px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: adhrFadeIn 0.3s ease;
        }
        @keyframes adhrFadeIn {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* Header */
        .adhr-header { text-align:center; margin-bottom: 24px; }
        .adhr-logo   { font-size:42px; margin-bottom:10px; line-height:1; }
        .adhr-title  {
          font-size:20px; font-weight:800; color:#1e3a8a;
          margin:0 0 10px; line-height:1.25; letter-spacing:-0.3px;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-demo-badge {
          display:inline-block;
          background:#fef3c7; color:#92400e;
          border:1px solid #fde68a; border-radius:999px;
          font-size:11px; font-weight:700; padding:4px 14px;
          letter-spacing:0.02em;
        }

        /* Disclaimer */
        .adhr-disclaimer {
          background:#eff6ff; border:1px solid #bfdbfe;
          border-radius:8px; padding:12px 16px;
          font-size:12px; color:#1e40af; line-height:1.6;
          margin-bottom:24px;
        }

        /* Form */
        .adhr-form-group  { margin-bottom:20px; }
        .adhr-label {
          display:block; font-size:13px; font-weight:600;
          color:#374151; margin-bottom:7px;
          font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-input {
          width:100%; padding:13px 16px;
          border:2px solid #e5e7eb; border-radius:10px;
          font-size:20px; font-weight:700; letter-spacing:4px;
          color:#111827; outline:none;
          font-family:'Courier New',monospace;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        .adhr-input:focus {
          border-color:#2563eb;
          box-shadow:0 0 0 4px rgba(37,99,235,0.12);
        }
        .adhr-input-error { border-color:#dc2626 !important; }
        .adhr-input::placeholder { letter-spacing:2px; color:#9ca3af; font-size:16px; }
        .adhr-input-hint {
          font-size:11px; color:#9ca3af; margin:5px 0 0;
          font-family:'Inter',system-ui,sans-serif;
        }

        /* Error */
        .adhr-error {
          font-size:13px; color:#dc2626; margin:6px 0 0;
          font-family:'Inter',system-ui,sans-serif;
        }

        /* Button */
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
        .adhr-btn:hover:not(:disabled) { opacity:0.92; transform:translateY(-1px); }
        .adhr-btn:disabled { opacity:0.55; cursor:not-allowed; transform:none; }

        /* Spinner */
        .adhr-spinner {
          width:15px; height:15px;
          border:2px solid rgba(255,255,255,0.35);
          border-top-color:#fff; border-radius:50%;
          animation:adhrSpin 0.7s linear infinite; flex-shrink:0;
        }
        @keyframes adhrSpin { to { transform:rotate(360deg); } }

        /* Hint section */
        .adhr-hint-section { margin-top:20px; text-align:center; }
        .adhr-hint-toggle {
          background:none; border:none; cursor:pointer;
          font-size:12px; color:#6b7280; font-weight:500;
          font-family:'Inter',system-ui,sans-serif;
          transition:color 0.12s;
        }
        .adhr-hint-toggle:hover { color:#2563eb; }

        .adhr-hint-box {
          margin-top:12px; background:#f9fafb;
          border:1px solid #e5e7eb; border-radius:10px;
          padding:16px; text-align:left;
        }
        .adhr-hint-title {
          font-size:12px; font-weight:600; color:#374151;
          margin:0 0 10px; font-family:'Inter',system-ui,sans-serif;
        }
        .adhr-hint-list {
          list-style:none; margin:0; padding:0;
          display:flex; flex-direction:column; gap:6px;
        }
        .adhr-hint-num {
          background:none; border:1px solid #d1d5db;
          border-radius:6px; padding:7px 14px;
          font-size:14px; font-weight:700; letter-spacing:3px;
          color:#1e3a8a; cursor:pointer; width:100%;
          font-family:'Courier New',monospace;
          transition:background 0.12s, border-color 0.12s;
        }
        .adhr-hint-num:hover {
          background:#eff6ff; border-color:#2563eb;
        }
        .adhr-hint-note {
          font-size:11px; color:#9ca3af; margin:10px 0 0;
          font-family:'Inter',system-ui,sans-serif;
        }

        /* Responsive */
        @media (max-width:480px) {
          .adhr-card  { padding:28px 20px 24px; }
          .adhr-title { font-size:17px; }
          .adhr-input { font-size:18px; }
        }
      `}</style>
    </div>
  );
}
