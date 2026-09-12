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

      {/* ── Hero Section ────────────────────────────────── */}
      <div className="hero-banner">
        {/* Left: text + CTA */}
        <div className="hero-left">
          <div className="hero-greeting">
            Welcome back, <span className="hero-name">{user.name.split(' ')[0]}</span> 👋
          </div>
          <h1 className="hero-headline">
            Make your community<br />
            <span className="hero-highlight">better, together.</span>
          </h1>
          <p className="hero-sub">
            Report civic problems, track resolutions, and help your
            neighbourhood thrive. Every issue reported is a step toward a
            cleaner, safer city.
          </p>
          <div className="hero-cta-row">
            <button className="btn btn-primary btn-lg hero-cta-primary"
              onClick={() => navigate('/report')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Report an Issue
            </button>
            <button className="btn btn-outline btn-lg"
              onClick={() => navigate('/explore')}>
              Explore Issues
            </button>
          </div>

          {/* Quick trust stats */}
          <div className="hero-trust">
            <div className="hero-trust-item">
              <span className="hero-trust-val">{total}</span>
              <span className="hero-trust-label">Issues tracked</span>
            </div>
            <div className="hero-trust-divider" />
            <div className="hero-trust-item">
              <span className="hero-trust-val">{resolved}</span>
              <span className="hero-trust-label">Resolved</span>
            </div>
            <div className="hero-trust-divider" />
            <div className="hero-trust-item">
              <span className="hero-trust-val">
                {total > 0 ? Math.round((resolved / total) * 100) : 0}%
              </span>
              <span className="hero-trust-label">Resolution rate</span>
            </div>
          </div>
        </div>

        {/* Right: SVG city illustration */}
        <div className="hero-right" aria-hidden="true">
          <CityIllustration />
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="dash-stats">
        <StatCard label="Total Issues"   value={total}    color="blue"   />
        <StatCard label="Reported"        value={reported} color="yellow" />
        <StatCard label="In Progress"     value={inProg}   color="blue2"  />
        <StatCard label="Resolved"        value={resolved} color="green"  />
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
        /* ── Hero banner ────────────────────────────────────────────────── */
        .hero-banner {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: var(--sp-8);
          align-items: center;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
          border-radius: var(--radius-lg);
          padding: var(--sp-10) var(--sp-10);
          margin-bottom: var(--sp-8);
          position: relative;
          overflow: hidden;
        }
        /* decorative radial glow */
        .hero-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 10% 90%, rgba(255,255,255,0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Left side */
        .hero-left {
          position: relative;
          z-index: 1;
          color: #fff;
        }
        .hero-greeting {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.78);
          margin-bottom: var(--sp-2);
          letter-spacing: 0.01em;
        }
        .hero-name {
          color: #93c5fd;
          font-weight: 700;
        }
        .hero-headline {
          font-size: 36px;
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: -0.6px;
          color: #fff;
          margin-bottom: var(--sp-4);
        }
        .hero-highlight {
          color: #93c5fd;
        }
        .hero-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.72);
          line-height: 1.7;
          max-width: 440px;
          margin-bottom: var(--sp-6);
        }
        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          margin-bottom: var(--sp-6);
          flex-wrap: wrap;
        }
        .hero-cta-primary {
          background: #fff !important;
          color: var(--primary) !important;
          border-color: #fff !important;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          transition: transform 0.15s, box-shadow 0.15s !important;
        }
        .hero-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.22) !important;
          background: #f0f9ff !important;
        }
        .hero-banner .btn-outline {
          border-color: rgba(255,255,255,0.55) !important;
          color: #fff !important;
          background: rgba(255,255,255,0.08) !important;
          backdrop-filter: blur(4px);
          transition: background 0.15s, transform 0.15s !important;
        }
        .hero-banner .btn-outline:hover {
          background: rgba(255,255,255,0.18) !important;
          transform: translateY(-2px);
        }

        /* Trust strip */
        .hero-trust {
          display: flex;
          align-items: center;
          gap: var(--sp-5);
          padding-top: var(--sp-6);
          margin-top: var(--sp-2);
          border-top: 1px solid rgba(255,255,255,0.18);
        }
        .hero-trust-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hero-trust-val {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .hero-trust-label {
          font-size: 11px;
          color: rgba(255,255,255,0.62);
          font-weight: 500;
          white-space: nowrap;
        }
        .hero-trust-divider {
          width: 1px;
          height: 32px;
          background: rgba(255,255,255,0.22);
          flex-shrink: 0;
        }

        /* Right side illustration */
        .hero-right {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 260px;
        }
        .hero-right svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.25));
        }

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
          border-left: 4px solid transparent;
          transition: box-shadow var(--transition), transform var(--transition);
        }
        .stat-card:hover {
          box-shadow: var(--shadow);
          transform: translateY(-2px);
        }
        .stat-card-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-card-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .stat-blue   { border-left-color: var(--primary); }
        .stat-blue   .stat-card-value { color: var(--primary); }
        .stat-yellow { border-left-color: var(--warning); }
        .stat-yellow .stat-card-value { color: var(--warning); }
        .stat-blue2  { border-left-color: #0891b2; }
        .stat-blue2  .stat-card-value { color: #0891b2; }
        .stat-green  { border-left-color: var(--success); }
        .stat-green  .stat-card-value { color: var(--success); }

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
          transition: box-shadow var(--transition), border-color var(--transition), transform var(--transition);
          text-align: center;
        }
        .cat-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
          transform: translateY(-3px);
          text-decoration: none;
        }
        .cat-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-sm);
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .cat-card:hover .cat-icon {
          background: var(--primary);
          color: #fff;
        }
        .cat-name  { font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .cat-count { font-size: 11px; color: var(--text-muted); }

        /* Section header */
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-5);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .hero-banner { grid-template-columns: 1fr; padding: var(--sp-8) var(--sp-6); }
          .hero-right  { display: none; }
          .hero-headline { font-size: 28px; }
          .dash-stats { grid-template-columns: repeat(2, 1fr); }
          .cat-grid   { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .hero-banner  { padding: var(--sp-6) var(--sp-5); border-radius: var(--radius); }
          .hero-headline{ font-size: 24px; }
          .hero-sub     { font-size: 13px; }
          .hero-trust   { gap: var(--sp-3); }
          .hero-trust-val { font-size: 18px; }
          .dash-stats   { grid-template-columns: repeat(2, 1fr); }
          .cat-grid     { grid-template-columns: repeat(2, 1fr); }
          .hero-cta-row { flex-direction: column; align-items: stretch; }
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

// ── Inline SVG city illustration ─────────────────────────────────────────────
// Pure SVG — no external asset needed. Draws a stylised city skyline with
// a location pin, road markings, and subtle animated pulse on the pin.
function CityIllustration() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="City illustration">

      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1e40af" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Ground */}
      <rect x="0" y="210" width="380" height="50" rx="4"
        fill="rgba(255,255,255,0.08)" />

      {/* Road */}
      <rect x="120" y="210" width="140" height="50"
        fill="rgba(255,255,255,0.06)" />
      {/* Road centre dashes */}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x="188" y={218 + i * 10} width="4" height="6" rx="2"
          fill="rgba(255,255,255,0.3)" />
      ))}

      {/* Building 1 — far left, short wide */}
      <rect x="10" y="150" width="55" height="65" rx="3"
        fill="rgba(255,255,255,0.10)" />
      <rect x="10" y="143" width="55" height="12" rx="3"
        fill="rgba(255,255,255,0.15)" />
      {/* windows */}
      {[0,1,2].map(col => [0,1,2,3].map(row => (
        <rect key={`b1-${col}-${row}`}
          x={18 + col * 16} y={156 + row * 14}
          width="8" height="8" rx="1"
          fill={row === 1 && col === 1 ? 'rgba(250,204,21,0.7)' : 'rgba(255,255,255,0.18)'}
        />
      )))}

      {/* Building 2 — left-centre, tallest */}
      <rect x="75" y="100" width="60" height="115" rx="3"
        fill="rgba(255,255,255,0.13)" />
      <rect x="75" y="90" width="60" height="15" rx="3"
        fill="rgba(255,255,255,0.18)" />
      {/* antenna */}
      <line x1="105" y1="90" x2="105" y2="74"
        stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="105" cy="72" r="3" fill="rgba(250,204,21,0.8)" />
      {/* windows */}
      {[0,1,2].map(col => [0,1,2,3,4,5].map(row => (
        <rect key={`b2-${col}-${row}`}
          x={83 + col * 18} y={104 + row * 17}
          width="10" height="10" rx="1.5"
          fill={
            (col === 0 && row === 2) || (col === 2 && row === 4)
              ? 'rgba(250,204,21,0.7)'
              : 'rgba(255,255,255,0.18)'
          }
        />
      )))}

      {/* Building 3 — centre, medium with arch top */}
      <rect x="148" y="120" width="50" height="95" rx="3"
        fill="rgba(255,255,255,0.10)" />
      <path d="M148 125 Q173 108 198 125" fill="rgba(255,255,255,0.15)" />
      {[0,1].map(col => [0,1,2,3,4].map(row => (
        <rect key={`b3-${col}-${row}`}
          x={156 + col * 22} y={128 + row * 17}
          width="11" height="11" rx="1.5"
          fill={col === 1 && row === 3 ? 'rgba(250,204,21,0.7)' : 'rgba(255,255,255,0.18)'}
        />
      )))}

      {/* Building 4 — right-centre, stepped */}
      <rect x="212" y="130" width="65" height="85" rx="3"
        fill="rgba(255,255,255,0.12)" />
      <rect x="222" y="115" width="45" height="20" rx="3"
        fill="rgba(255,255,255,0.15)" />
      <rect x="232" y="105" width="25" height="15" rx="3"
        fill="rgba(255,255,255,0.18)" />
      {[0,1,2].map(col => [0,1,2,3].map(row => (
        <rect key={`b4-${col}-${row}`}
          x={220 + col * 19} y={138 + row * 17}
          width="11" height="11" rx="1.5"
          fill={col === 1 && row === 0 ? 'rgba(250,204,21,0.7)' : 'rgba(255,255,255,0.18)'}
        />
      )))}

      {/* Building 5 — far right */}
      <rect x="292" y="155" width="75" height="60" rx="3"
        fill="rgba(255,255,255,0.09)" />
      <rect x="292" y="148" width="75" height="12" rx="3"
        fill="rgba(255,255,255,0.14)" />
      {[0,1,2,3].map(col => [0,1,2].map(row => (
        <rect key={`b5-${col}-${row}`}
          x={300 + col * 17} y={162 + row * 16}
          width="9" height="10" rx="1"
          fill={col === 2 && row === 1 ? 'rgba(250,204,21,0.7)' : 'rgba(255,255,255,0.15)'}
        />
      )))}

      {/* Trees */}
      {[42, 68, 310, 358].map((x, i) => (
        <g key={`tree-${i}`}>
          <rect x={x - 2} y="200" width="4" height="14" rx="2"
            fill="rgba(255,255,255,0.25)" />
          <ellipse cx={x} cy="198" rx="10" ry="12"
            fill="rgba(74,222,128,0.30)" />
        </g>
      ))}

      {/* Location pin — centred over building 3 */}
      <g filter="url(#glow)">
        {/* Pulse ring */}
        <circle cx="173" cy="88" r="18" fill="rgba(250,204,21,0.12)">
          <animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        {/* Pin body */}
        <path d="M173 68 C165 68 158 75 158 84 C158 96 173 108 173 108 C173 108 188 96 188 84 C188 75 181 68 173 68Z"
          fill="#fbbf24" />
        {/* Pin inner dot */}
        <circle cx="173" cy="84" r="5" fill="rgba(255,255,255,0.9)" />
      </g>

      {/* Floating badge */}
      <g transform="translate(200, 58)">
        <rect width="72" height="24" rx="12" fill="rgba(255,255,255,0.95)" />
        <text x="36" y="16" textAnchor="middle"
          fontSize="10" fontWeight="700" fill="#1e3a8a"
          fontFamily="Inter, system-ui, sans-serif">
          📍 Civic Issue
        </text>
      </g>

      {/* Small floating status chips */}
      <g transform="translate(28, 72)">
        <rect width="64" height="20" rx="10" fill="rgba(22,163,74,0.85)" />
        <text x="32" y="14" textAnchor="middle"
          fontSize="9" fontWeight="700" fill="#fff"
          fontFamily="Inter, system-ui, sans-serif">
          ✓ Resolved
        </text>
      </g>
      <g transform="translate(294, 110)">
        <rect width="70" height="20" rx="10" fill="rgba(217,119,6,0.85)" />
        <text x="35" y="14" textAnchor="middle"
          fontSize="9" fontWeight="700" fill="#fff"
          fontFamily="Inter, system-ui, sans-serif">
          🔄 In Progress
        </text>
      </g>
    </svg>
  );
}
