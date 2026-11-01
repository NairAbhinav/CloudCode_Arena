import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  Trophy,
  History,
  ShieldAlert,
  Users,
  Activity,
  LogOut,
  UserCheck
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-gray-800 px-4 lg:px-8 py-3 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              CloudCode <span className="text-indigo-400">Arena</span>
            </span>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
              Assessment Platform
            </span>
          </div>
        </Link>

        {/* Dynamic Nav Links */}
        {user && (
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {/* Student Links */}
            {user.role === 'student' && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student/dashboard')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/student/problems"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student/problems')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Problems</span>
                </Link>
                <Link
                  to="/student/assessments"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student/assessments')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Assessments</span>
                </Link>
                <Link
                  to="/student/history"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student/history')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Submissions</span>
                </Link>
                <Link
                  to="/student/leaderboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student/leaderboard')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Leaderboard</span>
                </Link>
              </>
            )}

            {/* Faculty Links */}
            {user.role === 'faculty' && (
              <>
                <Link
                  to="/faculty/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/faculty/dashboard')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/faculty/questions"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/faculty/questions')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Question Bank</span>
                </Link>
                <Link
                  to="/faculty/assessments"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/faculty/assessments')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Assessments</span>
                </Link>
                <Link
                  to="/faculty/analytics"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/faculty/analytics')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Analytics & CSV</span>
                </Link>
              </>
            )}

            {/* Admin Links */}
            {user.role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/dashboard')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Hub</span>
                </Link>
                <Link
                  to="/admin/users"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Users & Roles</span>
                </Link>
                <Link
                  to="/faculty/questions"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/faculty/questions')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Questions</span>
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/audit-logs')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Audit Logs</span>
                </Link>
                <Link
                  to="/admin/health"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/health')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Health</span>
                </Link>
              </>
            )}
          </div>
        )}

        {/* User profile & Logout */}
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-800/60 border border-gray-700/60 rounded-full px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                {user.name ? user.name[0] : 'U'}
              </div>
              <span className="text-xs font-semibold text-gray-200 hidden sm:inline max-w-[120px] truncate">
                {user.name}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : user.role === 'faculty'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
