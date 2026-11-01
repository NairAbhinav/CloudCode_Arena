import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ProblemList from './pages/student/ProblemList';
import ProblemDetail from './pages/student/ProblemDetail';
import AssessmentList from './pages/student/AssessmentList';
import AssessmentDetail from './pages/student/AssessmentDetail';
import ActiveExamRoom from './pages/student/ActiveExamRoom';
import SubmissionHistory from './pages/student/SubmissionHistory';
import Leaderboard from './pages/student/Leaderboard';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import QuestionBank from './pages/faculty/QuestionBank';
import QuestionEditor from './pages/faculty/QuestionEditor';
import AssessmentManager from './pages/faculty/AssessmentManager';
import AssessmentEditor from './pages/faculty/AssessmentEditor';
import AssessmentMonitor from './pages/faculty/AssessmentMonitor';
import FlaggedReviews from './pages/faculty/FlaggedReviews';
import FacultyAnalytics from './pages/faculty/FacultyAnalytics';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import SystemHealth from './pages/admin/SystemHealth';

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0b0f19] flex flex-col selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Root & Auth Routes */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Student Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/problems" element={<ProblemList />} />
                <Route path="/student/problems/:id" element={<ProblemDetail />} />
                <Route path="/student/assessments" element={<AssessmentList />} />
                <Route path="/student/assessments/:id" element={<AssessmentDetail />} />
                <Route path="/student/assessments/:id/room" element={<ActiveExamRoom />} />
                <Route path="/student/history" element={<SubmissionHistory />} />
                <Route path="/student/leaderboard" element={<Leaderboard />} />
              </Route>

              {/* Faculty Routes */}
              <Route element={<ProtectedRoute allowedRoles={['faculty', 'admin']} />}>
                <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                <Route path="/faculty/questions" element={<QuestionBank />} />
                <Route path="/faculty/questions/new" element={<QuestionEditor />} />
                <Route path="/faculty/questions/:id/edit" element={<QuestionEditor />} />
                <Route path="/faculty/assessments" element={<AssessmentManager />} />
                <Route path="/faculty/assessments/new" element={<AssessmentEditor />} />
                <Route path="/faculty/assessments/:id/monitor" element={<AssessmentMonitor />} />
                <Route path="/faculty/assessments/:id/flagged" element={<FlaggedReviews />} />
                <Route path="/faculty/analytics" element={<FacultyAnalytics />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/health" element={<SystemHealth />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
