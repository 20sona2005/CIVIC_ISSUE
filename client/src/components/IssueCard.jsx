import { useNavigate } from 'react-router-dom';

// Maps status string to badge CSS class
const statusClass = {
  'Reported':    'badge-reported',
  'In Progress': 'badge-progress',
  'Resolved':    'badge-resolved',
};

// Short relative time (e.g. "2 days ago")
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function IssueCard({ issue }) {
  const navigate = useNavigate();

  return (
    <div
      className="card card-hover"
      onClick={() => navigate(`/issues/${issue._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/issues/${issue._id}`)}
      aria-label={`View issue: ${issue.title}`}
    >
      {/* Image */}
      {issue.image && (
        <div className="issue-card-img">
          <img
            src={`/uploads/${issue.image}`}
            alt={issue.title}
          />
        </div>
      )}

      <div className="card-body">
        {/* Top row: category tag + status badge */}
        <div className="issue-card-meta">
          <span className="tag">{issue.category}</span>
          <span className={`badge ${statusClass[issue.status] || 'badge-reported'}`}>
            {issue.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="issue-card-title">{issue.title}</h3>

        {/* Description preview */}
        <p className="issue-card-desc">{issue.description}</p>

        {/* Footer: location + time */}
        <div className="issue-card-footer">
          <span className="issue-card-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {issue.location}
          </span>
          <span className="issue-card-time">{timeAgo(issue.createdAt)}</span>
        </div>
      </div>

      <style>{`
        .issue-card-img {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: var(--bg);
        }
        .issue-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s;
        }
        .card-hover:hover .issue-card-img img {
          transform: scale(1.03);
        }
        .issue-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-3);
        }
        .issue-card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--sp-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .issue-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: var(--sp-4);
        }
        .issue-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: var(--sp-3);
          border-top: 1px solid var(--border);
        }
        .issue-card-location {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-muted);
          max-width: 65%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .issue-card-time {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
