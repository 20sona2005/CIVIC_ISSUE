import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't show navbar on login page
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <NavLink to="/" className="navbar-brand">
          Civic<span>Pulse</span>
        </NavLink>

        {/* Navigation Links */}
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/explore"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Explore Issues
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            Report Issue
          </NavLink>

          <div className="divider-v" />

          {/* User info + logout */}
          <span className="nav-user">
            {user.name}
          </span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <style>{`
        .divider-v {
          width: 1px;
          height: 20px;
          background: var(--border);
          margin: 0 var(--sp-2);
        }
        .nav-user {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 0 var(--sp-2);
        }
        @media (max-width: 600px) {
          .nav-user { display: none; }
          .navbar-links { gap: 4px; }
        }
      `}</style>
    </nav>
  );
}
