import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const STATUS_OPTIONS = ['Reported', 'In Progress', 'Resolved'];

const statusClass = {
  'Reported':    'badge-reported',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved',
};

export default function AdminDashboard() {
  const [stats, setStats]               = useState(null);
  const [issues, setIssues]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [updating, setUpdating]         = useState(null);

  // Feedback metrics state
  const [feedbackStats, setFeedbackStats]   = useState(null);
  const [escalated, setEscalated]           = useState([]);
  const [noteTarget, setNoteTarget]         = useState(null);   // issue._id being noted
  const [noteText, setNoteText]             = useState('');
  const [noteSaving, setNoteSaving]         = useState(false);

  // Filter state
  const [search, setSearch]                 = useState('');
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
        setError(err.response?.data?.message || 'Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Derive unique categories from loaded issues
  const categories = useMemo(() => {
    const cats = [...new Set(issues.map(i => i.category).filter(Boolean))].sort();
    return cats;
  }, [issues]);

  // Combined filter + search — runs on every keystroke, no API call
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

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
  }

  async function handleStatusChange(id, status) {
    setUpdating(id);
    try {
      const { data } = await api.patch(`/admin/issues/${id}/status`, { status });
      setIssues(prev => prev.map(i => (i._id === id ? data : i)));
      // keep stats counters in sync without re-fetching
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
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(null);
    }
  }

  async function handleSaveNote(issueId) {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      await api.patch(`/feedback/${issueId}/supervisor-note`, { note: noteText.trim() });
      setEscalated(prev =>
        prev.map(i => i._id === issueId ? { ...i, supervisorNote: noteText.trim() } : i)
      );
      setNoteTarget(null);
      setNoteText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note.');
    } finally {
      setNoteSaving(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container">
        <div className="spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
        </div>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage all reported civic issues and update their statuses.</p>
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      {stats && (
        <div className="dash-stats" style={{ marginBottom: 'var(--sp-8)' }}>
          <StatCard label="Total Issues"  value={stats.totalIssues}                   color="blue"   />
          <StatCard label="Total Users"   value={stats.totalUsers}                    color="blue2"  />
          <StatCard label="Reported"      value={stats.byStatus.Reported      || 0}   color="yellow" />
          <StatCard label="In Progress"   value={stats.byStatus['In Progress'] || 0}  color="blue2"  />
          <StatCard label="Resolved"      value={stats.byStatus.Resolved      || 0}   color="green"  />
        </div>
      )}

      {/* ── Feedback & Satisfaction Metrics ───────────────── */}
      {feedbackStats && (
        <section className="section" style={{ paddingTop: 0, marginBottom: 'var(--sp-6)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
            <h2>Citizen Satisfaction</h2>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Based on {feedbackStats.feedbackCount} feedback submission{feedbackStats.feedbackCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Metric cards */}
          <div className="fb-metric-grid">
            <FbMetricCard
              icon="⭐"
              label="Avg Rating"
              value={feedbackStats.avgRating !== null ? `${feedbackStats.avgRating} / 5` : '—'}
              sub={feedbackStats.ratedCount ? `from ${feedbackStats.ratedCount} rating${feedbackStats.ratedCount !== 1 ? 's' : ''}` : 'No ratings yet'}
              color="yellow"
            />
            <FbMetricCard
              icon="😊"
              label="Satisfaction Rate"
              value={feedbackStats.satisfactionRate !== null ? `${feedbackStats.satisfactionRate}%` : '—'}
              sub={`${feedbackStats.satisfiedCount} of ${feedbackStats.feedbackCount} confirmed resolved`}
              color="green"
            />
            <FbMetricCard
              icon="📬"
              label="Feedback Rate"
              value={feedbackStats.feedbackRate !== null ? `${feedbackStats.feedbackRate}%` : '—'}
              sub={`${feedbackStats.feedbackCount} of ${feedbackStats.totalResolved} resolved issues`}
              color="blue"
            />
            <FbMetricCard
              icon="🚨"
              label="Escalations"
              value={feedbackStats.escalatedCount}
              sub="Issues reopened by citizens"
              color={feedbackStats.escalatedCount > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Rating distribution bar chart */}
          {feedbackStats.ratedCount > 0 && (
            <div className="fb-dist-card">
              <h3 className="fb-dist-title">Rating Distribution</h3>
              <div className="fb-dist-bars">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedbackStats.ratingDistribution[star] || 0;
                  const pct   = feedbackStats.ratedCount > 0
                    ? Math.round((count / feedbackStats.ratedCount) * 100)
                    : 0;
                  return (
                    <div key={star} className="fb-dist-row">
                      <span className="fb-dist-label">{star} ★</span>
                      <div className="fb-dist-track">
                        <div
                          className="fb-dist-fill"
                          style={{ width: `${pct}%`, background: star >= 4 ? 'var(--success)' : star === 3 ? '#f59e0b' : 'var(--danger)' }}
                        />
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

      {/* ── Escalated Issues Panel ────────────────────────── */}
      {escalated.length > 0 && (
        <section className="section" style={{ paddingTop: 0, marginBottom: 'var(--sp-6)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🚨 Escalated Issues
              <span className="fb-escalated-badge">{escalated.length}</span>
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Citizens reported these as unresolved — requires supervisor review
            </span>
          </div>

          <div className="fb-escalated-list">
            {escalated.map(esc => (
              <div key={esc._id} className="fb-escalated-row card">
                {/* Left info */}
                <div className="fb-esc-info">
                  <div className="fb-esc-tags">
                    <span className="tag">{esc.category}</span>
                    <span className={`badge ${esc.status === 'Resolved' ? 'badge-resolved' : esc.status === 'In Progress' ? 'badge-progress' : 'badge-reported'}`}>
                      {esc.status}
                    </span>
                    <span className="fb-esc-pill">🚨 Escalated</span>
                  </div>
                  <h3 className="fb-esc-title"
                    onClick={() => navigate(`/issues/${esc._id}`)}
                    style={{ cursor: 'pointer' }}
                    title="View issue"
                  >
                    {esc.title}
                  </h3>
                  <div className="fb-esc-meta">
                    <span>📍 {esc.location}</span>
                    <span>👤 {esc.reportedBy}</span>
                    <span>🚨 {new Date(esc.escalatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {esc.feedbackComment && (
                    <p className="fb-esc-comment">
                      💬 Citizen said: <em>"{esc.feedbackComment}"</em>
                    </p>
                  )}
                  {esc.supervisorNote && (
                    <p className="fb-esc-supervisor-note">
                      📋 Supervisor note: <em>"{esc.supervisorNote}"</em>
                    </p>
                  )}
                </div>

                {/* Right action */}
                <div className="fb-esc-action">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/issues/${esc._id}`)}
                  >
                    View Issue
                  </button>
                  {noteTarget === esc._id ? (
                    <div className="fb-note-form">
                      <textarea
                        className="fb-note-input"
                        placeholder="Add supervisor resolution note…"
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        disabled={noteSaving}
                        autoFocus
                      />
                      <div className="fb-note-btns">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveNote(esc._id)}
                          disabled={noteSaving || !noteText.trim()}
                        >
                          {noteSaving ? 'Saving…' : 'Save Note'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setNoteTarget(null); setNoteText(''); }}
                          disabled={noteSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm"
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                      onClick={() => { setNoteTarget(esc._id); setNoteText(esc.supervisorNote || ''); }}
                    >
                      {esc.supervisorNote ? '✏️ Edit Note' : '📋 Add Note'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Issues Section ────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>

        {/* Section head: title + total count */}
        <div className="section-head" style={{ marginBottom: 'var(--sp-4)' }}>
          <h2>All Issues</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {issues.length} issue{issues.length !== 1 ? 's' : ''} total
          </span>
        </div>

        {/* ── Filter bar ──────────────────────────────────── */}
        <div className="admin-filters">
          {/* Search */}
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by title, category, location, or reporter…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search issues"
            />
          </div>

          {/* Status filter */}
          <select
            className="form-select filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Category filter — built from live data */}
          <select
            className="form-select filter-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Clear filters — only shown when something is active */}
          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Results summary */}
        {hasFilter && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* ── No issues at all ────────────────────────────── */}
        {issues.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '40px', marginBottom: 'var(--sp-3)' }}>📋</div>
            <h3>No issues reported yet</h3>
            <p>Issues reported by citizens will appear here.</p>
          </div>
        )}

        {/* ── Filters returned nothing ─────────────────────── */}
        {issues.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '40px', marginBottom: 'var(--sp-3)' }}>🔍</div>
            <h3>No issues found</h3>
            <p>No issues match your current search or filters.</p>
            <button className="btn btn-outline" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Issue rows ──────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="admin-issue-list">
            {filtered.map(issue => (
              <div key={issue._id} className="admin-issue-row card">

                {/* Thumbnail */}
                <div
                  className="admin-issue-thumb"
                  onClick={() => navigate(`/issues/${issue._id}`)}
                  title="View full details"
                >
                  {issue.image ? (
                    <img src={`/uploads/${issue.image}`} alt={issue.title} />
                  ) : (
                    <div className="admin-issue-no-photo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Main info */}
                <div className="admin-issue-info">
                  <div className="admin-issue-tags">
                    <span className="tag">{issue.category}</span>
                    <span className={`badge ${statusClass[issue.status] || 'badge-reported'}`}>
                      {issue.status}
                    </span>
                  </div>
                  <h3 className="admin-issue-title">{issue.title}</h3>
                  <div className="admin-issue-meta">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {issue.location}
                      {/* View Location link — only when coords available */}
                      {issue.coords?.lat != null && issue.coords?.lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${issue.coords.lat},${issue.coords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-map-link"
                          onClick={e => e.stopPropagation()}
                          title="Open in Google Maps"
                        >
                          View Location
                        </a>
                      )}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {issue.reportedBy || 'Unknown'}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {new Date(issue.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* ── Satisfied feedback snippet ── shown when wasResolved=true */}
                  {issue.wasResolved === true && (
                    <div className="admin-feedback-snippet">
                      <span className="admin-fb-satisfied">✅ Resolved confirmed</span>
                      {issue.rating && (
                        <span className="admin-fb-stars">
                          {'★'.repeat(issue.rating)}{'☆'.repeat(5 - issue.rating)}
                        </span>
                      )}
                      {issue.feedbackComment && (
                        <span className="admin-fb-comment">
                          💬 <em>"{issue.feedbackComment}"</em>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right-side actions: View Details + Status update */}
                <div className="admin-issue-action" onClick={e => e.stopPropagation()}>
                  {/* View Details button */}
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/issues/${issue._id}`)}
                    title="View full issue details"
                  >
                    View Details
                  </button>

                  {/* Status updater */}
                  <div className="admin-status-group">
                    <label
                      className="admin-status-label"
                      htmlFor={`status-${issue._id}`}
                    >
                      Status
                    </label>
                    <select
                      id={`status-${issue._id}`}
                      className="form-select admin-status-select"
                      value={issue.status}
                      disabled={updating === issue._id}
                      onChange={e => handleStatusChange(issue._id, e.target.value)}
                      aria-label={`Change status for ${issue.title}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {updating === issue._id && (
                      <span className="admin-saving-text">Saving…</span>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        /* Stats */
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--sp-4);
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-5) var(--sp-6);
          box-shadow: var(--shadow-sm);
        }
        .stat-card-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }
        .stat-card-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .stat-blue   .stat-card-value { color: var(--primary); }
        .stat-yellow .stat-card-value { color: var(--warning); }
        .stat-blue2  .stat-card-value { color: #0891b2; }
        .stat-green  .stat-card-value { color: var(--success); }

        /* Section head */
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Filter bar — mirrors ExploreIssues pattern */
        .admin-filters {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          margin-bottom: var(--sp-4);
          flex-wrap: wrap;
        }
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input { padding-left: 36px; }
        .filter-select {
          width: auto;
          min-width: 140px;
          flex-shrink: 0;
        }

        /* Issue list */
        .admin-issue-list {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          padding-bottom: var(--sp-12);
        }

        /* Each row */
        .admin-issue-row {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: var(--sp-4);
          align-items: center;
          padding: var(--sp-4);
          transition: box-shadow var(--transition), border-color var(--transition), border-left-color var(--transition);
          border-left: 3px solid transparent;
        }
        .admin-issue-row:hover {
          box-shadow: var(--shadow);
          border-color: var(--border-hover);
          border-left-color: var(--primary);
        }

        /* Thumbnail */
        .admin-issue-thumb {
          width: 80px;
          height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border);
          flex-shrink: 0;
          cursor: pointer;
        }
        .admin-issue-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.2s;
        }
        .admin-issue-thumb:hover img { transform: scale(1.05); }
        .admin-issue-no-photo {
          width: 100%;
          height: 100%;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        /* Info block */
        .admin-issue-tags {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-bottom: var(--sp-2);
        }
        .admin-issue-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--sp-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 500px;
        }
        .admin-issue-meta {
          display: flex;
          align-items: center;
          gap: var(--sp-4);
          font-size: 12px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .admin-issue-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .admin-map-link {
          font-size: 11px;
          font-weight: 500;
          color: var(--primary);
          text-decoration: none;
          border: 1px solid var(--primary);
          border-radius: var(--radius-sm);
          padding: 1px 6px;
          margin-left: 4px;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .admin-map-link:hover {
          background: var(--primary);
          color: #fff;
          text-decoration: none;
        }

        /* Right-side action column */
        .admin-issue-action {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--sp-3);
          min-width: 160px;
          flex-shrink: 0;
        }
        .admin-status-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .admin-status-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .admin-status-select {
          font-size: 13px;
          padding: 6px 32px 6px 10px;
          width: 100%;
        }
        .admin-saving-text {
          font-size: 12px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .admin-saving-text::before {
          content: '';
          display: inline-block;
          width: 10px;
          height: 10px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Satisfied feedback snippet inside issue row ────────────────── */
        .admin-feedback-snippet {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
          padding: 6px 10px;
          background: var(--success-light);
          border: 1px solid #86efac;
          border-radius: var(--radius-sm);
          flex-wrap: wrap;
        }
        .admin-fb-satisfied {
          font-size: 11px;
          font-weight: 700;
          color: var(--success);
          white-space: nowrap;
        }
        .admin-fb-stars {
          font-size: 13px;
          color: #f59e0b;
          letter-spacing: 1px;
          white-space: nowrap;
        }
        .admin-fb-comment {
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 320px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: repeat(3, 1fr); }
          .admin-issue-row { grid-template-columns: 64px 1fr; }
          .admin-issue-action {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            min-width: unset;
          }
          .admin-status-group { flex-direction: row; align-items: center; gap: var(--sp-2); }
          .admin-status-label { display: none; }
          .admin-status-select { width: auto; }
        }
        @media (max-width: 600px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr); }
          .admin-filters { gap: var(--sp-2); }
          .filter-select { min-width: 120px; }
          .admin-issue-thumb { width: 64px; height: 52px; }
          .admin-issue-title { font-size: 14px; max-width: 200px; }
          .admin-issue-meta  { gap: var(--sp-2); }
        }

        /* ── Feedback metric cards ───────────────────────────────────────── */
        .fb-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--sp-4);
          margin-bottom: var(--sp-5);
        }
        .fb-metric-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-5);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          border-left: 4px solid transparent;
          transition: box-shadow var(--transition), transform var(--transition);
        }
        .fb-metric-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
        .fb-metric-icon { font-size: 22px; line-height: 1; }
        .fb-metric-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          color: var(--text-primary);
        }
        .fb-metric-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .fb-metric-sub {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .fb-metric-yellow { border-left-color: #f59e0b; }
        .fb-metric-yellow .fb-metric-value { color: #f59e0b; }
        .fb-metric-green  { border-left-color: var(--success); }
        .fb-metric-green  .fb-metric-value { color: var(--success); }
        .fb-metric-blue   { border-left-color: var(--primary); }
        .fb-metric-blue   .fb-metric-value { color: var(--primary); }
        .fb-metric-red    { border-left-color: var(--danger); }
        .fb-metric-red    .fb-metric-value { color: var(--danger); }

        /* ── Rating distribution ────────────────────────────────────────── */
        .fb-dist-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--sp-5);
          box-shadow: var(--shadow-sm);
        }
        .fb-dist-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--sp-4);
        }
        .fb-dist-bars { display: flex; flex-direction: column; gap: 8px; }
        .fb-dist-row {
          display: grid;
          grid-template-columns: 32px 1fr 28px;
          align-items: center;
          gap: var(--sp-3);
        }
        .fb-dist-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
        .fb-dist-track {
          height: 8px;
          background: var(--bg);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .fb-dist-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
          min-width: 2px;
        }
        .fb-dist-count { font-size: 12px; color: var(--text-muted); text-align: right; }

        /* ── Escalated issues panel ─────────────────────────────────────── */
        .fb-escalated-badge {
          font-size: 11px;
          font-weight: 700;
          background: var(--danger-light);
          color: var(--danger);
          border: 1px solid #fca5a5;
          border-radius: 999px;
          padding: 2px 9px;
        }
        .fb-escalated-list {
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }
        .fb-escalated-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--sp-4);
          align-items: start;
          padding: var(--sp-4) var(--sp-5);
          border-left: 4px solid var(--danger);
          transition: box-shadow var(--transition);
        }
        .fb-escalated-row:hover { box-shadow: var(--shadow); }
        .fb-esc-tags {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-bottom: var(--sp-2);
          flex-wrap: wrap;
        }
        .fb-esc-pill {
          font-size: 11px;
          font-weight: 700;
          background: var(--danger-light);
          color: var(--danger);
          border: 1px solid #fca5a5;
          border-radius: 999px;
          padding: 2px 9px;
        }
        .fb-esc-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--sp-2);
        }
        .fb-esc-title:hover { color: var(--primary); text-decoration: underline; }
        .fb-esc-meta {
          display: flex;
          gap: var(--sp-4);
          font-size: 12px;
          color: var(--text-muted);
          flex-wrap: wrap;
          margin-bottom: var(--sp-2);
        }
        .fb-esc-comment {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--warning-light);
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          margin: var(--sp-2) 0 0;
        }
        .fb-esc-supervisor-note {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--success-light);
          border: 1px solid #86efac;
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          margin: var(--sp-2) 0 0;
        }
        .fb-esc-action {
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
          min-width: 140px;
          align-items: flex-end;
        }
        .fb-note-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--sp-2);
        }
        .fb-note-input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 7px 10px;
          font-size: 12px;
          font-family: var(--font);
          color: var(--text-primary);
          background: var(--bg);
          resize: vertical;
          outline: none;
          transition: border-color 0.15s;
        }
        .fb-note-input:focus { border-color: var(--primary); }
        .fb-note-btns { display: flex; gap: var(--sp-2); justify-content: flex-end; }

        /* ── Responsive feedback ────────────────────────────────────────── */
        @media (max-width: 900px) {
          .fb-metric-grid { grid-template-columns: repeat(2, 1fr); }
          .fb-escalated-row { grid-template-columns: 1fr; }
          .fb-esc-action { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
        }
        @media (max-width: 600px) {
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

function FbMetricCard({ icon, label, value, sub, color }) {
  return (
    <div className={`fb-metric-card fb-metric-${color}`}>
      <span className="fb-metric-icon">{icon}</span>
      <div className="fb-metric-value">{value}</div>
      <div className="fb-metric-label">{label}</div>
      {sub && <div className="fb-metric-sub">{sub}</div>}
    </div>
  );
}
