/**
 * NotificationBell.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Bell icon with unread badge + dropdown panel.
 * Clicking the bell fetches latest notifications and opens the dropdown.
 * Clicking a notification marks it read and navigates to the issue.
 * "Mark all as read" button clears the badge in one shot.
 * "View all" link goes to the full /notifications history page.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationContext';

// ── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Notification type icon ───────────────────────────────────────────────────
function typeIcon(type) {
  switch (type) {
    case 'NEW_ISSUE':      return '📋';
    case 'STATUS_UPDATE':  return '🔄';
    case 'ISSUE_RESOLVED': return '✅';
    case 'ISSUE_REOPENED': return '🔁';
    default:               return '🔔';
  }
}

// ── Single row in the dropdown ───────────────────────────────────────────────
function NotifRow({ notif, onClick }) {
  return (
    <button
      className={`notif-row ${notif.isRead ? 'notif-row--read' : 'notif-row--unread'}`}
      onClick={() => onClick(notif)}
      title={notif.message}
    >
      <span className="notif-row__icon">{typeIcon(notif.type)}</span>
      <div className="notif-row__body">
        <p className="notif-row__title">{notif.title}</p>
        <p className="notif-row__sub">
          {notif.issueTitle && (
            <span className="notif-row__issue">{notif.issueTitle}</span>
          )}
          {notif.triggeredBy && (
            <span className="notif-row__by"> · {notif.triggeredBy}</span>
          )}
        </p>
        <span className="notif-row__time">{timeAgo(notif.createdAt)}</span>
      </div>
      {!notif.isRead && <span className="notif-row__dot" aria-label="unread" />}
    </button>
  );
}

// ── Bell icon SVG ─────────────────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const navigate  = useNavigate();
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead } =
    useNotifications();

  const [open, setOpen]       = useState(false);
  const [fetched, setFetched] = useState(false);   // avoid re-fetching on every open
  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch on first open
  const handleBellClick = useCallback(async () => {
    if (!open && !fetched) {
      await fetchNotifications(20);
      setFetched(true);
    }
    setOpen(o => !o);
  }, [open, fetched, fetchNotifications]);

  // Click a notification — mark read + navigate
  const handleNotifClick = useCallback(async (notif) => {
    if (!notif.isRead) await markRead(notif._id);
    setOpen(false);
    if (notif.issueId) navigate(`/issues/${notif.issueId}`);
  }, [markRead, navigate]);

  const handleMarkAll = useCallback(async (e) => {
    e.stopPropagation();
    await markAllRead();
  }, [markAllRead]);

  const displayList = notifications.slice(0, 8);

  return (
    <div className="notif-bell-wrap" role="region" aria-label={t('notifBell.regionAria', 'Notifications')}>
      {/* Bell button */}
      <button
        ref={bellRef}
        className={`notif-bell-btn ${open ? 'notif-bell-btn--open' : ''}`}
        onClick={handleBellClick}
        aria-label={unreadCount > 0 ? `${t('nav.notifications')}, ${unreadCount} unread` : t('nav.notifications')}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-live="polite">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="notif-panel"
          role="dialog"
          aria-label={t('notifications.title')}
        >
          {/* Panel header */}
          <div className="notif-panel__header">
            <span className="notif-panel__heading">
              🔔 {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="notif-panel__count">{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button className="notif-panel__mark-all" onClick={handleMarkAll} title={t('notifications.markAllRead')}>
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-panel__list">
            {loading && (
              <div className="notif-panel__empty">
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            )}

            {!loading && displayList.length === 0 && (
              <div className="notif-panel__empty">
                <span style={{ fontSize: 28 }}>🔕</span>
                <p>{t('notifications.noNotifsTitle')}</p>
              </div>
            )}

            {!loading && displayList.map(notif => (
              <NotifRow
                key={notif._id}
                notif={notif}
                onClick={handleNotifClick}
              />
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-panel__footer">
              <button className="notif-panel__view-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>
                {t('notifications.viewAllBtn')}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        /* ── Bell wrapper ── */
        .notif-bell-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        /* ── Bell button ── */
        .notif-bell-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .notif-bell-btn:hover,
        .notif-bell-btn--open {
          background: var(--primary-light);
          color: var(--primary);
          border-color: var(--primary-mid);
        }

        /* ── Unread badge ── */
        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          border: 2px solid var(--surface);
          animation: notif-pop 0.2s ease;
        }
        @keyframes notif-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        /* ── Dropdown panel ── */
        .notif-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 360px;
          max-width: calc(100vw - 24px);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
          z-index: 1000;
          overflow: hidden;
          animation: notif-slide 0.18s ease;
        }
        @keyframes notif-slide {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Panel header */
        .notif-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--border);
        }
        .notif-panel__heading {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .notif-panel__count {
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
        }
        .notif-panel__mark-all {
          font-size: 12px;
          font-weight: 500;
          color: var(--primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: background 0.12s;
        }
        .notif-panel__mark-all:hover {
          background: var(--primary-light);
        }

        /* Panel list */
        .notif-panel__list {
          max-height: 380px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .notif-panel__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 16px;
          color: var(--text-muted);
          font-size: 13px;
        }

        /* Single row */
        .notif-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-bottom: 1px solid var(--border);
          text-align: left;
          cursor: pointer;
          transition: background 0.12s;
          background: transparent;
        }
        .notif-row:last-child { border-bottom: none; }
        .notif-row:hover { background: var(--bg); }
        .notif-row--unread { background: #eff6ff; }
        .notif-row--unread:hover { background: #dbeafe; }

        .notif-row__icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .notif-row__body {
          flex: 1;
          min-width: 0;
        }
        .notif-row__title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 2px;
          line-height: 1.4;
        }
        .notif-row__sub {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0 0 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-row__issue { font-weight: 500; }
        .notif-row__by    { color: var(--text-muted); }
        .notif-row__time  {
          font-size: 11px;
          color: var(--text-muted);
          display: block;
        }
        .notif-row__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563eb;
          flex-shrink: 0;
          margin-top: 5px;
        }

        /* Panel footer */
        .notif-panel__footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          text-align: center;
        }
        .notif-panel__view-all {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.12s;
        }
        .notif-panel__view-all:hover {
          background: var(--primary-light);
        }

        /* Mobile: full-width panel */
        @media (max-width: 480px) {
          .notif-panel {
            right: -8px;
            width: calc(100vw - 16px);
          }
        }
      `}</style>
    </div>
  );
}
