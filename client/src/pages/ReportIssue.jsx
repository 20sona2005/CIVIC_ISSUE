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
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
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
        <style>{`
          .report-success {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            gap: var(--sp-4);
          }
          .success-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--success-light);
            color: var(--success);
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            border: 2px solid #bbf7d0;
          }
        `}</style>
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
                  <input
                    id="location"
                    name="location"
                    type="text"
                    className="form-input"
                    placeholder="e.g. MG Road, near HDFC Bank, Bengaluru"
                    value={form.location}
                    onChange={handleChange}
                  />
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
      `}</style>
    </div>
  );
}
