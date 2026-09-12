/**
 * Chatbot.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating chat widget that automatically adapts to the logged-in user's role.
 * - Citizens: guidance, how-to, their own issue status
 * - Admins:   statistics, pending/recent issues, dashboard help
 *
 * Security: every message is sent to the backend with the JWT token attached
 * by the existing axios interceptor. The backend determines the role — the
 * frontend never sends or trusts a role field.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Handles **bold**, bullet lists, and newlines — no external dependency needed.
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
    const bulletMatch = line.match(/^[•\-*]\s+(.+)/);
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
  // Split on **bold** markers
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

// ── Suggested questions per role ──────────────────────────────────────────────
const CITIZEN_SUGGESTIONS = [
  'How do I report an issue?',
  'What are the issue categories?',
  'What does "In Progress" mean?',
  'Show my recent complaints',
];

const ADMIN_SUGGESTIONS = [
  'Give me a system overview',
  'Show pending issues',
  'Show recent issues',
  'Category breakdown',
];

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
  const { user, isAdmin } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);   // { role, content, ts }
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const prevOpenRef  = useRef(false);

  const suggestions = isAdmin ? ADMIN_SUGGESTIONS : CITIZEN_SUGGESTIONS;

  // Welcome message shown once when the window first opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcome = isAdmin
        ? `Hi ${user?.name?.split(' ')[0] || 'Admin'} 👋 I'm CivicBot. Ask me about issue stats, pending complaints, recent reports, or anything about the dashboard.`
        : `Hi ${user?.name?.split(' ')[0] || 'there'} 👋 I'm CivicBot. I can help you report issues, understand statuses, or check on your complaints.`;
      setMessages([{ role: 'assistant', content: welcome, ts: Date.now() }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when window opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Send a message (used by both the form submit and suggestion clicks)
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
      // Build history for context — send only role + content (no ts), last 6 msgs
      const history = [...messages, userMsg]
        .slice(-6)
        .map(({ role, content }) => ({ role, content }));

      const { data } = await api.post('/chatbot/message', {
        message: trimmed,
        history,
      });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, ts: Date.now() },
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.reply
        || err.response?.data?.message
        || 'Something went wrong. Please try again.';
      setError(errMsg);
      // Also show the error as a bot message so it's in context
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}`, ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
      // Re-focus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleClear = () => {
    setMessages([]);
    setShowSuggestions(true);
    setError('');
    // Re-trigger welcome message
    const welcome = isAdmin
      ? `Hi ${user?.name?.split(' ')[0] || 'Admin'} 👋 I'm CivicBot. Ask me about issue stats, pending complaints, recent reports, or anything about the dashboard.`
      : `Hi ${user?.name?.split(' ')[0] || 'there'} 👋 I'm CivicBot. I can help you report issues, understand statuses, or check on your complaints.`;
    setMessages([{ role: 'assistant', content: welcome, ts: Date.now() }]);
  };

  // Don't render at all if user is not logged in
  if (!user) return null;

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        className={`cb-fab ${open ? 'cb-fab-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chatbot' : 'Open chatbot'}
        title={open ? 'Close assistant' : 'Ask CivicBot'}
      >
        {open ? (
          /* X icon */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          /* Chat bubble icon */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div className="cb-window" role="dialog" aria-label="CivicBot assistant">

          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-header-avatar" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="cb-header-name">CivicBot</div>
                <div className="cb-header-status">
                  <span className="cb-status-dot" />
                  {isAdmin ? 'Admin assistant' : 'Citizen assistant'}
                </div>
              </div>
            </div>
            <div className="cb-header-actions">
              <button
                className="cb-icon-btn"
                onClick={handleClear}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button
                className="cb-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close chatbot"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="cb-messages" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="cb-msg cb-msg-bot">
                <div className="cb-avatar" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div className="cb-bubble cb-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips — shown initially */}
          {showSuggestions && (
            <div className="cb-suggestions" aria-label="Suggested questions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="cb-chip"
                  onClick={() => handleSuggestion(s)}
                  disabled={loading}
                  type="button"
                >
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
              placeholder="Ask me anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              maxLength={500}
              autoComplete="off"
              aria-label="Type your message"
            />
            <button
              type="submit"
              className="cb-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? (
                <span className="cb-send-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>

          <div className="cb-footer">Powered by CivicPulse AI · {isAdmin ? '🔑 Admin' : '👤 Citizen'}</div>
        </div>
      )}

      {/* ── All styles scoped inside this component ── */}
      <style>{`
        /* ── FAB button ───────────────────────────────────────────────────── */
        .cb-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 1000;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(37,99,235,0.45);
          transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .cb-fab:hover {
          background: var(--primary-hover);
          transform: scale(1.08);
          box-shadow: 0 6px 22px rgba(37,99,235,0.5);
        }
        .cb-fab.cb-fab-open {
          background: #374151;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        }
        .cb-fab.cb-fab-open:hover {
          background: #1f2937;
        }

        /* ── Chat window ──────────────────────────────────────────────────── */
        .cb-window {
          position: fixed;
          bottom: 92px;
          right: 28px;
          z-index: 999;
          width: 360px;
          max-height: 560px;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: cbSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cbSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        /* ── Header ───────────────────────────────────────────────────────── */
        .cb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--primary);
          color: #fff;
          flex-shrink: 0;
        }
        .cb-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cb-header-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cb-header-name {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.1px;
        }
        .cb-header-status {
          font-size: 11px;
          opacity: 0.82;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 1px;
        }
        .cb-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(74,222,128,0.3);
        }
        .cb-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cb-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .cb-icon-btn:hover {
          background: rgba(255,255,255,0.28);
        }

        /* ── Messages area ────────────────────────────────────────────────── */
        .cb-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scroll-behavior: smooth;
        }
        .cb-messages::-webkit-scrollbar { width: 4px; }
        .cb-messages::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }

        /* ── Message bubbles ──────────────────────────────────────────────── */
        .cb-msg {
          display: flex;
          align-items: flex-end;
          gap: 7px;
          max-width: 92%;
          animation: cbFadeIn 0.18s ease;
        }
        @keyframes cbFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .cb-msg-bot  { align-self: flex-start; }
        .cb-msg-user { align-self: flex-end; flex-direction: row-reverse; }

        .cb-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--primary-mid);
        }

        .cb-bubble {
          padding: 9px 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.55;
          word-break: break-word;
          position: relative;
        }
        .cb-msg-bot  .cb-bubble {
          background: var(--bg);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
          color: var(--text-primary);
        }
        .cb-msg-user .cb-bubble {
          background: var(--primary);
          color: #ffffff !important;
          border-bottom-right-radius: 4px;
        }
        /* Force all child text inside user bubble to stay white */
        .cb-msg-user .cb-bubble *,
        .cb-msg-user .cb-bubble p,
        .cb-msg-user .cb-bubble strong,
        .cb-msg-user .cb-bubble .cb-md-p,
        .cb-msg-user .cb-bubble .cb-time {
          color: #ffffff !important;
        }

        /* ── Markdown rendering inside bubbles ────────────────────────────── */
        .cb-md-p {
          margin: 0 0 4px;
          line-height: 1.55;
        }
        .cb-md-p:last-child { margin-bottom: 0; }
        .cb-md-list {
          margin: 4px 0 4px 16px;
          padding: 0;
        }
        .cb-md-list li {
          margin-bottom: 3px;
          font-size: 13px;
          line-height: 1.5;
        }

        /* Timestamp */
        .cb-time {
          display: block;
          font-size: 10px;
          margin-top: 5px;
          opacity: 0.55;
          text-align: right;
        }
        .cb-msg-bot .cb-time { text-align: left; }

        /* ── Typing indicator ─────────────────────────────────────────────── */
        .cb-typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 12px 14px;
          min-width: 52px;
        }
        .cb-typing span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: cbBounce 1.2s ease-in-out infinite;
        }
        .cb-typing span:nth-child(2) { animation-delay: 0.2s; }
        .cb-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cbBounce {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }

        /* ── Suggestion chips ─────────────────────────────────────────────── */
        .cb-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 14px;
          border-top: 1px solid var(--border);
          background: var(--bg);
          flex-shrink: 0;
        }
        .cb-chip {
          font-size: 12px;
          font-family: var(--font);
          font-weight: 500;
          color: var(--primary);
          background: var(--primary-light);
          border: 1px solid var(--primary-mid);
          border-radius: 999px;
          padding: 4px 11px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .cb-chip:hover:not(:disabled) {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }
        .cb-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Input row ────────────────────────────────────────────────────── */
        .cb-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          background: var(--surface);
          flex-shrink: 0;
        }
        .cb-input {
          flex: 1;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-family: var(--font);
          color: var(--text-primary);
          background: var(--bg);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          min-width: 0;
        }
        .cb-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .cb-input::placeholder { color: var(--text-muted); }
        .cb-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cb-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--primary);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        .cb-send-btn:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: scale(1.06);
        }
        .cb-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }
        .cb-send-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Footer ───────────────────────────────────────────────────────── */
        .cb-footer {
          font-size: 10px;
          text-align: center;
          color: var(--text-muted);
          padding: 5px 12px 8px;
          background: var(--surface);
          flex-shrink: 0;
        }

        /* ── Responsive: full-width on small screens ──────────────────────── */
        @media (max-width: 480px) {
          .cb-window {
            right: 12px;
            left: 12px;
            width: auto;
            bottom: 86px;
            max-height: 72vh;
          }
          .cb-fab {
            bottom: 20px;
            right: 20px;
          }
        }
      `}</style>
    </>
  );
}
