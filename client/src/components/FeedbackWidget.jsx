/**
 * FeedbackWidget.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown on a resolved issue's detail page (citizen view only).
 *
 * Flow:
 *   Step 1 — "Was your issue resolved?" → 👍 Yes / 👎 No
 *   Step 2a (Yes) — Star rating 1–5
 *   Step 2b (No)  — Confirm reopening (auto-escalation warning)
 *   Step 3 — Optional free-text comment → Submit
 *   Done   — Thank-you / escalation confirmation screen
 *
 * Props:
 *   issue        {object}   — full issue document from IssueDetail
 *   onFeedbackSubmitted {fn} — called with the updated issue fields after success
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

// ── Star rating sub-component ─────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const { t } = useTranslation();
  const labels = {
    1: t('feedback.poor'), 2: t('feedback.fair'),
    3: t('feedback.good'), 4: t('feedback.veryGood'), 5: t('feedback.excellent'),
  };
  return (
    <div className="fw-stars-wrap">
      <div className="fw-stars" role="group" aria-label={t('feedback.rateAria')}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= (hovered || value);
          return (
            <button key={star} type="button"
              className={`fw-star ${active ? 'fw-star-active' : ''}`}
              onClick={() => !disabled && onChange(star)}
              onMouseEnter={() => !disabled && setHovered(star)}
              onMouseLeave={() => !disabled && setHovered(0)}
              aria-label={`${star} star${star !== 1 ? 's' : ''} — ${labels[star]}`}
              disabled={disabled}>
              ★
            </button>
          );
        })}
      </div>
      {(hovered || value) > 0 && (
        <span className="fw-star-label">{labels[hovered || value]}</span>
      )}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function FeedbackWidget({ issue, onFeedbackSubmitted }) {
  const { t } = useTranslation();
  // If feedback already submitted, show the read-only summary instead
  const alreadySubmitted = issue.feedbackAt !== null && issue.wasResolved !== null;

  const [step, setStep]         = useState('ask');   // ask | rate | confirm-no | comment | done
  const [wasResolved, setWasResolved] = useState(null);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);   // server response after submit

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (wasResolved && rating === 0) {
      setError('Please select a star rating before submitting.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/feedback/submit', {
        issueId:         issue._id,
        wasResolved,
        rating:          wasResolved ? rating : undefined,
        feedbackComment: comment.trim() || undefined,
      });
      setResult(data);
      setStep('done');
      if (onFeedbackSubmitted) onFeedbackSubmitted(data.issue);
    } catch (err) {
      setError(err.response?.data?.message || t('feedback.submitError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Already submitted — show summary card ──────────────────────────────────
  if (alreadySubmitted) {
    return (
      <FeedbackSummary issue={issue} />
    );
  }

  return (
    <div className="fw-card">

      {/* ── Step: ask ─────────────────────────────────────────────────────── */}
      {step === 'ask' && (
        <>
          <div className="fw-header">
            <span className="fw-emoji">🔍</span>
            <div>
              <h3 className="fw-title">{t('feedback.askTitle')}</h3>
              <p className="fw-sub">{t('feedback.askSub')}</p>
            </div>
          </div>
          <div className="fw-ask-btns">
            <button className="fw-ask-btn fw-ask-yes" onClick={() => { setWasResolved(true); setStep('rate'); }} type="button">
              <span className="fw-ask-icon">👍</span>
              <span>{t('feedback.yesFixed')}</span>
            </button>
            <button className="fw-ask-btn fw-ask-no" onClick={() => { setWasResolved(false); setStep('confirm-no'); }} type="button">
              <span className="fw-ask-icon">👎</span>
              <span>{t('feedback.noStillProblem')}</span>
            </button>
          </div>
        </>
      )}

      {/* ── Step: rate (Yes path) ─────────────────────────────────────────── */}
      {step === 'rate' && (
        <>
          <div className="fw-header">
            <span className="fw-emoji">⭐</span>
            <div>
              <h3 className="fw-title">{t('feedback.rateTitle')}</h3>
              <p className="fw-sub">{t('feedback.rateSub')}</p>
            </div>
          </div>
          <StarRating value={rating} onChange={setRating} disabled={loading} />
          <button className="fw-next-btn"
            onClick={() => { if (rating > 0) setStep('comment'); else setError(t('feedback.rateError')); }}
            type="button" disabled={rating === 0}>
            {t('feedback.nextBtn')}
          </button>
          {error && <p className="fw-error">{error}</p>}
          <button className="fw-back-link" onClick={() => { setStep('ask'); setError(''); }} type="button">
            {t('feedback.backBtn')}
          </button>
        </>
      )}

      {/* ── Step: confirm-no (No path) ────────────────────────────────────── */}
      {step === 'confirm-no' && (
        <>
          <div className="fw-header">
            <span className="fw-emoji">🚨</span>
            <div>
              <h3 className="fw-title">{t('feedback.escalateTitle')}</h3>
              <p className="fw-sub">{t('feedback.escalateSub')}</p>
            </div>
          </div>
          <ul className="fw-escalate-list">
            <li><span className="fw-escalate-dot fw-dot-reopen" />{t('feedback.escalateAction1')}</li>
            <li><span className="fw-escalate-dot fw-dot-escalate" />{t('feedback.escalateAction2')}</li>
            <li><span className="fw-escalate-dot fw-dot-notify" />{t('feedback.escalateAction3')}</li>
          </ul>
          <button className="fw-next-btn fw-next-escalate" onClick={() => setStep('comment')} type="button">
            {t('feedback.continueEscalate')}
          </button>
          <button className="fw-back-link" onClick={() => { setStep('ask'); setError(''); }} type="button">
            {t('feedback.backBtn')}
          </button>
        </>
      )}

      {/* ── Step: comment (both paths) ────────────────────────────────────── */}
      {step === 'comment' && (
        <>
          <div className="fw-header">
            <span className="fw-emoji">💬</span>
            <div>
              <h3 className="fw-title">{t('feedback.commentTitle')}</h3>
              <p className="fw-sub">{t('feedback.commentSub')}</p>
            </div>
          </div>
          <textarea className="fw-textarea"
            placeholder={t('feedback.commentPlaceholder')}
            value={comment} onChange={e => setComment(e.target.value)}
            maxLength={1000} rows={3} disabled={loading}
            aria-label={t('feedback.commentAria')} />
          <div className="fw-char-count">{t('feedback.charCount', { n: comment.length })}</div>
          {error && <p className="fw-error">{error}</p>}
          {wasResolved && rating > 0 && (
            <div className="fw-recap">
              {t('feedback.yourRating', { stars: '★'.repeat(rating) + '☆'.repeat(5 - rating) })}
            </div>
          )}
          <button className={`fw-submit-btn ${!wasResolved ? 'fw-submit-escalate' : ''}`}
            onClick={handleSubmit} disabled={loading} type="button">
            {loading ? (
              <><span className="fw-spinner" /> {t('feedback.submitting')}</>
            ) : wasResolved ? t('feedback.submitFeedback') : t('feedback.submitEscalate')}
          </button>
          <button className="fw-back-link"
            onClick={() => { setStep(wasResolved ? 'rate' : 'confirm-no'); setError(''); }}
            type="button" disabled={loading}>
            {t('feedback.backBtn')}
          </button>
        </>
      )}

      {/* ── Step: done ────────────────────────────────────────────────────── */}
      {step === 'done' && result && (
        wasResolved ? (
          <div className="fw-done fw-done-success">
            <div className="fw-done-icon">✅</div>
            <h3>{t('feedback.thankyouTitle')}</h3>
            <p>{t('feedback.thankyouBody')}</p>
            {rating > 0 && <div className="fw-done-stars">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</div>}
          </div>
        ) : (
          <div className="fw-done fw-done-escalated">
            <div className="fw-done-icon">🚨</div>
            <h3>{t('feedback.escalatedTitle')}</h3>
            <p>{t('feedback.escalatedBody')}</p>
          </div>
        )
      )}

      <style>{`
        /* ── Card wrapper ───────────────────────────────────────────────── */
        .fw-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-5) var(--sp-6);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: var(--sp-4);
        }

        /* ── Header row ─────────────────────────────────────────────────── */
        .fw-header {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-3);
        }
        .fw-emoji {
          font-size: 26px;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .fw-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 3px;
        }
        .fw-sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        /* ── Yes / No buttons ────────────────────────────────────────────── */
        .fw-ask-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-3);
        }
        .fw-ask-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-5) var(--sp-3);
          border-radius: var(--radius);
          border: 2px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font);
          color: var(--text-primary);
          transition: all 0.15s;
        }
        .fw-ask-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
        .fw-ask-yes:hover { border-color: var(--success); background: var(--success-light); color: var(--success); }
        .fw-ask-no:hover  { border-color: var(--danger);  background: var(--danger-light);  color: var(--danger);  }
        .fw-ask-icon { font-size: 28px; line-height: 1; }

        /* ── Stars ───────────────────────────────────────────────────────── */
        .fw-stars-wrap {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .fw-stars {
          display: flex;
          gap: 4px;
        }
        .fw-star {
          font-size: 34px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--border);
          line-height: 1;
          padding: 0;
          transition: color 0.1s, transform 0.1s;
        }
        .fw-star:hover, .fw-star-active { color: #f59e0b; }
        .fw-star:hover { transform: scale(1.15); }
        .fw-star:disabled { cursor: not-allowed; opacity: 0.6; }
        .fw-star-label {
          font-size: 13px;
          font-weight: 600;
          color: #f59e0b;
          min-width: 70px;
        }

        /* ── Escalation info list ────────────────────────────────────────── */
        .fw-escalate-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }
        .fw-escalate-list li {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }
        .fw-escalate-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .fw-dot-reopen   { background: var(--warning); }
        .fw-dot-escalate { background: var(--danger); }
        .fw-dot-notify   { background: var(--primary); }

        /* ── Textarea ────────────────────────────────────────────────────── */
        .fw-textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 13px;
          font-family: var(--font);
          color: var(--text-primary);
          background: var(--bg);
          resize: vertical;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          line-height: 1.55;
        }
        .fw-textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .fw-char-count {
          font-size: 11px;
          color: var(--text-muted);
          text-align: right;
          margin-top: -10px;
        }
        .fw-recap {
          font-size: 14px;
          color: #f59e0b;
          letter-spacing: 2px;
          text-align: center;
        }

        /* ── Next / submit buttons ───────────────────────────────────────── */
        .fw-next-btn {
          padding: 10px 20px;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--primary);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font);
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          align-self: flex-start;
        }
        .fw-next-btn:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .fw-next-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .fw-next-escalate { background: var(--danger); }
        .fw-next-escalate:hover:not(:disabled) { background: #b91c1c; }

        .fw-submit-btn {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--primary);
          color: #fff !important;
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s;
        }
        .fw-submit-btn:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .fw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .fw-submit-escalate { background: var(--danger); }
        .fw-submit-escalate:hover:not(:disabled) { background: #b91c1c; }

        /* ── Spinner ─────────────────────────────────────────────────────── */
        .fw-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: fwSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes fwSpin { to { transform: rotate(360deg); } }

        /* ── Back link ───────────────────────────────────────────────────── */
        .fw-back-link {
          background: none;
          border: none;
          font-size: 12px;
          color: var(--text-muted);
          cursor: pointer;
          font-family: var(--font);
          padding: 0;
          align-self: flex-start;
          transition: color 0.12s;
        }
        .fw-back-link:hover:not(:disabled) { color: var(--text-secondary); }

        /* ── Error ───────────────────────────────────────────────────────── */
        .fw-error {
          font-size: 13px;
          color: var(--danger);
          margin: -8px 0 0;
          padding: 8px 12px;
          background: var(--danger-light);
          border-radius: var(--radius-sm);
          border: 1px solid #fca5a5;
        }

        /* ── Done screens ────────────────────────────────────────────────── */
        .fw-done {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--sp-3);
          padding: var(--sp-4) 0;
        }
        .fw-done-icon { font-size: 40px; line-height: 1; }
        .fw-done h3   { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .fw-done p    { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0; max-width: 280px; }
        .fw-done-stars { font-size: 24px; color: #f59e0b; letter-spacing: 3px; }

        .fw-done-success { border-top: 3px solid var(--success); padding-top: var(--sp-5); }
        .fw-done-escalated { border-top: 3px solid var(--danger); padding-top: var(--sp-5); }

        /* ── Summary card (already-submitted state) ──────────────────────── */
        .fw-summary {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-4) var(--sp-5);
        }
        .fw-summary-header {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-bottom: var(--sp-3);
        }
        .fw-summary-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .fw-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-secondary);
          padding: 4px 0;
          border-bottom: 1px solid var(--border);
        }
        .fw-summary-row:last-child { border-bottom: none; }
        .fw-summary-val {
          font-weight: 600;
          color: var(--text-primary);
        }
        .fw-summary-stars { color: #f59e0b; letter-spacing: 1px; font-size: 14px; }
        .fw-escalated-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          background: var(--danger-light);
          color: var(--danger);
          border: 1px solid #fca5a5;
          border-radius: 999px;
          padding: 2px 10px;
        }
      `}</style>
    </div>
  );
}

