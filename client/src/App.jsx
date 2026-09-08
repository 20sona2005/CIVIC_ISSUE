import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import LoginRegister      from './pages/LoginRegister';
import Dashboard          from './pages/Dashboard';
import ReportIssue        from './pages/ReportIssue';
import ExploreIssues      from './pages/ExploreIssues';
import IssueDetail        from './pages/IssueDetail';
import AdminDashboard     from './pages/AdminDashboard';
import AdminLogin         from './pages/AdminLogin';
import NotificationsPage  from './pages/NotificationsPage';
import Navbar             from './components/Navbar';

// Protect routes that require login
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Protect routes that require admin role
// Unauthenticated → /admin/login, citizen → /, admin → render
function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user)    return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    // NotificationProvider must live inside AuthContext (already in main.jsx)
    // so it can read the user token on mount.
    <NotificationProvider>
      <div className="page-wrapper">
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login"       element={<LoginRegister />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected — citizens */}
          <Route path="/"              element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/report"        element={<PrivateRoute><ReportIssue /></PrivateRoute>} />
          <Route path="/explore"       element={<PrivateRoute><ExploreIssues /></PrivateRoute>} />
          <Route path="/issues/:id"    element={<PrivateRoute><IssueDetail /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </NotificationProvider>
  );
}
