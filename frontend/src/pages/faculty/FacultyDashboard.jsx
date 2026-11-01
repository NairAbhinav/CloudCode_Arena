import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsApi, assessmentsApi } from '../../api/client';
import MetricCard from '../../components/MetricCard';
import {
  FileSpreadsheet,
  BookOpen,
  Users,
  ShieldAlert,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [anRes, aRes] = await Promise.all([
          reportsApi.getFacultyAnalytics(),
          assessmentsApi.list({ filter: 'mine' })
        ]);

        if (anRes.data.success) {
          setAnalytics(anRes.data.analytics);
        }
        if (aRes.data.success) {
          setAssessments(aRes.data.assessments);
        }
      } catch (err) {
        console.error('Failed to load faculty dashboard data:', err);
        setError('Failed to fetch faculty analytics. Please verify backend services.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading faculty workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-cyan-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Faculty Workspace, <span className="text-cyan-400">{user?.name}</span> 🎓
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Create and manage coding problems, schedule timed assessments with automated proctoring, and review student submissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/faculty/questions/new"
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs transition-colors border border-gray-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>New Question</span>
            </Link>

            <Link
              to="/faculty/assessments/new"
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-600/25 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Assessments"
          value={analytics?.totalAssessments ?? 0}
          subtitle="Created by faculty"
          icon={FileSpreadsheet}
          color="cyan"
        />
        <MetricCard
          title="Active & Upcoming"
          value={(analytics?.activeCount ?? 0) + (analytics?.upcomingCount ?? 0)}
          subtitle="Currently running or scheduled"
          icon={Calendar}
          color="indigo"
        />
        <MetricCard
          title="Total Submissions Evaluated"
          value={analytics?.totalParticipants ?? 0}
          subtitle="Student test attempts"
          icon={Users}
          color="emerald"
        />
        <MetricCard
          title="Flagged Incidents"
          value={analytics?.flaggedAttemptsCount ?? 0}
          subtitle="Requires faculty review"
          icon={ShieldAlert}
          color="rose"
        />
      </div>

      {/* My Assessments Management Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#161f30] border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>My Assessments</span>
          </h2>
          <Link
            to="/faculty/assessments"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Manage All
          </Link>
        </div>

        {assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Title</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Timeline</th>
                  <th className="px-6 py-3.5 font-semibold">Questions</th>
                  <th className="px-6 py-3.5 font-semibold">Anti-Cheating</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{a.title}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.phase === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : a.phase === 'upcoming'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {a.phase}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-[11px]">
                      {new Date(a.startTime).toLocaleDateString()} • {a.durationMinutes}m
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {a.questionCount} problems ({a.totalMarks} pts)
                    </td>
                    <td className="px-6 py-4">
                      {a.antiCheatingEnabled ? (
                        <span className="text-emerald-400 font-semibold text-[11px]">Active</span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/faculty/assessments/${a.id}/monitor`}
                        className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 font-semibold text-[11px] transition-colors"
                      >
                        Participants
                      </Link>
                      <Link
                        to={`/faculty/assessments/${a.id}/flagged`}
                        className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-rose-400 font-semibold text-[11px] transition-colors"
                      >
                        Flagged
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-xs">
            No assessments created yet. Click "Create Assessment" to set up your first examination.
          </div>
        )}
      </div>
    </div>
  );
}
