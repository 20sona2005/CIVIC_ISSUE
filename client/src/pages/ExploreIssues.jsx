import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import IssueCard from '../components/IssueCard';

const CATEGORIES = ['All', 'Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];
const STATUSES   = ['All', 'Reported', 'In Progress', 'Resolved'];

export default function ExploreIssues() {
  const { t, i18n } = useTranslation();
  const [issues, setIssues]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus]     = useState('All');
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();

  /* ── AI Enhance state ── */
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiSuggestion, setAiSuggestion]   = useState('');
  const [aiError, setAiError]             = useState('');

  const handleEnhance = async () => {
    const q = search.trim();
    if (!q) { setAiError(t('explore.aiEmptyError')); return; }
    setAiError('');
    setAiSuggestion('');
    setAiLoading(true);
    try {
      const lang = i18n.language?.startsWith('ta') ? 'ta' : 'en';
      const { data } = await api.post('/chatbot/enhance-search', { query: q, lang });
      setAiSuggestion(data.enhanced);
    } catch (err) {
      setAiError(err.response?.data?.message || t('explore.aiError'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseEnhanced = () => {
    setSearch(aiSuggestion);
    setAiSuggestion('');
    setAiError('');
  };

  const handleKeepOriginal = () => {
    setAiSuggestion('');
    setAiError('');
  };

  /* ── Data fetching ── */
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
        setError(t('explore.errorLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filtering (unchanged) ── */
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
    setAiSuggestion('');
    setAiError('');
  };
  const hasFilter = search || category !== 'All' || status !== 'All';

  const categoryLabel = (c) => c === 'All' ? t('explore.allCategories') : t(`category.${c === 'Water Leakage' ? 'WaterLeakage' : c}`, c);
  const statusLabel   = (s) => s === 'All' ? t('explore.allStatuses') : t(`status.${s === 'In Progress' ? 'InProgress' : s}`, s);

  return (
    <div className="container">
      <div className="page-header">
        <h1>{t('explore.title')}</h1>
        <p>{t('explore.sub')}</p>
      </div>

      {/* ── Filters Bar ── */}
      <div className="explore-filters">
        {/* Search input */}
        <div className="search-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" className="form-input search-input"
            placeholder={t('explore.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setAiSuggestion(''); setAiError(''); }}
            aria-label={t('explore.searchAria')}
          />
        </div>

        {/* ✨ Enhance with AI button */}
        <button
          type="button"
          className="btn explore-ai-btn"
          onClick={handleEnhance}
          disabled={aiLoading}
          title={t('explore.aiEnhance')}
        >
          {aiLoading ? (
            <><span className="explore-ai-spinner" />{t('explore.aiEnhancing')}</>
          ) : (
            <>{t('explore.aiEnhance')}</>
          )}
        </button>

        <select className="form-select filter-select" value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('explore.filterCategoryAria')}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>

        <select className="form-select filter-select" value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t('explore.filterStatusAria')}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        {hasFilter && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            {t('explore.clearFilters')}
          </button>
        )}
      </div>

      {/* ── AI error (empty input) ── */}
      {aiError && !aiSuggestion && (
        <p className="explore-ai-error">{aiError}</p>
      )}

      {/* ── AI suggestion panel ── */}
      {aiSuggestion && (
        <div className="explore-ai-panel">
          <div className="explore-ai-panel-header">
            <span className="explore-ai-panel-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {t('explore.aiLabel')}
            </span>
          </div>
          <input
            type="text"
            className="form-input explore-ai-input"
            value={aiSuggestion}
            onChange={(e) => setAiSuggestion(e.target.value)}
            aria-label={t('explore.aiLabel')}
          />
          <div className="explore-ai-actions">
            <button className="btn btn-primary btn-sm" onClick={handleUseEnhanced}>
              {t('explore.aiUse')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleKeepOriginal}>
              {t('explore.aiKeep')}
            </button>
          </div>
        </div>
      )}

      {/* ── Results summary ── */}
      {!loading && !error && (
        <div className="explore-summary">
          <span>
            {hasFilter
              ? t('explore.issuesFoundFiltered', { count: filtered.length })
              : t('explore.issuesFound', { count: filtered.length })
            }
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>
            {t('explore.reportIssue')}
          </button>
        </div>
      )}

      {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
      {error && <div className="alert alert-error" style={{ marginTop: 'var(--sp-4)' }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>{hasFilter ? t('explore.noMatchTitle') : t('explore.noIssuesTitle')}</h3>
          <p>{hasFilter ? t('explore.noMatchSub') : t('explore.noIssuesSub')}</p>
          {hasFilter ? (
            <button className="btn btn-outline" onClick={clearFilters}>{t('explore.clearFiltersCta')}</button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/report')}>{t('explore.reportIssueCta')}</button>
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

      {/* Category pills */}
      <div className="cat-pills">
        {CATEGORIES.map((cat) => (
          <button key={cat} className={`cat-pill ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}>
            {categoryLabel(cat)}
          </button>
        ))}
      </div>

      <style>{`
        /* ── Filters bar ── */
        .explore-filters { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-2); flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px; }
        .filter-select { width: auto; min-width: 150px; flex-shrink: 0; }

        /* ── AI Enhance button ── */
        .explore-ai-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0 14px; height: 38px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: #fff; border: none; border-radius: var(--radius-sm);
          font-size: 13px; font-weight: 600; font-family: var(--font);
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(124,58,237,0.28);
        }
        .explore-ai-btn:hover:not(:disabled) {
          opacity: 0.90; transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(124,58,237,0.38);
        }
        .explore-ai-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .explore-ai-spinner {
          width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── AI error ── */
        .explore-ai-error {
          font-size: 12px; color: var(--danger); font-weight: 500;
          margin: 0 0 var(--sp-3); padding: 0;
        }

        /* ── AI suggestion panel ── */
        .explore-ai-panel {
          border: 1.5px solid #a855f7; border-radius: var(--radius);
          background: #faf5ff; margin-bottom: var(--sp-4); overflow: hidden;
          animation: aiFadeIn 0.2s ease;
        }
        @keyframes aiFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .explore-ai-panel-header {
          display: flex; align-items: center; padding: 7px 12px;
          background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff;
        }
        .explore-ai-panel-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .explore-ai-input {
          border: none !important; border-radius: 0 !important;
          background: #faf5ff !important; box-shadow: none !important;
          font-size: 14px; font-weight: 500;
        }
        .explore-ai-input:focus { background: #f3e8ff !important; box-shadow: none !important; }
        .explore-ai-actions {
          display: flex; gap: var(--sp-2); padding: 8px 12px;
          border-top: 1px solid #e9d5ff; background: #f5f0ff;
        }

        /* ── Rest (unchanged) ── */
        .explore-summary { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); font-size: 13px; color: var(--text-secondary); }
        .empty-icon { font-size: 40px; margin-bottom: var(--sp-3); }
        .cat-pills { display: none; flex-wrap: wrap; gap: var(--sp-2); padding: var(--sp-4) 0 var(--sp-8); }
        .cat-pill {
          padding: 6px var(--sp-3); font-size: 13px; font-weight: 500;
          border: 1px solid var(--border); border-radius: 999px;
          background: var(--surface); color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s; font-family: var(--font);
        }
        .cat-pill:hover { border-color: var(--primary); color: var(--primary); }
        .cat-pill.active { background: var(--primary); border-color: var(--primary); color: #fff; }
        @media (max-width: 700px) {
          .explore-filters { gap: var(--sp-2); }
          .filter-select { min-width: 120px; }
          .explore-ai-btn { font-size: 12px; padding: 0 10px; }
          .cat-pills { display: flex; }
        }
      `}</style>
    </div>
  );
}
