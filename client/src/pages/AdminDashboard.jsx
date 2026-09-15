import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

const STATUS_OPTIONS = ['Reported', 'In Progress', 'Resolved'];

const statusClass = {
  'Reported':    'badge-reported',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved',
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats]             = useState(null);
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [updating, setUpdating]       = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [escalated, setEscalated]     = useState([]);
  const [noteTarget, setNoteTarget]   = useState(null);
  const [noteText, setNoteText]       = useState('');
  const [noteSaving, setNoteSaving]   = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter]     = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, issuesRes, feedbackRes, escalatedRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/issues'),
          api.get('/feedback/stats'),
          api.get('/feedback/escalated?limit=10'),
        ]);
        setStats(statsRes.data);
        setIssues(issuesRes.data);
        setFeedbackStats(feedbackRes.data);
        setEscalated(escalatedRes.data.issues || []);
      } catch (err) {
        setError(err.response?.data?.message || t('adminDash.errorLoad'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => {
    const cats = [...new Set(issues.map(i => i.category).filter(Boolean))].sort();
    return cats;
  }, [issues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter(issue => {
      const matchStatus   = statusFilter === 'All'   || issue.status   === statusFilter;
      const matchCategory = categoryFilter === 'All' || issue.category === categoryFilter;
      const matchSearch   = !q ||
        issue.title.toLowerCase().includes(q) ||
        issue.category.toLowerCase().includes(q) ||
        issue.location.toLowerCase().includes(q) ||
        (issue.reportedBy || '').toLowerCase().includes(q);
      return matchStatus && matchCategory && matchSearch;
    });
  }, [issues, search, statusFilter, categoryFilter]);

  const hasFilter = search || statusFilter !== 'All' || categoryFilter !== 'All';

  function clearFilters() { setSearch(''); setStatusFilter('All'); setCategoryFilter('All'); }

  async function handleStatusChange(id, status) {
    setUpdating(id);
    try {
      const { data } = await api.patch(`/admin/issues/${id}/status`, { status });
      setIssues(prev => prev.map(i => (i._id === id ? data : i)));
      setStats(prev => {
        if (!prev) return prev;
        const old = issues.find(i => i._id === id);
        if (!old || old.status === status) return prev;
        const byStatus = { ...prev.byStatus };
        byStatus[old.status] = Math.max(0, (byStatus[old.status] || 0) - 1);
        byStatus[status] = (byStatus[status] || 0) + 1;
        return { ...prev, byStatus };
      });
    } catch (err) {
      alert(err.response?.data?.message || t('adminDash.errorStatus'));
    } finally {
      setUpdating(null);
    }
  }

  async function handleSaveNote(issueId) {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      await api.patch(`/feedback/${issueId}/supervisor-note`, { note: noteText.trim() });
      setEscalated(prev => prev.map(i => i._id === issueId ? { ...i, supervisorNote: noteText.trim() } : i));
      setNoteTarget(null);
      setNoteText('');
    } catch (err) {
      alert(err.response?.data?.message || t('adminDash.noteSaveError'));
    } finally {
      setNoteSaving(false);
    }
  }

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
        <div className="page-header"><h1>{t('adminDash.title')}</h1></div>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>{t('adminDash.title')}</h1>
        <p>{t('adminDash.sub')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="dash-stats" style={{ marginBottom: 'var(--sp-8)' }}>
          <StatCard label={t('adminDash.statTotal')}      value={stats.totalIssues}                   color="blue"   />
          <StatCard label={t('adminDash.statUsers')}      value={stats.totalUsers}                    color="blue2"  />
          <StatCard label={t('adminDash.statReported')}   value={stats.byStatus.Reported      || 0}   color="yellow" />
          <StatCard label={t('adminDash.statInProgress')} value={stats.byStatus['In Progress'] || 0}  color="blue2"  />
          <StatCard label={t('adminDash.statResolved')}   value={stats.byStatus.Resolved      || 0}   color="green"  />
        </div>
      )}

      {/* Feedback Metrics */}
      {feedbackStats && (
        <section className="section" style={{ paddingTop: 0, marginBottom: 'var(--sp-6)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
            <h2>{t('adminDash.satisfactionTitle')}</h2>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('adminDash.basedOnFeedback', { count: feedbackStats.feedbackCount })}
            </span>
          </div>
          <div className="fb-metric-grid">
            <FbMetricCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              label={t('adminDash.avgRating')}
              value={feedbackStats.avgRating !== null ? t('adminDash.avgRatingValue', { n: feedbackStats.avgRating }) : '—'}
              sub={feedbackStats.ratedCount ? t('adminDash.fromRatings', { count: feedbackStats.ratedCount }) : t('adminDash.noRatingsYet')}
            />
            <FbMetricCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}
              label={t('adminDash.satisfactionRate')}
              value={feedbackStats.satisfactionRate !== null ? `${feedbackStats.satisfactionRate}%` : '—'}
              sub={t('adminDash.satisfactionRateSub', { satisfied: feedbackStats.satisfiedCount, total: feedbackStats.feedbackCount })}
            />
            <FbMetricCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              label={t('adminDash.feedbackRate')}
              value={feedbackStats.feedbackRate !== null ? `${feedbackStats.feedbackRate}%` : '—'}
              sub={t('adminDash.feedbackRateSub', { count: feedbackStats.feedbackCount, total: feedbackStats.totalResolved })}
            />
            <FbMetricCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              label={t('adminDash.escalations')}
              value={feedbackStats.escalatedCount}
              sub={t('adminDash.escalationsSub')}
            />
          </div>

          {feedbackStats.ratedCount > 0 && (
            <div className="fb-dist-card">
              <h3 className="fb-dist-title">{t('adminDash.ratingDistTitle')}</h3>
              <div className="fb-dist-bars">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedbackStats.ratingDistribution[star] || 0;
                  const pct   = feedbackStats.ratedCount > 0 ? Math.round((count / feedbackStats.ratedCount) * 100) : 0;
                  return (
                    <div key={star} className="fb-dist-row">
                      <span className="fb-dist-label">{star} ★</span>
                      <div className="fb-dist-track">
                        <div className="fb-dist-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="fb-dist-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Escalated Issues */}
      {escalated.length > 0 && (
        <section className="section" style={{ paddingTop: 0, marginBottom: 'var(--sp-6)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {t('adminDash.escalatedTitle')}
              <span className="fb-escalated-badge">{escalated.length}</span>
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('adminDash.escalatedSub')}</span>
          </div>
          <div className="fb-escalated-list">
            {escalated.map(esc => (
              <div key={esc._id} className="fb-escalated-row card">
                <div className="fb-esc-info">
                  <div className="fb-esc-tags">
                    <span className="tag">{esc.category}</span>
                    <span className={`badge ${esc.status === 'Resolved' ? 'badge-resolved' : esc.status === 'In Progress' ? 'badge-progress' : 'badge-reported'}`}>
                      {statusDisplay(esc.status)}
                    </span>
                    <span className="fb-esc-pill">{t('adminDash.escalatedBadge')}</span>
                  </div>
                  <h3 className="fb-esc-title" onClick={() => navigate(`/issues/${esc._id}`)} style={{ cursor: 'pointer' }} title={t('adminDash.viewIssue')}>
                    {esc.title}
                  </h3>
                  <div className="fb-esc-meta">
                    <span>📍 {esc.location}</span>
                    <span>👤 {esc.reportedBy}</span>
                    <span>🚨 {new Date(esc.escalatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {esc.feedbackComment && (
                    <p className="fb-esc-comment">{t('adminDash.citizenComment', { comment: esc.feedbackComment })}</p>
                  )}
                  {esc.supervisorNote && (
                    <p className="fb-esc-supervisor-note">{t('adminDash.supervisorNote', { note: esc.supervisorNote })}</p>
                  )}
                </div>
                <div className="fb-esc-action">
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/issues/${esc._id}`)}>
                    {t('adminDash.viewIssue')}
                  </button>
                  {noteTarget === esc._id ? (
                    <div className="fb-note-form">
                      <textarea className="fb-note-input"
                        placeholder={t('adminDash.notePlaceholder')}
                        value={noteText} onChange={e => setNoteText(e.target.value)}
                        rows={2} maxLength={2000} disabled={noteSaving} autoFocus />
                      <div className="fb-note-btns">
                        <button className="btn btn-primary btn-sm"
                          onClick={() => handleSaveNote(esc._id)} disabled={noteSaving || !noteText.trim()}>
                          {noteSaving ? t('adminDash.saving') : t('adminDash.saveNote')}
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setNoteTarget(null); setNoteText(''); }} disabled={noteSaving}>
                          {t('adminDash.cancelNote')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-sm"
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                      onClick={() => { setNoteTarget(esc._id); setNoteText(esc.supervisorNote || ''); }}>
                      {esc.supervisorNote ? t('adminDash.editNote') : t('adminDash.addNote')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Issues */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2>{t('adminDash.allIssuesTitle')}</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('adminDash.issuesTotal', { count: issues.length })}
          </span>
        </div>

        {/* Filter bar */}
        <div className="admin-filters">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="form-input search-input"
              placeholder={t('adminDash.searchPlaceholder')} value={search}
              onChange={e => setSearch(e.target.value)} aria-label={t('adminDash.searchAria')} />
          </div>
          <select className="form-select filter-select" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)} aria-label={t('adminDash.filterStatusAria')}>
            <option value="All">{t('adminDash.allStatus')}</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusDisplay(s)}</option>)}
          </select>
          <select className="form-select filter-select" value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)} aria-label={t('adminDash.filterCategoryAria')}>
            <option value="All">{t('adminDash.allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>{t('adminDash.clearFilters')}</button>
          )}
        </div>

        {hasFilter && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
            {t('adminDash.issuesFound', { count: filtered.length })}
          </p>
        )}

        {issues.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '40px', marginBottom: 'var(--sp-3)' }}>{t('adminDash.noIssuesIcon')}</div>
            <h3>{t('adminDash.noIssuesTitle')}</h3>
            <p>{t('adminDash.noIssuesSub')}</p>
          </div>
        )}

        {issues.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '40px', marginBottom: 'var(--sp-3)' }}>{t('adminDash.noResultsIcon')}</div>
            <h3>{t('adminDash.noResultsTitle')}</h3>
            <p>{t('adminDash.noResultsSub')}</p>
            <button className="btn btn-outline" onClick={clearFilters}>{t('adminDash.noResultsCta')}</button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="admin-issue-list">
            {filtered.map(issue => (
              <div key={issue._id} className="admin-issue-row card">
                <div className="admin-issue-thumb" onClick={() => navigate(`/issues/${issue._id}`)} title={t('adminDash.viewDetails')}>
                  {issue.image ? (
                    <img src={`/uploads/${issue.image}`} alt={issue.title} />
                  ) : (
                    <div className="admin-issue-no-photo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="admin-issue-info">
                  <div className="admin-issue-tags">
                    <span className="tag">{issue.category}</span>
                    <span className={`badge ${statusClass[issue.status] || 'badge-reported'}`}>
                      {statusDisplay(issue.status)}
                    </span>
                  </div>
                  <h3 className="admin-issue-title">{issue.title}</h3>
                  <div className="admin-issue-meta">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {issue.location}
                      {issue.coords?.lat != null && issue.coords?.lng != null && (
                        <a href={`https://www.google.com/maps?q=${issue.coords.lat},${issue.coords.lng}`}
                          target="_blank" rel="noopener noreferrer" className="admin-map-link"
                          onClick={e => e.stopPropagation()} title={t('adminDash.viewLocationTitle')}>
                          {t('adminDash.viewLocation')}
                        </a>
                      )}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {issue.reportedBy || t('common.unknown')}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {new Date(issue.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {issue.wasResolved === true && (
                    <div className="admin-feedback-snippet">
                      <span className="admin-fb-satisfied">{t('adminDash.resolvedConfirmed')}</span>
                      {issue.rating && <span className="admin-fb-stars">{'★'.repeat(issue.rating)}{'☆'.repeat(5 - issue.rating)}</span>}
                      {issue.feedbackComment && <span className="admin-fb-comment">💬 <em>"{issue.feedbackComment}"</em></span>}
                    </div>
                  )}
                </div>
                <div className="admin-issue-action" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>
                    {t('adminDash.viewDetails')}
                  </button>
                  <div className="admin-status-group">
                    <label className="admin-status-label" htmlFor={`status-${issue._id}`}>
                      {t('adminDash.statusLabel')}
                    </label>
                    <select id={`status-${issue._id}`} className="form-select admin-status-select"
                      value={issue.status} disabled={updating === issue._id}
                      onChange={e => handleStatusChange(issue._id, e.target.value)}
                      aria-label={t('adminDash.statusAria', { title: issue.title })}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusDisplay(s)}</option>)}
                    </select>
                    {updating === issue._id && <span className="admin-saving-text">{t('adminDash.statusSaving')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .dash-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-4); }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--sp-5) var(--sp-6); box-shadow: var(--shadow-sm); }
        .stat-card-value { font-size: 32px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .stat-card-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
        .stat-blue   .stat-card-value { color: var(--primary); }
        .stat-yellow .stat-card-value { color: var(--warning); }
        .stat-blue2  .stat-card-value { color: #0891b2; }
        .stat-green  .stat-card-value { color: var(--success); }
        .section-head { display: flex; align-items: center; justify-content: space-between; }
        .admin-filters { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 220px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px; }
        .filter-select { width: auto; min-width: 140px; flex-shrink: 0; }
        .admin-issue-list { display: flex; flex-direction: column; gap: var(--sp-3); padding-bottom: var(--sp-12); }
        .admin-issue-row { display: grid; grid-template-columns: 80px 1fr auto; gap: var(--sp-4); align-items: center; padding: var(--sp-4); transition: box-shadow var(--transition), border-color var(--transition), border-left-color var(--transition); border-left: 3px solid transparent; }
        .admin-issue-row:hover { box-shadow: var(--shadow); border-color: var(--border-hover); border-left-color: var(--primary); }
        .admin-issue-thumb { width: 80px; height: 64px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; cursor: pointer; }
        .admin-issue-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.2s; }
        .admin-issue-thumb:hover img { transform: scale(1.05); }
        .admin-issue-no-photo { width: 100%; height: 100%; background: var(--bg); display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
        .admin-issue-tags { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); }
        .admin-issue-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--sp-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px; }
        .admin-issue-meta { display: flex; align-items: center; gap: var(--sp-4); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
        .admin-issue-meta span { display: flex; align-items: center; gap: 4px; }
        .admin-map-link { font-size: 11px; font-weight: 500; color: var(--primary); text-decoration: none; border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 1px 6px; margin-left: 4px; white-space: nowrap; transition: background 0.15s, color 0.15s; }
        .admin-map-link:hover { background: var(--primary); color: #fff; text-decoration: none; }
        .admin-issue-action { display: flex; flex-direction: column; align-items: flex-end; gap: var(--sp-3); min-width: 160px; flex-shrink: 0; }
        .admin-status-group { display: flex; flex-direction: column; gap: 4px; width: 100%; }
        .admin-status-label { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .admin-status-select { font-size: 13px; padding: 6px 32px 6px 10px; width: 100%; }
        .admin-saving-text { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; }
        .admin-saving-text::before { content: ''; display: inline-block; width: 10px; height: 10px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-feedback-snippet { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-2); padding: 6px 10px; background: var(--success-light); border: 1px solid #86efac; border-radius: var(--radius-sm); flex-wrap: wrap; }
        .admin-fb-satisfied { font-size: 11px; font-weight: 700; color: var(--success); white-space: nowrap; }
        .admin-fb-stars { font-size: 13px; color: #f59e0b; letter-spacing: 1px; white-space: nowrap; }
        .admin-fb-comment { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
        .fb-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-5); }
        .fb-metric-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: var(--radius);
          padding: var(--sp-5);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: box-shadow 0.18s, transform 0.18s;
        }
        .fb-metric-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.09); transform: translateY(-2px); }
        .fb-metric-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: #f3f4f6;
          display: flex; align-items: center; justify-content: center;
          color: #374151;
          margin-bottom: 4px;
          flex-shrink: 0;
        }
        .fb-metric-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          color: #111827;
          letter-spacing: -0.5px;
        }
        .fb-metric-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .fb-metric-sub { font-size: 12px; color: #9ca3af; line-height: 1.4; margin-top: 2px; }

        .fb-dist-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: var(--radius);
          padding: var(--sp-5) var(--sp-6);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .fb-dist-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: var(--sp-4); }
        .fb-dist-bars { display: flex; flex-direction: column; gap: 10px; }
        .fb-dist-row { display: grid; grid-template-columns: 28px 1fr 28px; align-items: center; gap: var(--sp-3); }
        .fb-dist-label { font-size: 12px; color: #6b7280; font-weight: 500; }
        .fb-dist-track {
          height: 7px;
          background: #f3f4f6;
          border-radius: 999px;
          overflow: hidden;
        }
        .fb-dist-fill {
          height: 100%;
          border-radius: 999px;
          background: #2563eb;
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
          min-width: 3px;
        }
        .fb-dist-count { font-size: 12px; color: #9ca3af; text-align: right; font-weight: 500; }
        .fb-escalated-badge { font-size: 11px; font-weight: 700; background: var(--danger-light); color: var(--danger); border: 1px solid #fca5a5; border-radius: 999px; padding: 2px 9px; }
        .fb-escalated-list { display: flex; flex-direction: column; gap: var(--sp-3); }
        .fb-escalated-row { display: grid; grid-template-columns: 1fr auto; gap: var(--sp-4); align-items: start; padding: var(--sp-4) var(--sp-5); border-left: 4px solid var(--danger); transition: box-shadow var(--transition); }
        .fb-escalated-row:hover { box-shadow: var(--shadow); }
        .fb-esc-tags { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); flex-wrap: wrap; }
        .fb-esc-pill { font-size: 11px; font-weight: 700; background: var(--danger-light); color: var(--danger); border: 1px solid #fca5a5; border-radius: 999px; padding: 2px 9px; }
        .fb-esc-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--sp-2); }
        .fb-esc-title:hover { color: var(--primary); text-decoration: underline; }
        .fb-esc-meta { display: flex; gap: var(--sp-4); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; margin-bottom: var(--sp-2); }
        .fb-esc-comment { font-size: 12px; color: var(--text-secondary); background: var(--warning-light); border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 6px 10px; margin: var(--sp-2) 0 0; }
        .fb-esc-supervisor-note { font-size: 12px; color: var(--text-secondary); background: var(--success-light); border: 1px solid #86efac; border-radius: var(--radius-sm); padding: 6px 10px; margin: var(--sp-2) 0 0; }
        .fb-esc-action { display: flex; flex-direction: column; gap: var(--sp-2); min-width: 140px; align-items: flex-end; }
        .fb-note-form { width: 100%; display: flex; flex-direction: column; gap: var(--sp-2); }
        .fb-note-input { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 10px; font-size: 12px; font-family: var(--font); color: var(--text-primary); background: var(--bg); resize: vertical; outline: none; transition: border-color 0.15s; }
        .fb-note-input:focus { border-color: var(--primary); }
        .fb-note-btns { display: flex; gap: var(--sp-2); justify-content: flex-end; }
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: repeat(3, 1fr); }
          .admin-issue-row { grid-template-columns: 64px 1fr; }
          .admin-issue-action { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; min-width: unset; }
          .admin-status-group { flex-direction: row; align-items: center; gap: var(--sp-2); }
          .admin-status-label { display: none; }
          .admin-status-select { width: auto; }
          .fb-metric-grid { grid-template-columns: repeat(2, 1fr); }
          .fb-escalated-row { grid-template-columns: 1fr; }
          .fb-esc-action { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
        }
        @media (max-width: 600px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr); }
          .admin-filters { gap: var(--sp-2); }
          .filter-select { min-width: 120px; }
          .admin-issue-thumb { width: 64px; height: 52px; }
          .admin-issue-title { font-size: 14px; max-width: 200px; }
          .admin-issue-meta  { gap: var(--sp-2); }
          .fb-metric-grid { grid-template-columns: repeat(2, 1fr); }
          .fb-metric-value { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function FbMetricCard({ icon, label, value, sub }) {
  return (
    <div className="fb-metric-card">
      <div className="fb-metric-icon">{icon}</div>
      <div className="fb-metric-value">{value}</div>
      <div className="fb-metric-label">{label}</div>
      {sub && <div className="fb-metric-sub">{sub}</div>}
    </div>
  );
}
