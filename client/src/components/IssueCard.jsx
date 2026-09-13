import { useNavigate } from 'react-router-dom';
import { UPLOADS_URL } from '../api/axios';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const statusClass = {
  'Reported':    'badge-reported',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved',
};

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1 day ago';
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* Image fallback placeholder */
function ImagePlaceholder({ category }) {
  const icons = {
    Pothole:        '🕳️',
    Garbage:        '🗑️',
    Streetlight:    '💡',
    Drainage:       '🌊',
    'Water Leakage':'💧',
    Other:          '📋',
  };
  return (
    <div className="issue-card-placeholder">
      <span className="placeholder-icon">{icons[category] || '📋'}</span>
    </div>
  );
}

export default function IssueCard({ issue }) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { t }     = useTranslation();

  const [supportCount, setSupportCount]   = useState(issue.supportCount || 0);
  const [supported, setSupported]         = useState(false);
  const [supporting, setSupporting]       = useState(false);

  const handleSupport = async (e) => {
    e.stopPropagation(); // don't navigate to detail
    if (!user || supporting || supported) return;
    setSupporting(true);
    try {
      const { data } = await api.post(`/issues/${issue._id}/support`, { userId: user.name });
      setSupportCount(data.supportCount);
      setSupported(true);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already')) setSupported(true);
    } finally {
      setSupporting(false);
    }
  };

  return (
    <article
      className="card card-hover issue-card"
      onClick={() => navigate(`/issues/${issue._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/issues/${issue._id}`)}
      aria-label={t('issueCard.aria', { title: issue.title })}
    >
      {/* Image / Placeholder */}
      <div className="issue-card-img-wrap">
        {issue.image ? (
          <img
            src={`${UPLOADS_URL}/${issue.image}`}
            alt={issue.title}
            className="issue-card-img"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder category={issue.category} />
        )}
        {/* Status badge overlaid on image */}
        <span className={`badge issue-card-status-badge ${statusClass[issue.status] || 'badge-reported'}`}>
          {issue.status}
        </span>
        {/* Duplicate badge */}
        {issue.isDuplicate && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(234,179,8,0.92)', color: '#713f12',
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 20, letterSpacing: '0.03em',
          }}>
            {t('issueCard.possibleDuplicate')}
          </span>
        )}
      </div>

      <div className="card-body issue-card-body">
        {/* Category tag */}
        <div className="issue-card-top">
          <span className="tag">{issue.category}</span>
          {/* Support count chip */}
          {supportCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#2563eb',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 20, padding: '1px 8px',
            }}>
              👥 {supportCount}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="issue-card-title">{issue.title}</h3>

        {/* Description preview */}
        <p className="issue-card-desc">{issue.description}</p>

        {/* Footer */}
        <div className="issue-card-footer">
          <span className="issue-card-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="truncate">{issue.location}</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="issue-card-time">{timeAgo(issue.createdAt)}</span>
            {/* Support button — only for logged-in users, not for the reporter */}
            {user && issue.reportedBy !== user.name && issue.status !== 'Resolved' && (
              <button
                onClick={handleSupport}
                disabled={supporting || supported}
                title={supported ? t('issueCard.supportedTitle') : t('issueCard.supportTitle')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 8px', borderRadius: 20, border: 'none',
                  background: supported ? '#d1fae5' : '#eff6ff',
                  color:      supported ? '#065f46' : '#2563eb',
                  fontSize: 11, fontWeight: 700, cursor: supporting || supported ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {supported ? '✓' : '👍'} {supporting ? t('issueCard.supporting') : supported ? t('issueCard.supported') : t('issueCard.supportBtn')}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .issue-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        /* Image container — fixed aspect ratio */
        .issue-card-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--bg);
          flex-shrink: 0;
        }
        .issue-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }
        .card-hover:hover .issue-card-img {
          transform: scale(1.04);
        }

        /* Placeholder */
        .issue-card-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--bg) 0%, #e9eef5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder-icon {
          font-size: 36px;
          opacity: 0.55;
        }

        /* Status badge — overlaid top-right */
        .issue-card-status-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }

        /* Card body */
        .issue-card-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--sp-4) var(--sp-5);
        }

        .issue-card-top {
          margin-bottom: var(--sp-2);
        }

        .issue-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--sp-2);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .issue-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: var(--sp-4);
          flex: 1;
        }

        /* Footer */
        .issue-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--sp-3);
          border-top: 1px solid var(--border);
          gap: var(--sp-2);
        }
        .issue-card-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-muted);
          min-width: 0;
          flex: 1;
        }
        .issue-card-meta-item .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .issue-card-time {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }
      `}</style>
    </article>
  );
}
