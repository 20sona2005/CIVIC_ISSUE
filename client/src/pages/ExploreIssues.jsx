import { useEffect, useState, useRef } from 'react';
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

  /* ── Voice search state ── */
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError]         = useState('');
  const recognitionRef  = useRef(null);
  const isListeningRef  = useRef(false);

  const getRecognitionLang = () =>
    i18n.language?.startsWith('ta') ? 'ta-IN' : 'en-IN';

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch (_) {}
      recognitionRef.current = null;
    };
  }, []);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) { setVoiceError(t('explore.voiceNotSupported')); return; }

    if (isListeningRef.current) {
      /* ── STOP ── */
      isListeningRef.current = false;
      setVoiceListening(false);
      try { recognitionRef.current?.abort(); } catch (_) {}
      recognitionRef.current = null;
      return;
    }

    /* ── START ── */
    setVoiceError('');
    isListeningRef.current = true;
    setVoiceListening(true);

    const recognition        = new SR();
    recognition.lang         = getRecognitionLang();
    recognition.continuous   = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) setSearch(transcript);
      isListeningRef.current = false;
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      if (!isListeningRef.current) return;
      isListeningRef.current = false;
      setVoiceListening(false);
      recognitionRef.current = null;
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setVoiceError(t('explore.voiceError'));
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        isListeningRef.current = false;
        setVoiceListening(false);
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (_) {
      isListeningRef.current = false;
      setVoiceListening(false);
      setVoiceError(t('explore.voiceError'));
    }
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

  /* ── Filtering ── */
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

  const clearFilters = () => { setSearch(''); setCategory('All'); setStatus('All'); };
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
        <div className="search-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" className="form-input search-input"
            placeholder={t('explore.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVoiceError(''); }}
            aria-label={t('explore.searchAria')}
          />
          <button
            type="button"
            className={`voice-search-btn${voiceListening ? ' voice-search-btn--listening' : ''}`}
            onClick={toggleVoice}
            title={voiceListening ? t('explore.voiceStop') : t('explore.voiceStart')}
            aria-label={voiceListening ? t('explore.voiceStop') : t('explore.voiceStart')}
            aria-pressed={voiceListening}
          >
            {voiceListening ? (
              /* Stop icon */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              /* Mic icon */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        </div>
        {voiceListening && (
          <span className="voice-search-label">
            <span className="voice-search-pulse" />
            {t('explore.voiceListening')}
          </span>
        )}
        {voiceError && (
          <span className="form-error" style={{ fontSize: 12, alignSelf: 'center' }}>
            {voiceError}
          </span>
        )}

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
        .explore-filters { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px; padding-right: 38px; }
        .voice-search-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px; border-radius: 50%; border: none;
          background: transparent; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: color 0.15s, background 0.15s; flex-shrink: 0;
        }
        .voice-search-btn:hover { color: var(--primary); background: var(--primary-light, #eff6ff); }
        .voice-search-btn--listening { color: #dc2626; background: #fee2e2; animation: voicePulseBtn 1.2s ease-in-out infinite; }
        @keyframes voicePulseBtn { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow: 0 0 0 5px rgba(220,38,38,0); } }
        .voice-search-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #dc2626; font-weight: 500;
          align-self: center;
        }
        .voice-search-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #dc2626; flex-shrink: 0;
          animation: voiceDot 1s ease-in-out infinite;
        }
        @keyframes voiceDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        .filter-select { width: auto; min-width: 150px; flex-shrink: 0; }
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
        @media (max-width: 600px) {
          .explore-filters { gap: var(--sp-2); }
          .filter-select   { min-width: 120px; }
          .cat-pills       { display: flex; }
        }
      `}</style>
    </div>
  );
}
