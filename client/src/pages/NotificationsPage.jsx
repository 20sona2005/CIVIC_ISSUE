import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationContext';

const PAGE_SIZE = 20;

function timeAgo(dateStr, t) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return t('common.justNow');
  if (mins < 60)  return t('common.minsAgo', { n: mins, count: mins });
  if (hours < 24) return t('common.hoursAgo', { n: hours, count: hours });
  if (days === 1) return t('common.yesterday');
  if (days < 7)   return t('common.daysAgo', { n: days, count: days });
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFull(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function typeIcon(type) {
  switch (type) {
    case 'NEW_ISSUE':      return '📋';
    case 'STATUS_UPDATE':  return '🔄';
    case 'ISSUE_RESOLVED': return '✅';
    case 'ISSUE_REOPENED': return '🔁';
    default:               return '🔔';
  }
}

function typeColor(type) {
  switch (type) {
    case 'NEW_ISSUE':      return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' };
    case 'STATUS_UPDATE':  return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
    case 'ISSUE_RESOLVED': return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' };
    case 'ISSUE_REOPENED': return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8' };
    default:               return { bg: '#f9fafb', border: '#e5e7eb', color: '#374151' };
  }
}

function NotifCard({ notif, onRead, onNavigate, t }) {
  const colors = typeColor(notif.type);
  const handleClick = () => {
    if (!notif.isRead) onRead(notif._id);
    if (notif.issueId) onNavigate(notif.issueId);
  };
  return (
    <div
      className={`notif-card ${notif.isRead ? 'notif-card--read' : 'notif-card--unread'}`}
      onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      aria-label={notif.title}
    >
      <div className="notif-card__bar" style={{ background: colors.color }} aria-hidden="true" />
      <div className="notif-card__icon" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
        <span style={{ fontSize: 20 }}>{typeIcon(notif.type)}</span>
      </div>
      <div className="notif-card__content">
        <div className="notif-card__top">
          <h3 className="notif-card__title">{notif.title}</h3>
          {!notif.isRead && <span className="notif-card__new-badge">{t('notifications.newBadge')}</span>}
        </div>
        {notif.issueTitle && (
          <p className="notif-card__issue">
            <span className="notif-card__issue-label">{t('notifications.issueLabel')}</span>
            {' '}{notif.issueTitle}
            {notif.issueCategory && <span className="notif-card__category-tag">{notif.issueCategory}</span>}
          </p>
        )}
        <p className="notif-card__message">{notif.message}</p>
        <div className="notif-card__meta">
          {notif.triggeredBy && (
            <span className="notif-card__by">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {notif.triggeredBy}
            </span>
          )}
          {notif.issueLocation && (
            <span className="notif-card__loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {notif.issueLocation}
            </span>
          )}
          <span className="notif-card__time" title={formatFull(notif.createdAt)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timeAgo(notif.createdAt, t)}
          </span>
        </div>
        {notif.issueId && <span className="notif-card__cta">{t('notifications.viewIssue')}</span>}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead } = useNotifications();

  const [tab, setTab]         = useState('all');
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await fetchNotifications(PAGE_SIZE, 0);
      setTotal(data.total || 0);
      setHasMore((data.notifications?.length || 0) < (data.total || 0));
      setPage(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    const nextSkip = (page + 1) * PAGE_SIZE;
    const data = await fetchNotifications(PAGE_SIZE, nextSkip);
    setPage(p => p + 1);
    setHasMore(nextSkip + (data.notifications?.length || 0) < (data.total || 0));
  }, [page, fetchNotifications]);

  const handleRead     = useCallback((id) => markRead(id), [markRead]);
  const handleNavigate = useCallback((issueId) => navigate(`/issues/${issueId}`), [navigate]);

  const displayed = tab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>
            {t('notifications.back')}
          </button>
          <div>
            <h1 style={{ margin: 0 }}>{t('notifications.title')}</h1>
            <p style={{ margin: 0 }}>
              {t('notifications.count', { count: total })}
              {unreadCount > 0 && ` ${t('notifications.unread', { n: unreadCount })}`}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="notif-page-tabs">
        <button className={`notif-tab ${tab === 'all' ? 'notif-tab--active' : ''}`} onClick={() => setTab('all')}>
          {t('notifications.tabAll')}
          <span className="notif-tab-count">{total}</span>
        </button>
        <button className={`notif-tab ${tab === 'unread' ? 'notif-tab--active' : ''}`} onClick={() => setTab('unread')}>
          {t('notifications.tabUnread')}
          {unreadCount > 0 && <span className="notif-tab-count notif-tab-count--red">{unreadCount}</span>}
        </button>
      </div>

      {loading && notifications.length === 0 && (
        <div className="spinner-wrap"><div className="spinner" /></div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="empty-state" style={{ minHeight: '50vh' }}>
          <span style={{ fontSize: 48 }}>🔕</span>
          <h3>{t('notifications.noNotifsTitle')}</h3>
          <p>{t('notifications.noNotifsSub')}</p>
        </div>
      )}

      {!loading && tab === 'unread' && unreadCount === 0 && notifications.length > 0 && (
        <div className="empty-state" style={{ minHeight: '40vh' }}>
          <span style={{ fontSize: 48 }}>✅</span>
          <h3>{t('notifications.allCaughtUp')}</h3>
          <p>{t('notifications.allCaughtUpSub')}</p>
          <button className="btn btn-outline" onClick={() => setTab('all')}>{t('notifications.viewAllBtn')}</button>
        </div>
      )}

      {displayed.length > 0 && (
        <div className="notif-page-list">
          {displayed.map(notif => (
            <NotifCard key={notif._id} notif={notif} onRead={handleRead} onNavigate={handleNavigate} t={t} />
          ))}
        </div>
      )}

      {hasMore && tab === 'all' && (
        <div style={{ textAlign: 'center', padding: '24px 0 48px' }}>
          <button className="btn btn-outline" onClick={loadMore} disabled={loading}>
            {loading ? t('notifications.loadingMore') : t('notifications.loadMore')}
          </button>
        </div>
      )}

      <style>{`
        .notif-page-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid var(--border); padding-bottom: 0; }
        .notif-tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; font-size: 14px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; transition: color 0.15s, border-color 0.15s; border-radius: 4px 4px 0 0; }
        .notif-tab:hover { color: var(--text-primary); }
        .notif-tab--active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
        .notif-tab-count { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
        .notif-tab-count--red { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .notif-page-list { display: flex; flex-direction: column; gap: 10px; padding-bottom: 48px; }
        .notif-card { display: flex; align-items: flex-start; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s, background 0.12s; position: relative; overflow: hidden; }
        .notif-card:hover { box-shadow: var(--shadow); border-color: var(--border-hover); }
        .notif-card--unread { background: #f0f7ff; border-color: #bfdbfe; }
        .notif-card--unread:hover { background: #e0effe; }
        .notif-card__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 10px 0 0 10px; }
        .notif-card__icon { width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 8px; }
        .notif-card__content { flex: 1; min-width: 0; }
        .notif-card__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .notif-card__title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.4; }
        .notif-card__new-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: #2563eb; color: #fff; flex-shrink: 0; white-space: nowrap; }
        .notif-card__issue { font-size: 13px; font-weight: 500; color: var(--text-primary); margin: 0 0 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .notif-card__issue-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .notif-card__category-tag { font-size: 11px; padding: 1px 8px; border-radius: 999px; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary-mid); font-weight: 600; }
        .notif-card__message { font-size: 13px; color: var(--text-secondary); margin: 0 0 8px; line-height: 1.6; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .notif-card__meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .notif-card__by, .notif-card__loc, .notif-card__time { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); }
        .notif-card__cta { display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--primary); }
        @media (max-width: 600px) {
          .notif-card { padding: 12px; gap: 10px; }
          .notif-card__icon { width: 38px; height: 38px; font-size: 16px; margin-left: 4px; }
          .notif-card__title { font-size: 14px; }
          .notif-card__message { -webkit-line-clamp: 2; }
        }
      `}</style>
    </div>
  );
}
