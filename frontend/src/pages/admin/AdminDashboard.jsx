import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsApi } from '../../api/client';
import MetricCard from '../../components/MetricCard';
import {
  ShieldCheck,
  Users,
  BookOpen,
  FileSpreadsheet,
  FileCode,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await reportsApi.getAdminHealth();
        if (res.data.success) {
          setHealthData(res.data.health);
        }
      } catch (err) {
        console.error('Failed to load admin health:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading system operations hub...</p>
      </div>
    );
  }

  const stats = healthData?.platformStats || {};

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-rose-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Administration</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              CloudCode Operations Hub
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              System monitoring, user role administration, platform-wide question library management, and security audit log inspection.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/admin/users"
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs border border-gray-700 transition-colors"
            >
              Manage Users
            </Link>
            <Link
              to="/admin/audit-logs"
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition-colors"
            >
              Inspect Audit Trail
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Registered Accounts"
          value={stats.totalUsers ?? 0}
          subtitle={`${stats.activeUsers ?? 0} active users`}
          icon={Users}
          color="rose"
        />
        <MetricCard
          title="Question Library"
          value={stats.totalQuestions ?? 0}
          subtitle={`${stats.publishedQuestions ?? 0} published`}
          icon={BookOpen}
          color="cyan"
        />
        <MetricCard
          title="Assessments"
          value={stats.totalAssessments ?? 0}
          subtitle="All academic exams"
          icon={FileSpreadsheet}
          color="indigo"
        />
        <MetricCard
          title="Code Evaluations"
          value={stats.totalSubmissions ?? 0}
          subtitle="Processed submissions"
          icon={FileCode}
          color="emerald"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/admin/users"
          className="glass-card rounded-2xl p-6 border border-gray-800 hover:border-rose-500/40 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">User & Role Management</h3>
            <p className="text-xs text-gray-400">
              Search platform users, reassign roles between Student, Faculty, and Admin, and deactivate accounts.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-rose-400 group-hover:text-rose-300">
            <span>Manage accounts</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/audit-logs"
          className="glass-card rounded-2xl p-6 border border-gray-800 hover:border-indigo-500/40 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Platform Audit Trail</h3>
            <p className="text-xs text-gray-400">
              Review timestamped audit records for all logins, question authoring, assessments, and role changes.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Search audit logs</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/health"
          className="glass-card rounded-2xl p-6 border border-gray-800 hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Infrastructure Health</h3>
            <p className="text-xs text-gray-400">
              Verify real-time microservices connectivity, database persistence, and system diagnostics.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Inspect health status</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
