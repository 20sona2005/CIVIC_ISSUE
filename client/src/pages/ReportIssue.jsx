import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
  });
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]     = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    // If user manually edits location, clear saved coords
    if (e.target.name === 'location') {
      setCoords({ lat: null, lng: null });
      setGeoError('');
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
        // Pre-fill location with readable coordinate string
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title || !form.description || !form.category || !form.location) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // Use FormData because we may have a file
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('location', form.location);
      formData.append('reportedBy', user.name);
      if (coords.lat !== null) formData.append('lat', coords.lat);
      if (coords.lng !== null) formData.append('lng', coords.lng);
      if (image) formData.append('image', image);

      await api.post('/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setTimeout(() => navigate('/explore'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="container">
      <div className="page-header">
        <h1>Report a Civic Issue</h1>
        <p>Help your community by reporting problems that need attention.</p>
      </div>

      <div className="report-layout">
        {/* ── Form ──────────────────────────────────────── */}
        <div className="report-form-col">
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
                      {geoLoading ? (
                        <span className="geo-spinner" />
                      ) : (
                        <>📍 Use Current Location</>
                      )}
                    </button>
                  </div>
                  {/* Coords confirmed */}
                  {coords.lat !== null && (
                    <span className="form-hint geo-confirmed">
                      ✓ GPS coordinates saved ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                    </span>
                  )}
                  {/* Geo error */}
                  {geoError && (
                    <span className="form-error">{geoError}</span>
                  )}
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
                    placeholder="Describe the issue in detail — how severe is it, how long has it been there, any safety concerns?"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    maxLength={1000}
                  />
                  <span className="form-hint">{form.description.length}/1000</span>
                </div>

                {/* Image Upload */}
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
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="upload-zone" htmlFor="image">
                      <div className="upload-icon">📷</div>
                      <span className="upload-text">Click to upload a photo</span>
                      <span className="upload-hint">JPG, PNG, WEBP up to 5MB</span>
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
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Tips Sidebar ───────────────────────────────── */}
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

        /* Image upload zone */
        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          padding: var(--sp-8) var(--sp-4);
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          text-align: center;
        }
        .upload-zone:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .upload-icon { font-size: 28px; }
        .upload-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .upload-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Image preview */
        .img-preview-wrap {
          position: relative;
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .img-preview {
          width: 100%;
          max-height: 240px;
          object-fit: cover;
          display: block;
        }
        .img-remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .img-remove-btn:hover { background: rgba(0,0,0,0.75); }

        /* Tips */
        .tips-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }
        .tips-list li {
          font-size: 13px;
          color: var(--text-secondary);
          padding-left: var(--sp-5);
          position: relative;
          line-height: 1.5;
        }
        .tips-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--success);
          font-weight: 600;
        }

        /* Reporter info */
        .reporter-info {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .reporter-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .report-layout {
            grid-template-columns: 1fr;
          }
          .report-sidebar {
            order: -1;
          }
        }

        /* Location row */
        .location-input-row {
          display: flex;
          gap: var(--sp-2);
          align-items: center;
        }
        .location-input-row .form-input {
          flex: 1;
          min-width: 0;
        }
        .geo-btn {
          white-space: nowrap;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .geo-confirmed {
          color: var(--success);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .geo-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(37,99,235,0.2);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Upload zone — improved */
        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          padding: var(--sp-8) var(--sp-4);
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: border-color var(--transition-fast), background var(--transition-fast);
          text-align: center;
          background: var(--bg);
        }
        .upload-zone:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .upload-zone:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .upload-icon { font-size: 30px; line-height: 1; }
        .upload-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .upload-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Image preview */
        .img-preview-wrap {
          position: relative;
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg);
        }
        .img-preview {
          width: 100%;
          max-height: 260px;
          object-fit: cover;
          display: block;
        }
        .img-remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background var(--transition-fast);
        }
        .img-remove-btn:hover { background: rgba(0,0,0,0.8); }

        /* Tips */
        .tips-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
          padding: 0;
        }
        .tips-list li {
          font-size: 13px;
          color: var(--text-secondary);
          padding-left: var(--sp-5);
          position: relative;
          line-height: 1.5;
        }
        .tips-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--success);
          font-weight: 700;
        }

        /* Reporter info */
        .reporter-info {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .reporter-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Success state */
        .report-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 65vh;
          text-align: center;
          gap: var(--sp-4);
          animation: authFadeIn 0.3s ease;
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .success-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--success-light);
          color: var(--success);
          font-size: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          border: 2px solid #bbf7d0;
          box-shadow: 0 0 0 8px rgba(22,163,74,0.08);
        }

        @media (max-width: 480px) {
          .location-input-row { flex-direction: column; align-items: stretch; }
          .geo-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
