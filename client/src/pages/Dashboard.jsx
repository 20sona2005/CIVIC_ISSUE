import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import IssueCard from '../components/IssueCard';

const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Water Leakage', 'Other'];

// Category SVG icons — professional, consistent stroke style
const CATEGORY_ICONS = {
  Pothole: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="17" rx="8" ry="3"/>
      <path d="M8 17V9a4 4 0 0 1 8 0v8"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  ),
  Garbage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  Streetlight: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="22" x2="12" y2="11"/>
      <path d="M12 11 Q12 4 18 4"/>
      <circle cx="18" cy="4" r="2"/>
      <line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  ),
  Drainage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 8 4 12 4 14a8 8 0 0 0 16 0c0-2-2-6-8-12z"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
      <line x1="9" y1="16" x2="15" y2="16"/>
    </svg>
  ),
  'Water Leakage': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6 8 4 12 4 14a8 8 0 0 0 16 0c0-2-2-6-8-12z"/>
      <path d="M8 18 Q10 21 12 18 Q14 15 16 18"/>
    </svg>
  ),
  Other: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const { data } = await api.get('/issues');
        setIssues(data);
      } catch {
        setError('Failed to load issues');
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  // Stats derived from issues
  const total    = issues.length;
  const reported = issues.filter((i) => i.status === 'Reported').length;
  const inProg   = issues.filter((i) => i.status === 'In Progress').length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;

  // My recent issues (by name match — simple for V1)
  const myIssues = issues.filter((i) => i.reportedBy === user.name).slice(0, 3);

  // Recent issues (latest 6)
  const recentIssues = issues.slice(0, 6);

  // Category counts
  const categoryCounts = CATEGORIES.map((cat) => ({
    name: cat,
    count: issues.filter((i) => i.category === cat).length,
    icon: CATEGORY_ICONS[cat],
  }));

  return (
    <div className="container">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>Here's an overview of civic issues in your community.</p>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="dash-stats">
        <StatCard label="Total Issues"   value={total}    color="blue"   />
        <StatCard label="Reported"        value={reported} color="yellow" />
        <StatCard label="In Progress"     value={inProg}   color="blue2"  />
        <StatCard label="Resolved"        value={resolved} color="green"  />
      </div>

      {/* ── Quick Actions ───────────────────────────────── */}
      <div className="dash-actions">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/report')}>
          + Report an Issue
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => navigate('/explore')}>
          Explore All Issues
        </button>
      </div>

      {/* ── Categories ──────────────────────────────────── */}
      <section className="section">
        <h2 style={{ marginBottom: 'var(--sp-5)' }}>Browse by Category</h2>
        <div className="cat-grid">
          {categoryCounts.map((cat) => (
          <Link
              key={cat.name}
              to={`/explore?category=${cat.name}`}
              className="cat-card"
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-name">{cat.name}</span>
              <span className="cat-count">{cat.count} issue{cat.count !== 1 ? 's' : ''}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── My Recent Reports ───────────────────────────── */}
      {myIssues.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>My Recent Reports</h2>
            <Link to="/explore" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className="grid-3">
            {myIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        </section>
      )}

      {/* ── Community Issues ────────────────────────────── */}
      <section className="section">
        <div className="section-head">
          <h2>Recent Community Issues</h2>
          <Link to="/explore" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {loading && (
          <div className="spinner-wrap"><div className="spinner" /></div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {!loading && !error && recentIssues.length === 0 && (
          <div className="empty-state">
            <h3>No issues reported yet</h3>
            <p>Be the first to report a civic issue in your area.</p>
            <button className="btn btn-primary" onClick={() => navigate('/report')}>
              Report an Issue
            </button>
          </div>
        )}
        {!loading && recentIssues.length > 0 && (
          <div className="grid-3">
            {recentIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        /* Stats */
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--sp-4);
          margin-bottom: var(--sp-6);
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

        /* Quick actions */
        .dash-actions {
          display: flex;
          gap: var(--sp-4);
          margin-bottom: var(--sp-8);
        }

        /* Category grid */
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: var(--sp-3);
        }
        .cat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-5) var(--sp-3);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          text-decoration: none;
          transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
          text-align: center;
        }
        .cat-card:hover {
          box-shadow: var(--shadow);
          border-color: var(--primary);
          transform: translateY(-2px);
          text-decoration: none;
        }
        .cat-icon  {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .cat-card:hover .cat-icon {
          background: var(--primary);
          color: #fff;
        }
        .cat-name  { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .cat-count { font-size: 12px; color: var(--text-muted); }

        /* Section header with link */
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-5);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr); }
          .cat-grid   { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .dash-stats  { grid-template-columns: repeat(2, 1fr); }
          .cat-grid    { grid-template-columns: repeat(2, 1fr); }
          .dash-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

// Small reusable stat card
function StatCard({ label, value, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
