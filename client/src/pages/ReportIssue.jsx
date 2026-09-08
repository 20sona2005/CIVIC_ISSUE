import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { UPLOADS_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];

// ── Confidence badge colour ───────────────────────────────────────────────────
function confidenceLabel(score) {
  if (score >= 0.80) return { label: 'Very High Match', color: '#dc2626', bg: '#fef2f2' };
  if (score >= 0.65) return { label: 'High Match',      color: '#d97706', bg: '#fffbeb' };
  return               { label: 'Possible Match',      color: '#2563eb', bg: '#eff6ff' };
}

// ── Single duplicate card shown inside the warning panel ─────────────────────
function DuplicateCard({ dup, onSupport, onView, supporting, alreadySupported }) {
  const conf    = confidenceLabel(dup.confidence);
  const issue   = dup.issue;
  const pct     = Math.round(dup.confidence * 100);

  return (
    <div style={{
      border: `1px solid ${conf.color}40`,
      borderRadius: 10,
      padding: '14px 16px',
      background: '#fff',
      marginBottom: 12,
    }}>
      {/* Top row: confidence pill + support count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          background: conf.bg,
          color: conf.color,
          border: `1px solid ${conf.color}60`,
          borderRadius: 20,
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {conf.label} — {pct}%
        </span>
        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>👥</span>
          <span>{(issue.supportCount || 0) + 1} citizen{(issue.supportCount || 0) !== 0 ? 's' : ''} reported</span>
        </span>
      </div>

      {/* Issue info */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px', color: '#111827' }}>
          {issue.title}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>
          📍 {issue.location}
        </p>
        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {issue.description}
        </p>
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <ScoreChip label="Category"    value={dup.scores.category} />
        <ScoreChip label="Location"    value={dup.scores.location} />
        <ScoreChip label="Description" value={dup.scores.description} />
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: issue.status === 'Resolved' ? '#f0fdf4' : issue.status === 'In Progress' ? '#fffbeb' : '#eff6ff',
          color:      issue.status === 'Resolved' ? '#16a34a' : issue.status === 'In Progress' ? '#d97706' : '#2563eb',
          border:     `1px solid ${issue.status === 'Resolved' ? '#86efac' : issue.status === 'In Progress' ? '#fcd34d' : '#93c5fd'}`,
        }}>
          {issue.status}
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => onView(issue._id)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db',
              background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500,
              color: '#374151',
            }}
          >
            View Issue
          </button>

          <button
            type="button"
            onClick={() => onSupport(issue._id)}
            disabled={supporting === issue._id || alreadySupported.has(issue._id)}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: alreadySupported.has(issue._id) ? '#d1fae5' : '#2563eb',
              color: alreadySupported.has(issue._id) ? '#065f46' : '#fff',
              fontSize: 13, cursor: alreadySupported.has(issue._id) || supporting === issue._id ? 'not-allowed' : 'pointer',
              fontWeight: 600, opacity: supporting === issue._id ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {alreadySupported.has(issue._id)
              ? '✓ Supported'
              : supporting === issue._id
              ? 'Supporting…'
              : '👍 Support This Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreChip({ label, value }) {
  const pct   = Math.round(value * 100);
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#6b7280';
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      background: '#f3f4f6', color, fontWeight: 600,
      border: '1px solid #e5e7eb',
    }}>
      {label}: {pct}%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
  });
  const [coords, setCoords]       = useState({ lat: null, lng: null });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]   = useState('');
  const [image, setImage]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  // ── Duplicate detection state ──────────────────────────────────────────────
  const [checkingDupes, setCheckingDupes]     = useState(false);
  const [duplicates, setDuplicates]           = useState([]);       // [{issue, scores, confidence}]
  const [showDupeWarning, setShowDupeWarning] = useState(false);
  const [supporting, setSupporting]           = useState(null);     // id being supported
  const [alreadySupported, setAlreadySupported] = useState(new Set());
  const [forceSubmit, setForceSubmit]         = useState(false);    // user chose "submit anyway"

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    if (e.target.name === 'location') {
      setCoords({ lat: null, lng: null });
      setGeoError('');
    }
    // Reset duplicate warning if user meaningfully changes the form
    if (showDupeWarning) {
      setShowDupeWarning(false);
      setDuplicates([]);
      setForceSubmit(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setForm(f => ({
          ...f,
          location: f.location.trim() || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please enter your location manually.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Please enter your location manually.');
            break;
          case err.TIMEOUT:
            setGeoError('Location request timed out. Please try again or enter manually.');
            break;
          default:
            setGeoError('Could not get location. Please enter manually.');
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

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  // ── Support an existing issue ──────────────────────────────────────────────
  const handleSupport = async (issueId) => {
    setSupporting(issueId);
    try {
      await api.post(`/issues/${issueId}/support`, { userId: user.name });
      setAlreadySupported(prev => new Set([...prev, issueId]));
      // Update supportCount in the local duplicates list
      setDuplicates(prev =>
        prev.map(d =>
          d.issue._id === issueId
            ? { ...d, issue: { ...d.issue, supportCount: (d.issue.supportCount || 0) + 1 } }
            : d
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to support issue';
      // If already supported (from a previous session), silently mark as supported
      if (msg.toLowerCase().includes('already')) {
        setAlreadySupported(prev => new Set([...prev, issueId]));
      }
    } finally {
      setSupporting(null);
    }
  };

  // ── View existing issue in a new tab ───────────────────────────────────────
  const handleView = (issueId) => {
    window.open(`/issues/${issueId}`, '_blank');
  };

  // ── Final submission (creates new issue) ──────────────────────────────────
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

      // If submitting despite a duplicate warning, attach the reference
      if (topDuplicate) {
        formData.append('duplicateOf',         topDuplicate.issue._id);
        formData.append('duplicateConfidence', topDuplicate.confidence);
      }

      await api.post('/issues', formData);
      setSuccess(true);
      setTimeout(() => navigate('/explore'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  // ── Main submit handler ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title || !form.description || !form.category || !form.location) {
      setError('Please fill in all required fields.');
      return;
    }

    // If user already clicked "Submit Anyway" skip the check
    if (forceSubmit) {
      await submitIssue(duplicates[0] || null);
      return;
    }

    // ── Step 1: Check for duplicates ──────────────────────────────────────
    setCheckingDupes(true);
    try {
      const params = {
        title:       form.title,
        description: form.description,
        category:    form.category,
        location:    form.location,
      };
      if (coords.lat !== null) params.lat = coords.lat;
      if (coords.lng !== null) params.lng = coords.lng;

      const { data } = await api.get('/issues/check-duplicate', { params });

      if (data.hasDuplicates) {
        setDuplicates(data.duplicates);
        setShowDupeWarning(true);
        setCheckingDupes(false);
        return; // stop — show warning, do not submit yet
      }
    } catch {
      // If duplicate check fails (network etc.), proceed with submission silently
    } finally {
      setCheckingDupes(false);
    }

    // ── Step 2: No duplicates — submit directly ────────────────────────────
    await submitIssue(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Success screen
  // ─────────────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="container">
        <div className="report-success">
          <div className="success-icon">✓</div>
          <h2>Issue Reported!</h2>
          <p>Your civic issue has been submitted successfully. Redirecting…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="page-header">
        <h1>Report a Civic Issue</h1>
        <p>Help your community by reporting problems that need attention.</p>
      </div>

      <div className="report-layout">
        {/* ── Form column ─────────────────────────────────────────────────── */}
        <div className="report-form-col">

          {/* ── Duplicate Warning Panel ─────────────────────────────────── */}
          {showDupeWarning && duplicates.length > 0 && (
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fcd34d',
              borderRadius: 12,
              padding: '18px 20px',
              marginBottom: 20,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                    Similar issue{duplicates.length > 1 ? 's' : ''} already reported nearby
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                    We found {duplicates.length} potentially similar issue{duplicates.length > 1 ? 's' : ''}.
                    Consider supporting an existing report instead of creating a duplicate.
                  </p>
                </div>
              </div>

              {/* Duplicate cards */}
              {duplicates.map((dup) => (
                <DuplicateCard
                  key={dup.issue._id}
                  dup={dup}
                  onSupport={handleSupport}
                  onView={handleView}
                  supporting={supporting}
                  alreadySupported={alreadySupported}
                />
              ))}

              {/* Actions */}
              <div style={{
                borderTop: '1px solid #fcd34d',
                paddingTop: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#78350f', fontWeight: 500 }}>
                  Is your issue genuinely different from the ones above?
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForceSubmit(true);
                      setShowDupeWarning(false);
                      // Trigger submit immediately
                      submitIssue(duplicates[0]);
                    }}
                    disabled={loading}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: '1.5px solid #d97706',
                      background: '#fff', color: '#92400e', fontWeight: 600,
                      fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {loading ? 'Submitting…' : 'Submit Anyway — It\'s Different'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDupeWarning(false);
                      setDuplicates([]);
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db',
                      background: '#fff', color: '#374151', fontWeight: 500,
                      fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    ← Edit My Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Issue form card ─────────────────────────────────────────── */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="title">
                    Issue Title <span className="req">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Large pothole on MG Road near bus stop"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={120}
                  />
                  <span className="form-hint">{form.title.length}/120</span>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="category">
                    Category <span className="req">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="form-select"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label" htmlFor="location">
                    Location <span className="req">*</span>
                  </label>
                  <div className="location-input-row">
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className="form-input"
                      placeholder="e.g. MG Road, near HDFC Bank, Bengaluru"
                      value={form.location}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm geo-btn"
                      onClick={useCurrentLocation}
                      disabled={geoLoading}
                      title="Use your current GPS location"
                    >
                      {geoLoading ? <span className="geo-spinner" /> : <>📍 Use Current Location</>}
                    </button>
                  </div>
                  {coords.lat !== null && (
                    <span className="form-hint geo-confirmed">
                      ✓ GPS coordinates saved ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                    </span>
                  )}
                  {geoError && <span className="form-error">{geoError}</span>}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Description <span className="req">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-textarea"
                    placeholder="Describe the issue in detail — how severe, how long has it been there, any safety concerns?"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    maxLength={1000}
                  />
                  <span className="form-hint">{form.description.length}/1000</span>
                </div>

                {/* Image upload */}
                <div className="form-group">
                  <label className="form-label">Photo (optional)</label>
                  {preview ? (
                    <div className="img-preview-wrap">
                      <img src={preview} alt="Preview" className="img-preview" />
                      <button
                        type="button"
                        className="img-remove-btn"
                        onClick={removeImage}
                        aria-label="Remove image"
                      >✕</button>
                    </div>
                  ) : (
                    <label className="upload-zone" htmlFor="image">
                      <div className="upload-icon">📷</div>
                      <span className="upload-text">Click to upload a photo</span>
                      <span className="upload-hint">JPG, PNG, WEBP up to 5 MB</span>
                      <input
                        id="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImage}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading || checkingDupes}
                >
                  {checkingDupes
                    ? 'Checking for duplicates…'
                    : loading
                    ? 'Submitting…'
                    : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Tips sidebar ────────────────────────────────────────────────── */}
        <div className="report-sidebar">
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>Tips for a good report</h3>
              <ul className="tips-list">
                <li>Use a clear, specific title that describes the issue</li>
                <li>Add the exact location so authorities can find it easily</li>
                <li>Describe the severity and any safety hazards</li>
                <li>Attach a photo if possible — it speeds up resolution</li>
                <li>Mention how long the issue has existed</li>
                <li>Support existing reports instead of filing duplicates</li>
              </ul>
            </div>
          </div>

          <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>Reporting as</h3>
              <div className="reporter-info">
                <div className="reporter-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── How duplicate detection works ─────────────────────────── */}
          <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 14 }}>🔍 Duplicate Detection</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.6 }}>
                Before submitting, we automatically check for similar issues already reported.
              </p>
              <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                <li>Same category</li>
                <li>Within 100 m radius</li>
                <li>Similar description</li>
              </ul>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                Supporting existing issues increases their priority for resolution.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .report-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--sp-6);
          padding-bottom: var(--sp-12);
        }
        .req { color: var(--danger); margin-left: 2px; }

        /* Upload zone */
        .upload-zone {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: var(--sp-2);
          padding: var(--sp-8) var(--sp-4);
          border: 2px dashed var(--border); border-radius: var(--radius);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          text-align: center; background: var(--bg);
        }
        .upload-zone:hover { border-color: var(--primary); background: var(--primary-light); }
        .upload-zone:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .upload-icon  { font-size: 30px; line-height: 1; }
        .upload-text  { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .upload-hint  { font-size: 12px; color: var(--text-muted); }

        /* Image preview */
        .img-preview-wrap {
          position: relative; border-radius: var(--radius);
          overflow: hidden; border: 1px solid var(--border); background: var(--bg);
        }
        .img-preview { width: 100%; max-height: 260px; object-fit: cover; display: block; }
        .img-remove-btn {
          position: absolute; top: 8px; right: 8px;
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(0,0,0,0.6); color: #fff; border: none;
          cursor: pointer; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .img-remove-btn:hover { background: rgba(0,0,0,0.8); }

        /* Location row */
        .location-input-row {
          display: flex; gap: var(--sp-2); align-items: center;
        }
        .location-input-row .form-input { flex: 1; min-width: 0; }
        .geo-btn {
          white-space: nowrap; flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .geo-confirmed { color: var(--success); font-weight: 500; }
        .geo-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(37,99,235,0.2); border-top-color: var(--primary);
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }

        /* Tips */
        .tips-list {
          list-style: none; display: flex; flex-direction: column;
          gap: var(--sp-3); padding: 0;
        }
        .tips-list li {
          font-size: 13px; color: var(--text-secondary);
          padding-left: var(--sp-5); position: relative; line-height: 1.5;
        }
        .tips-list li::before {
          content: '✓'; position: absolute; left: 0;
          color: var(--success); font-weight: 700;
        }

        /* Reporter info */
        .reporter-info { display: flex; align-items: center; gap: var(--sp-3); }
        .reporter-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--primary); color: #fff;
          font-size: 16px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* Success */
        .report-success {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 65vh;
          text-align: center; gap: var(--sp-4);
        }
        .success-icon {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--success-light); color: var(--success);
          font-size: 30px; display: flex; align-items: center;
          justify-content: center; font-weight: 700;
          border: 2px solid #bbf7d0;
          box-shadow: 0 0 0 8px rgba(22,163,74,0.08);
        }

        @media (max-width: 768px) {
          .report-layout { grid-template-columns: 1fr; }
          .report-sidebar { order: -1; }
        }
        @media (max-width: 480px) {
          .location-input-row { flex-direction: column; align-items: stretch; }
          .geo-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
