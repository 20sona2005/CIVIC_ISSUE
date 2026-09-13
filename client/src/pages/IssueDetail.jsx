import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { UPLOADS_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FeedbackWidget from '../components/FeedbackWidget';

const statusClass = {
  'Reported':    'badge-reported',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved',
};

function timeAgo(dateStr, t) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return t('common.justNow');
  if (mins < 60)  return t('common.minsAgo', { n: mins, count: mins });
  if (hours < 24) return t('common.hoursAgo', { n: hours, count: hours });
  return t('common.daysAgo', { n: days, count: days });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function IssueDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [issue, setIssue]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [supportCount, setSupportCount] = useState(0);
  const [supported, setSupported]       = useState(false);
  const [supporting, setSupporting]     = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const { data } = await api.get(`/issues/${id}`);
        setIssue(data);
        setSupportCount(data.supportCount || 0);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? t('detail.notFound')
            : t('detail.errorLoad')
        );
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSupport = async () => {
    if (!user || supporting || supported) return;
    setSupporting(true);
    try {
      const { data } = await api.post(`/issues/${id}/support`, { userId: user.name });
      setSupportCount(data.supportCount);
      setSupported(true);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already')) setSupported(true);
    } finally {
      setSupporting(false);
    }
  };

  const handleFeedbackSubmitted = (updatedFields) => {
    setIssue(prev => ({ ...prev, ...updatedFields }));
  };

  // Translate status for display
  const statusDisplay = (s) => {
    if (s === 'In Progress') return t('status.InProgress');
    return t(`status.${s}`, s);
  };

  if (loading) {
    return <div className="container"><div className="spinner-wrap"><div className="spinner" /></div></div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="detail-error">
          <div className="detail-error-icon">⚠️</div>
          <h2>{error}</h2>
          <button className="btn btn-outline" onClick={() => navigate('/explore')}>
            {t('detail.backToIssues')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn btn-ghost btn-sm detail-back" onClick={() => navigate(-1)}>
        {t('detail.back')}
      </button>

      <div className="detail-layout">
        {/* ── Main Content ── */}
        <div className="detail-main">
          {/* Duplicate origin notice */}
          {issue.isDuplicate && issue.duplicateOf && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#92400e' }}>
                  {t('detail.duplicateNotice')}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#78350f' }}>
                  {t('detail.duplicateConfidence', { n: Math.round((issue.duplicateConfidence || 0) * 100) })}
                  {issue.duplicateOf?.title && (
                    <> {t('detail.duplicateRelated', { title: issue.duplicateOf.title })}</>
                  )}
                </p>
                {issue.duplicateOf?._id && (
                  <button
                    onClick={() => navigate(`/issues/${issue.duplicateOf._id}`)}
                    style={{
                      marginTop: 6, padding: '3px 10px', borderRadius: 6,
                      border: '1px solid #d97706', background: '#fff',
                      color: '#92400e', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    {t('detail.viewOriginal')}
                  </button>
                )}
              </div>
            </div>
          )}

          {issue.image && (
            <div className="detail-image-wrap">
              <img src={`${UPLOADS_URL}/${issue.image}`} alt={issue.title} className="detail-image" />
            </div>
          )}

          <div className="detail-header">
            <div className="detail-meta-top">
              <span className="tag">{t(`category.${issue.category === 'Water Leakage' ? 'WaterLeakage' : issue.category}`, issue.category)}</span>
              <span className={`badge ${statusClass[issue.status] || 'badge-reported'}`}>
                {statusDisplay(issue.status)}
              </span>
            </div>
            <h1 className="detail-title">{issue.title}</h1>
          </div>

          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>{t('detail.descriptionSection')}</h3>
              <p className="detail-desc">{issue.description}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>{t('detail.locationSection')}</h3>
              <div className="detail-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{issue.location}</span>
              </div>
              {issue.coords?.lat != null && issue.coords?.lng != null && (
                <div className="detail-coords">
                  <span className="coords-text">
                    {issue.coords.lat.toFixed(5)}, {issue.coords.lng.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${issue.coords.lat},${issue.coords.lng}`}
                    target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"
                  >
                    {t('detail.viewLocation')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="detail-sidebar">
          {/* Status card */}
          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>{t('detail.issueStatus')}</h3>
              <div className="status-track">
                <StatusStep label={t('status.Reported')}   done={['Reported','In Progress','Resolved'].includes(issue.status)} active={issue.status === 'Reported'} />
                <StatusStep label={t('status.InProgress')} done={['In Progress','Resolved'].includes(issue.status)} active={issue.status === 'In Progress'} />
                <StatusStep label={t('status.Resolved')}   done={issue.status === 'Resolved'} active={issue.status === 'Resolved'} />
              </div>
            </div>
          </div>

          {/* Community Support */}
          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>{t('detail.communitySupport')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--text-primary)' }}>{supportCount}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('detail.supportCount', { count: supportCount })}
                  </div>
                </div>
              </div>
              {user && issue.reportedBy !== user.name && issue.status !== 'Resolved' ? (
                <button
                  onClick={handleSupport}
                  disabled={supporting || supported}
                  className={`btn btn-full ${supported ? '' : 'btn-primary'}`}
                  style={supported ? { background: '#d1fae5', color: '#065f46', border: '1px solid #86efac', cursor: 'default' } : {}}
                >
                  {supported ? t('detail.supported') : supporting ? t('detail.supporting') : t('detail.supportBtn')}
                </button>
              ) : issue.status === 'Resolved' ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('detail.issueResolved')}</p>
              ) : !user ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  <button className="btn btn-outline btn-sm btn-full" onClick={() => navigate('/login')}>
                    {t('detail.signInToSupport')}
                  </button>
                </p>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('detail.youReported')}</p>
              )}
            </div>
          </div>

          {/* Feedback widget */}
          {user && !isAdmin && issue.status === 'Resolved' &&
           ((issue.reportedById && issue.reportedById.toString() === user.id) ||
            (issue.reportedBy && issue.reportedBy === user.name)) && (
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('detail.satisfactionFeedback')}
              </h3>
              <FeedbackWidget issue={issue} onFeedbackSubmitted={handleFeedbackSubmitted} />
            </div>
          )}

          {/* Reporter card */}
          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>{t('detail.reportedBy')}</h3>
              <div className="detail-reporter">
                <div className="reporter-avatar">{issue.reportedBy.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="reporter-name">{issue.reportedBy}</div>
                  <div className="reporter-time">{timeAgo(issue.createdAt, t)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Details card */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>{t('detail.detailsSection')}</h3>
              <dl className="detail-dl">
                <dt>{t('detail.categoryLabel')}</dt>
                <dd><span className="tag">{t(`category.${issue.category === 'Water Leakage' ? 'WaterLeakage' : issue.category}`, issue.category)}</span></dd>
                <dt>{t('detail.statusLabel')}</dt>
                <dd><span className={`badge ${statusClass[issue.status] || 'badge-reported'}`}>{statusDisplay(issue.status)}</span></dd>
                <dt>{t('detail.reportedOn')}</dt>
                <dd>{formatDate(issue.createdAt)}</dd>
                <dt>{t('detail.lastUpdated')}</dt>
                <dd>{formatDate(issue.updatedAt)}</dd>
                <dt>{t('detail.issueId')}</dt>
                <dd className="issue-id">{issue._id}</dd>
              </dl>
            </div>
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 'var(--sp-4)' }} onClick={() => navigate('/report')}>
            {t('detail.reportAnother')}
          </button>
        </div>
      </div>

      <style>{`
        .detail-back { margin-top: var(--sp-6); margin-bottom: var(--sp-4); color: var(--text-secondary); }
        .detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: var(--sp-6); padding-bottom: var(--sp-12); align-items: start; }
        .detail-image-wrap { border-radius: var(--radius); overflow: hidden; margin-bottom: var(--sp-4); border: 1px solid var(--border); aspect-ratio: 16 / 9; background: var(--bg); }
        .detail-image { width: 100%; height: 100%; object-fit: cover; display: block; }
        .detail-header { margin-bottom: var(--sp-4); }
        .detail-meta-top { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
        .detail-title { font-size: 28px; font-weight: 700; line-height: 1.25; color: var(--text-primary); letter-spacing: -0.3px; }
        .detail-desc { font-size: 15px; color: var(--text-secondary); line-height: 1.7; white-space: pre-line; }
        .detail-location { display: flex; align-items: center; gap: var(--sp-2); font-size: 14px; color: var(--text-secondary); margin-bottom: var(--sp-3); }
        .detail-coords { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; padding-top: var(--sp-3); border-top: 1px solid var(--border); margin-top: var(--sp-1); }
        .coords-text { font-size: 12px; font-family: monospace; color: var(--text-muted); background: var(--bg); padding: 2px 6px; border-radius: var(--radius-xs); border: 1px solid var(--border); }
        .status-track { display: flex; flex-direction: column; gap: 0; }
        .status-step { display: flex; align-items: flex-start; gap: var(--sp-3); padding-bottom: var(--sp-4); position: relative; }
        .status-step:last-child { padding-bottom: 0; }
        .status-step:not(:last-child)::before { content: ''; position: absolute; left: 11px; top: 24px; bottom: 0; width: 2px; background: var(--border); }
        .status-step.done:not(:last-child)::before { background: var(--primary); }
        .step-dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; color: var(--text-muted); }
        .status-step.done .step-dot { background: var(--primary); border-color: var(--primary); color: #fff; }
        .status-step.active .step-dot { box-shadow: 0 0 0 3px rgba(37,99,235,0.2); }
        .step-label { font-size: 13px; font-weight: 500; color: var(--text-muted); padding-top: 3px; }
        .status-step.done .step-label  { color: var(--text-primary); }
        .status-step.active .step-label { color: var(--primary); font-weight: 600; }
        .detail-reporter { display: flex; align-items: center; gap: var(--sp-3); }
        .reporter-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .reporter-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .reporter-time { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .detail-dl { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-2) var(--sp-4); align-items: center; }
        .detail-dl dt { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .detail-dl dd { font-size: 13px; color: var(--text-primary); margin: 0; }
        .issue-id { font-size: 11px; font-family: monospace; color: var(--text-muted); word-break: break-all; }
        .detail-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; gap: var(--sp-4); }
        .detail-error-icon { font-size: 40px; }
        @media (max-width: 860px) {
          .detail-layout { grid-template-columns: 1fr; }
          .detail-sidebar { order: -1; }
          .detail-title   { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}

function StatusStep({ label, done, active }) {
  return (
    <div className={`status-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <div className="step-dot">{done ? '✓' : ''}</div>
      <span className="step-label">{label}</span>
    </div>
  );
}
