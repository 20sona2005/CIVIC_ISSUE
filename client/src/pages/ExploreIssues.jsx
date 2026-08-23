import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import IssueCard from '../components/IssueCard';

const CATEGORIES = ['All', 'Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];
const STATUSES   = ['All', 'Reported', 'In Progress', 'Resolved'];

export default function ExploreIssues() {
  const [issues, setIssues]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [status, setStatus]         = useState('All');
  const [searchParams]              = useSearchParams();
  const navigate                    = useNavigate();

  // Pre-select category from URL query (e.g. from Dashboard category cards)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORIES.includes(cat)) setCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const { data } = await api.get('/issues');
        setIssues(data);
      } catch {
        setError('Failed to load issues. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  // Client-side filter + search
  const filtered = issues.filter((issue) => {
    const matchCat    = category === 'All' || issue.category === category;
    const matchStatus = status   === 'All' || issue.status   === status;
    const q           = search.trim().toLowerCase();
    const matchSearch = !q ||
      issue.title.toLowerCase().includes(q) ||
      issue.description.toLowerCase().includes(q) ||
      issue.location.toLowerCase().includes(q) ||
      issue.reportedBy.toLowerCase().includes(q);
    return matchCat && matchStatus && matchSearch;
  });

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setStatus('All');
  };

  const hasFilter = search || category !== 'All' || status !== 'All';

  return (
    <div className="container">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="page-header">
        <h1>Explore Issues</h1>
        <p>Browse all civic issues reported by the community.</p>
      </div>

      {/* ── Filters Bar ─────────────────────────────────── */}
      <div className="explore-filters">
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
            placeholder="Search by title, location, reporter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search issues"
          />
        </div>

        {/* Category filter */}
        <select
          className="form-select filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="form-select filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
          ))}
        </select>

        {hasFilter && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Results summary ─────────────────────────────── */}
      {!loading && !error && (
        <div className="explore-summary">
          <span>
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''} found
            {hasFilter && ' (filtered)'}
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/report')}
          >
            + Report Issue
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────── */}
      {loading && (
        <div className="spinner-wrap"><div className="spinner" /></div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: 'var(--sp-4)' }}>{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>{hasFilter ? 'No matching issues' : 'No issues yet'}</h3>
          <p>
            {hasFilter
              ? 'Try adjusting your filters or search term.'
              : 'Be the first to report a civic issue in your community.'}
          </p>
          {hasFilter ? (
            <button className="btn btn-outline" onClick={clearFilters}>Clear Filters</button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/report')}>
              Report an Issue
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid-3" style={{ paddingBottom: 'var(--sp-12)' }}>
          {filtered.map((issue) => (
            <IssueCard key={issue._id} issue={issue} />
          ))}
        </div>
      )}

      {/* ── Category filter pills (mobile-friendly) ─────── */}
      <div className="cat-pills">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`cat-pill ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <style>{`
        /* Filters bar */
        .explore-filters {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          margin-bottom: var(--sp-4);
          flex-wrap: wrap;
        }
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          padding-left: 36px;
        }
        .filter-select {
          width: auto;
          min-width: 150px;
          flex-shrink: 0;
        }

        /* Summary row */
        .explore-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-5);
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Empty state icon */
        .empty-icon { font-size: 40px; margin-bottom: var(--sp-3); }

        /* Category pills — shown below grid for quick re-filter */
        .cat-pills {
          display: none;
          flex-wrap: wrap;
          gap: var(--sp-2);
          padding: var(--sp-4) 0 var(--sp-8);
        }
        .cat-pill {
          padding: 6px var(--sp-3);
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font);
        }
        .cat-pill:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .cat-pill.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }

        @media (max-width: 600px) {
          .explore-filters { gap: var(--sp-2); }
          .filter-select   { min-width: 120px; }
          .cat-pills       { display: flex; }
        }
      `}</style>
    </div>
  );
}