// ── Read-only summary shown after feedback is already submitted ───────────────
function FeedbackSummary({ issue }) {
  const { t } = useTranslation();
  const date = issue.feedbackAt
    ? new Date(issue.feedbackAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="fw-summary">
      <div className="fw-summary-header">
        <span style={{ fontSize: 18 }}>{issue.wasResolved ? '✅' : '🚨'}</span>
        <p className="fw-summary-title">
          {issue.wasResolved ? t('feedback.summaryTitleResolved') : t('feedback.summaryTitleEscalated')}
        </p>
      </div>
      <div className="fw-summary-row">
        <span>{t('feedback.summaryResolution')}</span>
        <span className="fw-summary-val">{issue.wasResolved ? t('feedback.summaryYes') : t('feedback.summaryNo')}</span>
      </div>
      {issue.wasResolved && issue.rating && (
        <div className="fw-summary-row">
          <span>{t('feedback.summaryRating')}</span>
          <span className="fw-summary-stars fw-summary-val">{'★'.repeat(issue.rating)}{'☆'.repeat(5 - issue.rating)}</span>
        </div>
      )}
      {issue.feedbackComment && (
        <div className="fw-summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span>{t('feedback.summaryComment')}</span>
          <span className="fw-summary-val" style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-secondary)' }}>
            "{issue.feedbackComment}"
          </span>
        </div>
      )}
      <div className="fw-summary-row">
        <span>{t('feedback.summarySubmittedOn')}</span>
        <span className="fw-summary-val">{date}</span>
      </div>
      {issue.isEscalated && (
        <div style={{ marginTop: 10 }}>
          <span className="fw-escalated-badge">{t('feedback.escalatedBadge')}</span>
        </div>
      )}
      {issue.supervisorNote && (
        <div className="fw-summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
          <span>{t('feedback.summarySupervisorNote')}</span>
          <span className="fw-summary-val" style={{ fontWeight: 400, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{issue.supervisorNote}"
          </span>
        </div>
      )}
    </div>
  );
}
