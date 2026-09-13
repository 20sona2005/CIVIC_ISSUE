import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('ta') ? 'ta' : 'en';

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate(isAdmin ? '/admin/login' : '/login');
  };

  if (!user) return null;

  const citizenLinks = [
    { to: '/',        label: t('nav.dashboard'), end: true },
    { to: '/explore', label: t('nav.explore')             },
    { to: '/report',  label: t('nav.reportIssue')        },
  ];

  const adminLinks = [
    { to: '/admin', label: t('nav.adminDashboard'), end: true },
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
            {isAdmin ? t('nav.admin') : t('nav.citizen')}
          </span>

          {/* User name */}
          <span className="nav-user">{user.name}</span>

          {/* Notification bell */}
          <NotificationBell />

          {/* Language switcher */}
          <div className="nav-lang-switcher" aria-label={t('nav.language')}>
            <button
              className={`lang-btn ${currentLang === 'en' ? 'lang-btn--active' : ''}`}
              onClick={() => switchLanguage('en')}
              title="English"
            >
              EN
            </button>
            <span className="lang-sep">|</span>
            <button
              className={`lang-btn ${currentLang === 'ta' ? 'lang-btn--active' : ''}`}
              onClick={() => switchLanguage('ta')}
              title="தமிழ்"
            >
              தமிழ்
            </button>
          </div>

          {/* Logout */}
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
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
                {isAdmin ? t('nav.admin') : t('nav.citizen')}
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
            <NavLink
              to="/notifications"
              className={({ isActive }) => 'nav-mobile-link' + (isActive ? ' active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.notifications')}
            </NavLink>
          </div>

          {/* Mobile language switcher */}
          <div className="nav-mobile-lang">
            <span className="nav-mobile-lang-label">{t('nav.language')}:</span>
            <button
              className={`lang-btn ${currentLang === 'en' ? 'lang-btn--active' : ''}`}
              onClick={() => switchLanguage('en')}
            >
              EN
            </button>
            <span className="lang-sep">|</span>
            <button
              className={`lang-btn ${currentLang === 'ta' ? 'lang-btn--active' : ''}`}
              onClick={() => switchLanguage('ta')}
            >
              தமிழ்
            </button>
          </div>

          <button
            className="btn btn-outline btn-full"
            style={{ marginTop: 'var(--sp-4)' }}
            onClick={handleLogout}
          >
            {t('nav.logout')}
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

        /* ── Language switcher ── */
        .nav-lang-switcher {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 3px 8px;
          flex-shrink: 0;
        }
        .lang-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          font-family: var(--font);
          color: var(--text-muted);
          padding: 2px 5px;
          border-radius: 999px;
          transition: color 0.15s, background 0.15s;
          white-space: nowrap;
          line-height: 1.4;
        }
        .lang-btn:hover { color: var(--primary); }
        .lang-btn--active {
          color: var(--primary);
          background: var(--primary-light);
        }
        .lang-sep {
          font-size: 11px;
          color: var(--border);
          user-select: none;
          line-height: 1;
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

        /* Mobile language switcher */
        .nav-mobile-lang {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-3) var(--sp-3);
          border-top: 1px solid var(--border);
          margin-top: var(--sp-3);
        }
        .nav-mobile-lang-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
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
