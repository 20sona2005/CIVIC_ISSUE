/**
 * Chatbot.jsx
 * Floating chat widget — role-aware (citizen / admin).
 * Fully bilingual: sends selected language to backend and uses i18n for all UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length) {
      elements.push(
        <ul key={`ul-${key}`} className="cb-md-list">
          {listBuffer.map((item, i) => (
            <li key={i}>{applyInline(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const bulletMatch  = line.match(/^[•\-*]\s+(.+)/);
    const numberedMatch = line.match(/^\d+\.\s+(.+)/);
    if (bulletMatch || numberedMatch) {
      listBuffer.push((bulletMatch || numberedMatch)[1]);
    } else {
      flushList(idx);
      if (line.trim() === '') {
        elements.push(<div key={`br-${idx}`} style={{ height: '6px' }} />);
      } else {
        elements.push(<p key={`p-${idx}`} className="cb-md-p">{applyInline(line)}</p>);
      }
    }
  });
  flushList('end');
  return elements;
}

function applyInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

// ── Individual message bubble ─────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <div className={`cb-msg ${isBot ? 'cb-msg-bot' : 'cb-msg-user'}`}>
      {isBot && (
        <div className="cb-avatar" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
      )}
      <div className="cb-bubble">
        {isBot ? renderMarkdown(msg.content) : <p className="cb-md-p">{msg.content}</p>}
        <span className="cb-time">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Chatbot() {
  const { user, isAdmin }     = useAuth();
  const { t, i18n }           = useTranslation();

  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const prevOpenRef = useRef(false);

  // Track current language in a ref so sendMessage always reads the live value
  // regardless of when the useCallback was last recreated.
  const langRef = useRef('en');
  langRef.current = i18n.language?.startsWith('ta') ? 'ta' : 'en';

  // Translated suggestion chips — re-computed when language changes
  const suggestions = isAdmin
    ? [t('chatbot.adminQ1'), t('chatbot.adminQ2'), t('chatbot.adminQ3'), t('chatbot.adminQ4')]
    : [t('chatbot.citizenQ1'), t('chatbot.citizenQ2'), t('chatbot.citizenQ3'), t('chatbot.citizenQ4')];

  const buildWelcome = useCallback(() =>
    isAdmin
      ? t('chatbot.welcomeAdmin', { name: user?.name?.split(' ')[0] || 'Admin' })
      : t('chatbot.welcomeCitizen', { name: user?.name?.split(' ')[0] || 'there' }),
    [isAdmin, user, t]
  );

  // Show welcome message when window first opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: buildWelcome(), ts: Date.now() }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input on open
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
    prevOpenRef.current = open;
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setShowSuggestions(false);

    const userMsg = { role: 'user', content: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .slice(-6)
        .map(({ role, content }) => ({ role, content }));

      const { data } = await api.post('/chatbot/message', {
        message: trimmed,
        history,
        lang: langRef.current,   // read from ref — always the live language value
      });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, ts: Date.now() },
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.reply
        || err.response?.data?.message
        || t('chatbot.errorGeneric');
      setError(errMsg);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}`, ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, messages, t]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

  const handleClear = () => {
    setMessages([{ role: 'assistant', content: buildWelcome(), ts: Date.now() }]);
    setShowSuggestions(true);
    setError('');
  };

  if (!user) return null;

  return (
    <>
      {/* ── FAB ── */}
      <button
        className={`cb-fab ${open ? 'cb-fab-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? t('chatbot.closeLabel') : t('chatbot.openLabel')}
        title={open ? t('chatbot.closeTitle') : t('chatbot.askTitle')}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div className="cb-window" role="dialog" aria-label={t('chatbot.dialogLabel')}>

          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-header-avatar" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="cb-header-name">{t('chatbot.name')}</div>
                <div className="cb-header-status">
                  <span className="cb-status-dot" />
                  {isAdmin ? t('chatbot.adminStatus') : t('chatbot.citizenStatus')}
                </div>
              </div>
            </div>
            <div className="cb-header-actions">
              <button className="cb-icon-btn" onClick={handleClear}
                title={t('chatbot.clearConversation')} aria-label={t('chatbot.clearConversation')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button className="cb-icon-btn" onClick={() => setOpen(false)}
                title={t('chatbot.closeBtn')} aria-label={t('chatbot.closeLabel')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cb-messages" aria-live="polite" aria-label={t('chatbot.messagesLabel')}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && (
              <div className="cb-msg cb-msg-bot">
                <div className="cb-avatar" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div className="cb-bubble cb-typing" aria-label={t('chatbot.thinking')}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="cb-suggestions" aria-label={t('chatbot.suggestionsLabel')}>
              {suggestions.map((s) => (
                <button key={s} className="cb-chip" type="button"
                  onClick={() => sendMessage(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="cb-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="cb-input"
              type="text"
              placeholder={t('chatbot.inputPlaceholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              maxLength={500}
              autoComplete="off"
              aria-label={t('chatbot.inputLabel')}
            />
            <button type="submit" className="cb-send-btn"
              disabled={loading || !input.trim()}
              aria-label={t('chatbot.sendLabel')}>
              {loading ? (
                <span className="cb-send-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>

          <div className="cb-footer">
            {isAdmin ? t('chatbot.footerAdmin') : t('chatbot.footerCitizen')}
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        .cb-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 1000;
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--primary); color: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(37,99,235,0.45);
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .cb-fab:hover { background: var(--primary-hover); transform: scale(1.08); box-shadow: 0 6px 22px rgba(37,99,235,0.5); }
        .cb-fab.cb-fab-open { background: #374151; box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        .cb-fab.cb-fab-open:hover { background: #1f2937; }

        .cb-window {
          position: fixed; bottom: 92px; right: 28px; z-index: 999;
          width: 360px; max-height: 560px; border-radius: 16px;
          background: var(--surface); border: 1px solid var(--border);
          box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08);
          display: flex; flex-direction: column; overflow: hidden;
          animation: cbSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cbSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        .cb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; background: var(--primary); color: #fff; flex-shrink: 0;
        }
        .cb-header-left { display: flex; align-items: center; gap: 10px; }
        .cb-header-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cb-header-name { font-size: 14px; font-weight: 700; line-height: 1.2; letter-spacing: -0.1px; }
        .cb-header-status { font-size: 11px; opacity: 0.82; display: flex; align-items: center; gap: 5px; margin-top: 1px; }
        .cb-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; flex-shrink: 0; box-shadow: 0 0 0 2px rgba(74,222,128,0.3); }
        .cb-header-actions { display: flex; align-items: center; gap: 4px; }
        .cb-icon-btn {
          width: 28px; height: 28px; border-radius: 6px;
          background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: background 0.15s;
        }
        .cb-icon-btn:hover { background: rgba(255,255,255,0.28); }

        .cb-messages {
          flex: 1; overflow-y: auto; padding: 16px 14px 8px;
          display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth;
        }
        .cb-messages::-webkit-scrollbar { width: 4px; }
        .cb-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .cb-msg {
          display: flex; align-items: flex-end; gap: 7px;
          max-width: 92%; animation: cbFadeIn 0.18s ease;
        }
        @keyframes cbFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cb-msg-bot  { align-self: flex-start; }
        .cb-msg-user { align-self: flex-end; flex-direction: row-reverse; }
        .cb-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--primary-light); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 1px solid var(--primary-mid);
        }
        .cb-bubble {
          padding: 9px 12px; border-radius: 14px;
          font-size: 13px; line-height: 1.55; word-break: break-word; position: relative;
        }
        .cb-msg-bot  .cb-bubble { background: var(--bg); border: 1px solid var(--border); border-bottom-left-radius: 4px; color: var(--text-primary); }
        .cb-msg-user .cb-bubble { background: var(--primary); color: #ffffff !important; border-bottom-right-radius: 4px; }
        .cb-msg-user .cb-bubble *, .cb-msg-user .cb-bubble p,
        .cb-msg-user .cb-bubble strong, .cb-msg-user .cb-bubble .cb-md-p,
        .cb-msg-user .cb-bubble .cb-time { color: #ffffff !important; }

        .cb-md-p { margin: 0 0 4px; line-height: 1.55; }
        .cb-md-p:last-child { margin-bottom: 0; }
        .cb-md-list { margin: 4px 0 4px 16px; padding: 0; }
        .cb-md-list li { margin-bottom: 3px; font-size: 13px; line-height: 1.5; }
        .cb-time { display: block; font-size: 10px; margin-top: 5px; opacity: 0.55; text-align: right; }
        .cb-msg-bot .cb-time { text-align: left; }

        .cb-typing { display: flex; align-items: center; gap: 5px; padding: 12px 14px; min-width: 52px; }
        .cb-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); animation: cbBounce 1.2s ease-in-out infinite; }
        .cb-typing span:nth-child(2) { animation-delay: 0.2s; }
        .cb-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cbBounce {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }

        .cb-suggestions {
          display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px;
          border-top: 1px solid var(--border); background: var(--bg); flex-shrink: 0;
        }
        .cb-chip {
          font-size: 12px; font-family: var(--font); font-weight: 500;
          color: var(--primary); background: var(--primary-light);
          border: 1px solid var(--primary-mid); border-radius: 999px;
          padding: 4px 11px; cursor: pointer; transition: background 0.15s, color 0.15s; white-space: nowrap;
        }
        .cb-chip:hover:not(:disabled) { background: var(--primary); color: #fff; border-color: var(--primary); }
        .cb-chip:disabled { opacity: 0.5; cursor: not-allowed; }

        .cb-input-row {
          display: flex; align-items: center; gap: 8px; padding: 10px 12px;
          border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0;
        }
        .cb-input {
          flex: 1; border: 1px solid var(--border); border-radius: 8px;
          padding: 8px 12px; font-size: 13px; font-family: var(--font);
          color: var(--text-primary); background: var(--bg); outline: none;
          transition: border-color 0.15s, box-shadow 0.15s; min-width: 0;
        }
        .cb-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .cb-input::placeholder { color: var(--text-muted); }
        .cb-input:disabled { opacity: 0.6; cursor: not-allowed; }

        .cb-send-btn {
          width: 36px; height: 36px; border-radius: 8px; background: var(--primary);
          color: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        .cb-send-btn:hover:not(:disabled) { background: var(--primary-hover); transform: scale(1.06); }
        .cb-send-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .cb-send-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .cb-footer {
          font-size: 10px; text-align: center; color: var(--text-muted);
          padding: 5px 12px 8px; background: var(--surface); flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .cb-window { right: 12px; left: 12px; width: auto; bottom: 86px; max-height: 72vh; }
          .cb-fab    { bottom: 20px; right: 20px; }
        }
      `}</style>
    </>
  );
}
