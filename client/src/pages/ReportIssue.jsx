import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];
const CATEGORY_KEY = {
  'Pothole': 'Pothole', 'Garbage': 'Garbage', 'Streetlight': 'Streetlight',
  'Drainage': 'Drainage', 'Water Leakage': 'WaterLeakage', 'Other': 'Other',
};

/* ─── Helper sub-components ──────────────────────────────────────────────── */

function confidenceLabel(score, t) {
  if (score >= 0.80) return { label: t('report.confidenceVeryHigh'), color: '#dc2626', bg: '#fef2f2' };
  if (score >= 0.65) return { label: t('report.confidenceHigh'),     color: '#d97706', bg: '#fffbeb' };
  return               { label: t('report.confidencePossible'),     color: '#2563eb', bg: '#eff6ff' };
}

function ScoreChip({ label, value }) {
  const pct   = Math.round(value * 100);
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#6b7280';
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f3f4f6', color, fontWeight: 600, border: '1px solid #e5e7eb' }}>
      {label}: {pct}%
    </span>
  );
}

function DuplicateCard({ dup, onSupport, onView, supporting, alreadySupported, t }) {
  const conf  = confidenceLabel(dup.confidence, t);
  const issue = dup.issue;
  const pct   = Math.round(dup.confidence * 100);
  return (
    <div style={{ border: `1px solid ${conf.color}40`, borderRadius: 10, padding: '14px 16px', background: '#fff', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.color}60`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
          {conf.label} — {pct}%
        </span>
        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>👥</span>
          <span>{t('report.citizensReported', { count: (issue.supportCount || 0) + 1 })}</span>
        </span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px', color: '#111827' }}>{issue.title}</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>📍 {issue.location}</p>
        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {issue.description}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <ScoreChip label={t('report.scoreCategory')}    value={dup.scores.category} />
        <ScoreChip label={t('report.scoreLocation')}    value={dup.scores.location} />
        <ScoreChip label={t('report.scoreDescription')} value={dup.scores.description} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: issue.status === 'Resolved' ? '#f0fdf4' : issue.status === 'In Progress' ? '#fffbeb' : '#eff6ff',
          color:      issue.status === 'Resolved' ? '#16a34a' : issue.status === 'In Progress' ? '#d97706' : '#2563eb',
          border:     `1px solid ${issue.status === 'Resolved' ? '#86efac' : issue.status === 'In Progress' ? '#fcd34d' : '#93c5fd'}`,
        }}>{issue.status}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => onView(issue._id)}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
            {t('report.viewIssueDupe')}
          </button>
          <button type="button" onClick={() => onSupport(issue._id)}
            disabled={supporting === issue._id || alreadySupported.has(issue._id)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: alreadySupported.has(issue._id) ? '#d1fae5' : '#2563eb',
              color: alreadySupported.has(issue._id) ? '#065f46' : '#fff',
              fontSize: 13, cursor: alreadySupported.has(issue._id) || supporting === issue._id ? 'not-allowed' : 'pointer',
              fontWeight: 600, opacity: supporting === issue._id ? 0.7 : 1, transition: 'all 0.15s',
            }}>
            {alreadySupported.has(issue._id) ? t('report.supported') : supporting === issue._id ? t('report.supporting') : t('report.supportBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function ReportIssue() {
  const { t, i18n } = useTranslation();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  /* form state */
  const [form, setForm]           = useState({ title: '', description: '', category: '', location: '' });
  const [coords, setCoords]       = useState({ lat: null, lng: null });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]   = useState('');
  const [image, setImage]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  /* duplicate-detection state */
  const [checkingDupes, setCheckingDupes]     = useState(false);
  const [duplicates, setDuplicates]           = useState([]);
  const [showDupeWarning, setShowDupeWarning] = useState(false);
  const [supporting, setSupporting]           = useState(null);
  const [alreadySupported, setAlreadySupported] = useState(new Set());
  const [forceSubmit, setForceSubmit]         = useState(false);

  /* ── Voice-to-text state ── */
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError]         = useState('');
  const [interimText, setInterimText]       = useState('');
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const descriptionRef = useRef('');

  // Keep descriptionRef always current — used inside async speech callbacks
  descriptionRef.current = form.description;

  const getRecognitionLang = () =>
    i18n.language?.startsWith('ta') ? 'ta-IN' : 'en-IN';

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) { setVoiceError(t('voice.notSupported')); return; }

    if (isListeningRef.current) {
      /* ── STOP ── */
      isListeningRef.current = false;
      setVoiceListening(false);
      setInterimText('');
      try { recognitionRef.current?.abort(); } catch (_) {}
      recognitionRef.current = null;
      return;
    }

    /* ── START ── */
    setVoiceError('');
    setInterimText('');
    isListeningRef.current = true;
    setVoiceListening(true);

    const recognition = new SR();
    recognition.lang            = getRecognitionLang();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const base = descriptionRef.current.trimEnd();
          const sep  = base.length > 0 ? ' ' : '';
          const next = base + sep + piece.trim();
          descriptionRef.current = next;
          setForm(prev => ({ ...prev, description: next }));
          setInterimText('');
        } else {
          interim += piece;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (!isListeningRef.current) return;
      setInterimText('');
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      isListeningRef.current = false;
      setVoiceListening(false);
      switch (event.error) {
        case 'not-allowed':    setVoiceError(t('voice.permissionDenied'));   break;
        case 'audio-capture':  setVoiceError(t('voice.audioCaptureError'));  break;
        case 'network':        setVoiceError(t('voice.networkError'));       break;
        default:               setVoiceError(t('voice.genericError'));
      }
    };

    recognition.onend = () => {
      setInterimText('');
      if (!isListeningRef.current) { setVoiceListening(false); return; }
      // Auto-restart to keep listening across natural pauses
      try {
        recognition.start();
      } catch (_) {
        try {
          const r2 = new SR();
          r2.lang = getRecognitionLang();
          r2.continuous = true;
          r2.interimResults = true;
          r2.onresult = recognition.onresult;
          r2.onerror  = recognition.onerror;
          r2.onend    = recognition.onend;
          recognitionRef.current = r2;
          r2.start();
        } catch (_2) {
          isListeningRef.current = false;
          setVoiceListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      isListeningRef.current = false;
      setVoiceListening(false);
      setVoiceError(t('voice.genericError'));
    }
  };

  /* ── General form handlers ── */
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    if (e.target.name === 'location') { setCoords({ lat: null, lng: null }); setGeoError(''); }
    if (showDupeWarning) { setShowDupeWarning(false); setDuplicates([]); setForceSubmit(false); }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setGeoError(t('report.geoGeneric')); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setForm(f => ({ ...f, location: f.location.trim() || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:    setGeoError(t('report.geoDenied'));       break;
          case err.POSITION_UNAVAILABLE: setGeoError(t('report.geoUnavailable')); break;
          case err.TIMEOUT:              setGeoError(t('report.geoTimeout'));      break;
          default:                       setGeoError(t('report.geoGeneric'));
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => { setImage(null); setPreview(null); };

  const handleSupport = async (issueId) => {
    setSupporting(issueId);
    try {
      await api.post(`/issues/${issueId}/support`, { userId: user.name });
      setAlreadySupported(prev => new Set([...prev, issueId]));
      setDuplicates(prev => prev.map(d =>
        d.issue._id === issueId
          ? { ...d, issue: { ...d.issue, supportCount: (d.issue.supportCount || 0) + 1 } }
          : d
      ));
    } catch (err) {
      const msg = err.response?.data?.message || t('report.supportError');
      if (msg.toLowerCase().includes('already')) setAlreadySupported(prev => new Set([...prev, issueId]));
    } finally {
      setSupporting(null);
    }
  };

  const handleView = (issueId) => window.open(`/issues/${issueId}`, '_blank');

  const submitIssue = async (topDuplicate) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title',       form.title);
      formData.append('description', form.description);
      formData.append('category',    form.category);
      formData.append('location',    form.location);
      formData.append('reportedBy',  user.name);
      if (coords.lat !== null) formData.append('lat', coords.lat);
      if (coords.lng !== null) formData.append('lng', coords.lng);
      if (image) formData.append('image', image);
      if (topDuplicate) {
        formData.append('duplicateOf',         topDuplicate.issue._id);
        formData.append('duplicateConfidence', topDuplicate.confidence);
      }
      await api.post('/issues', formData);
      setSuccess(true);
      setTimeout(() => navigate('/explore'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || t('report.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description || !form.category || !form.location) {
      setError(t('report.errorRequired'));
      return;
    }
    if (forceSubmit) { await submitIssue(duplicates[0] || null); return; }

    setCheckingDupes(true);
    try {
      const params = {
        title: form.title, description: form.description,
        category: form.category, location: form.location,
      };
      if (coords.lat !== null) params.lat = coords.lat;
      if (coords.lng !== null) params.lng = coords.lng;
      const { data } = await api.get('/issues/check-duplicate', { params });
      if (data.hasDuplicates) {
        setDuplicates(data.duplicates);
        setShowDupeWarning(true);
        setCheckingDupes(false);
        return;
      }
    } catch { /* proceed silently */ } finally { setCheckingDupes(false); }

    await submitIssue(null);
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="container">
        <div className="report-success">
          <div className="success-icon">✓</div>
          <h2>{t('report.successTitle')}</h2>
          <p>{t('report.successSub')}</p>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="container">
      <div className="page-header">
        <h1>{t('report.title')}</h1>
        <p>{t('report.sub')}</p>
      </div>

      <div className="report-layout">
        <div className="report-form-col">

          {/* Duplicate warning panel */}
          {showDupeWarning && duplicates.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                    {t('report.dupeTitle', { count: duplicates.length })}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                    {t('report.dupeSub', { count: duplicates.length })}
                  </p>
                </div>
              </div>
              {duplicates.map((dup) => (
                <DuplicateCard key={dup.issue._id} dup={dup} onSupport={handleSupport} onView={handleView}
                  supporting={supporting} alreadySupported={alreadySupported} t={t} />
              ))}
              <div style={{ borderTop: '1px solid #fcd34d', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#78350f', fontWeight: 500 }}>{t('report.dupeQuestion')}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button"
                    onClick={() => { setForceSubmit(true); setShowDupeWarning(false); submitIssue(duplicates[0]); }}
                    disabled={loading}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #d97706', background: '#fff', color: '#92400e', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    {loading ? t('report.submitting') : t('report.dupeSubmitAnyway')}
                  </button>
                  <button type="button" onClick={() => { setShowDupeWarning(false); setDuplicates([]); }}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                    {t('report.dupeEditReport')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Issue form */}
          <div className="card">
            <div className="card-body">
              {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }}>{error}</div>}
              <form onSubmit={handleSubmit} noValidate>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    {t('report.titleField')} <span className="req">*</span>
                  </label>
                  <input id="title" name="title" type="text" className="form-input"
                    placeholder={t('report.titlePlaceholder')} value={form.title}
                    onChange={handleChange} maxLength={120} />
                  <span className="form-hint">{t('report.titleCount', { n: form.title.length })}</span>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="category">
                    {t('report.categoryField')} <span className="req">*</span>
                  </label>
                  <select id="category" name="category" className="form-select"
                    value={form.category} onChange={handleChange}>
                    <option value="">{t('report.categoryDefault')}</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{t(`category.${CATEGORY_KEY[cat]}`, cat)}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label" htmlFor="location">
                    {t('report.locationField')} <span className="req">*</span>
                  </label>
                  <div className="location-input-row">
                    <input id="location" name="location" type="text" className="form-input"
                      placeholder={t('report.locationPlaceholder')} value={form.location}
                      onChange={handleChange} />
                    <button type="button" className="btn btn-outline btn-sm geo-btn"
                      onClick={useCurrentLocation} disabled={geoLoading} title={t('report.useGps')}>
                      {geoLoading ? <span className="geo-spinner" /> : t('report.useGps')}
                    </button>
                  </div>
                  {coords.lat !== null && (
                    <span className="form-hint geo-confirmed">
                      {t('report.gpsConfirmed', { lat: coords.lat.toFixed(4), lng: coords.lng.toFixed(4) })}
                    </span>
                  )}
                  {geoError && <span className="form-error">{geoError}</span>}
                </div>

                {/* Description + Voice + AI Assist */}
                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    {t('report.descriptionField')} <span className="req">*</span>
                  </label>

                  {/* Textarea with mic button */}
                  <div className="desc-wrap">
                    <textarea
                      id="description" name="description" className="form-textarea"
                      placeholder={t('report.descriptionPlaceholder')}
                      value={form.description}
                      onChange={handleChange}
                      rows={5} maxLength={1000}
                    />
                    <button
                      type="button"
                      className={`mic-btn ${voiceListening ? 'mic-btn--listening' : ''}`}
                      onClick={toggleVoice}
                      title={voiceListening ? t('voice.stopListening') : t('voice.startListening')}
                      aria-label={voiceListening ? t('voice.stopListening') : t('voice.startListening')}
                      aria-pressed={voiceListening}
                    >
                      {voiceListening ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Voice status */}
                  {voiceListening && (
                    <span className="voice-listening-label">
                      <span className="voice-pulse" />
                      {t('voice.listening')}
                      {interimText && <span className="voice-interim"> — {interimText}</span>}
                    </span>
                  )}
                  {voiceError && <span className="form-error">{voiceError}</span>}

                  {/* Char count */}
                  <span className="form-hint">{t('report.descriptionCount', { n: form.description.length })}</span>
                </div>

                {/* Photo */}
                <div className="form-group">
                  <label className="form-label">{t('report.photoField')}</label>
                  {preview ? (
                    <div className="img-preview-wrap">
                      <img src={preview} alt="Preview" className="img-preview" />
                      <button type="button" className="img-remove-btn" onClick={removeImage}
                        aria-label={t('report.photoRemove')}>✕</button>
                    </div>
                  ) : (
                    <label className="upload-zone" htmlFor="image">
                      <div className="upload-icon">📷</div>
                      <span className="upload-text">{t('report.photoUpload')}</span>
                      <span className="upload-hint">{t('report.photoHint')}</span>
                      <input id="image" type="file" accept="image/jpeg,image/png,image/webp"
                        onChange={handleImage} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                <button type="submit" className="btn btn-primary btn-full btn-lg"
                  disabled={loading || checkingDupes}>
                  {checkingDupes ? t('report.checkingDupes') : loading ? t('report.submitting') : t('report.submitBtn')}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="report-sidebar">
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>{t('report.tipsTitle')}</h3>
              <ul className="tips-list">
                {[1,2,3,4,5,6].map(n => <li key={n}>{t(`report.tip${n}`)}</li>)}
              </ul>
            </div>
          </div>
          <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>{t('report.reportingAs')}</h3>
              <div className="reporter-info">
                <div className="reporter-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 14 }}>{t('report.dupDetectTitle')}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.6 }}>
                {t('report.dupDetectSub')}
              </p>
              <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                <li>{t('report.dupDetectRule1')}</li>
                <li>{t('report.dupDetectRule2')}</li>
                <li>{t('report.dupDetectRule3')}</li>
              </ul>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                {t('report.dupDetectFooter')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .report-layout { display: grid; grid-template-columns: 1fr 300px; gap: var(--sp-6); padding-bottom: var(--sp-12); }
        .req { color: var(--danger); margin-left: 2px; }

        /* ── Description wrapper ── */
        .desc-wrap { position: relative; }
        .desc-wrap .form-textarea { padding-right: 44px; }

        /* ── Mic button ── */
        .mic-btn {
          position: absolute; bottom: 10px; right: 10px;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1.5px solid var(--border); background: var(--surface);
          color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .mic-btn:hover { background: var(--primary-light); color: var(--primary); border-color: var(--primary-mid); }
        .mic-btn--listening {
          background: #fef2f2; color: #dc2626; border-color: #fca5a5;
          animation: mic-pulse-ring 1.4s ease-in-out infinite;
        }
        @keyframes mic-pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.20); }
          70%  { box-shadow: 0 0 0 7px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0   rgba(220,38,38,0); }
        }

        /* ── Voice status ── */
        .voice-listening-label {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 4px;
        }
        .voice-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #dc2626; flex-shrink: 0;
          animation: voice-dot-pulse 1s ease-in-out infinite;
        }
        @keyframes voice-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        .voice-interim {
          font-weight: 400; color: #6b7280; font-style: italic;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;
        }

        /* ── Misc ── */
        .upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-2); padding: var(--sp-8) var(--sp-4); border: 2px dashed var(--border); border-radius: var(--radius); cursor: pointer; transition: border-color 0.15s, background 0.15s; text-align: center; background: var(--bg); }
        .upload-zone:hover { border-color: var(--primary); background: var(--primary-light); }
        .upload-icon  { font-size: 30px; line-height: 1; }
        .upload-text  { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .upload-hint  { font-size: 12px; color: var(--text-muted); }
        .img-preview-wrap { position: relative; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); background: var(--bg); }
        .img-preview { width: 100%; max-height: 260px; object-fit: cover; display: block; }
        .img-remove-btn { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .img-remove-btn:hover { background: rgba(0,0,0,0.8); }
        .location-input-row { display: flex; gap: var(--sp-2); align-items: center; }
        .location-input-row .form-input { flex: 1; min-width: 0; }
        .geo-btn { white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; }
        .geo-confirmed { color: var(--success); font-weight: 500; }
        .geo-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(37,99,235,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tips-list { list-style: none; display: flex; flex-direction: column; gap: var(--sp-3); padding: 0; }
        .tips-list li { font-size: 13px; color: var(--text-secondary); padding-left: var(--sp-5); position: relative; line-height: 1.5; }
        .tips-list li::before { content: '✓'; position: absolute; left: 0; color: var(--success); font-weight: 700; }
        .reporter-info { display: flex; align-items: center; gap: var(--sp-3); }
        .reporter-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .report-success { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 65vh; text-align: center; gap: var(--sp-4); }
        .success-icon { width: 72px; height: 72px; border-radius: 50%; background: var(--success-light); color: var(--success); font-size: 30px; display: flex; align-items: center; justify-content: center; font-weight: 700; border: 2px solid #bbf7d0; box-shadow: 0 0 0 8px rgba(22,163,74,0.08); }
        @media (max-width: 768px) { .report-layout { grid-template-columns: 1fr; } .report-sidebar { order: -1; } }
        @media (max-width: 480px) { .location-input-row { flex-direction: column; align-items: stretch; } .geo-btn { width: 100%; justify-content: center; } }
      `}</style>
    </div>
  );
}
