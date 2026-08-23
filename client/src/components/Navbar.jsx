import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate(isAdmin ? '/admin/login' : '/login');
  };

  if (!user) return null;

  const citizenLinks = [
    { to: '/',        label: 'Dashboard', end: true },
    { to: '/explore', label: 'Explore'             },
    { to: '/report',  label: 'Report Issue'        },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Dashboard', end: true },
  ];

  const links = isAdmin ? adminLinks : citizenLinks;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <NavLink
          to={isAdmin ? '/admin' : '/'}
          className="navbar-brand"
          onClick={() => setMenuOpen(false)}
        >
          Civic<span>Pulse</span>
        </NavLink>

        {/* Desktop links */}
        <div className="navbar-links">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {label}
            </NavLink>
          ))}

          <div className="nav-divider" />

          {/* Role pill */}
          <span className={`nav-role-pill ${isAdmin ? 'nav-role-admin' : 'nav-role-citizen'}`}>
            {isAdmin ? 'Admin' : 'Citizen'}
          </span>

          {/* User name */}
          <span className="nav-user">{user.name}</span>

          {/* Logout */}
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? (
            /* X icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            /* Hamburger icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="nav-mobile-drawer">
          <div className="nav-mobile-user">
            <div className="nav-mobile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="nav-mobile-name">{user.name}</div>
              <span className={`nav-role-pill ${isAdmin ? 'nav-role-admin' : 'nav-role-citizen'}`}>
                {isAdmin ? 'Admin' : 'Citizen'}
              </span>
            </div>
          </div>

          <div className="nav-mobile-links">
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => 'nav-mobile-link' + (isActive ? ' active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>

          <button
            className="btn btn-outline btn-full"
            style={{ marginTop: 'var(--sp-4)' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}

      <style>{`
        /* ── Desktop divider ── */
        .nav-divider {
          width: 1px;
          height: 20px;
          background: var(--border);
          margin: 0 var(--sp-2);
          flex-shrink: 0;
        }

        /* ── Role pill ── */
        .nav-role-pill {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .nav-role-citizen {
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--primary-mid);
        }
        .nav-role-admin {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        /* ── User name ── */
        .nav-user {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 0 var(--sp-1);
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Hamburger (hidden on desktop) ── */
        .nav-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: var(--sp-2);
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .nav-hamburger:hover {
          background: var(--bg);
          color: var(--text-primary);
        }

        /* ── Mobile drawer ── */
        .nav-mobile-drawer {
          display: none;
          padding: var(--sp-4) var(--sp-4) var(--sp-5);
          border-top: 1px solid var(--border);
          background: var(--surface);
          animation: slideDown 0.18s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nav-mobile-user {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          padding-bottom: var(--sp-4);
          border-bottom: 1px solid var(--border);
          margin-bottom: var(--sp-3);
        }
        .nav-mobile-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nav-mobile-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 3px;
        }

        .nav-mobile-links {
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
        }
        .nav-mobile-link {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 10px var(--sp-3);
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .nav-mobile-link:hover {
          background: var(--bg);
          color: var(--text-primary);
          text-decoration: none;
        }
        .nav-mobile-link.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 600;
        }

        /* ── Responsive ── */
        @media (max-width: 680px) {
          .navbar-links    { display: none; }
          .nav-hamburger   { display: flex; }
          .nav-mobile-drawer { display: block; }
        }
      `}</style>
    </nav>
  );
}
