import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginRegister from './pages/LoginRegister';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import ExploreIssues from './pages/ExploreIssues';
import IssueDetail from './pages/IssueDetail';
import Navbar from './components/Navbar';

// Protect routes that require login
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginRegister />} />

        {/* Protected */}
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/report" element={<PrivateRoute><ReportIssue /></PrivateRoute>} />
        <Route path="/explore" element={<PrivateRoute><ExploreIssues /></PrivateRoute>} />
        <Route path="/issues/:id" element={<PrivateRoute><IssueDetail /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
