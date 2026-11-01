import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsApi, assessmentsApi } from '../../api/client';
import MetricCard from '../../components/MetricCard';
import {
  Code,
  CheckCircle,
  FileCode,
  Percent,
  Calendar,
  Clock,
  ArrowRight,
  Trophy,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [notification, setNotification] = useState(location.state?.message || '');
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setNotification(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    async function loadData() {
      try {
        const [progressRes, leaderboardRes] = await Promise.all([
          reportsApi.getStudentProgress(),
          reportsApi.getLeaderboard()
        ]);

        if (progressRes.data.success) {
          setStats(progressRes.data.stats);
        }
        if (leaderboardRes.data.success) {
          setLeaderboard(leaderboardRes.data.leaderboard.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load student progress:', err);
        setError('Failed to fetch dashboard metrics. Verify backend services are active.');
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
        <p className="text-sm text-gray-400">Loading student analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Attempt Limit Notification Banner */}
      {notification && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-sm flex items-center justify-between gap-4 shadow-lg shadow-amber-500/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-xs sm:text-sm">{notification}</span>
          </div>
          <button
            onClick={() => setNotification('')}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-600/10 to-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-indigo-400">{user?.name}</span> 👋
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Sharpen your Python problem-solving skills, take monitored assessments, and compete on the global leaderboard.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/student/problems"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2"
            >
              <span>Explore Practice Bank</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Problems Attempted"
          value={stats?.problemsAttempted ?? 0}
          subtitle="Distinct coding challenges"
          icon={Code}
          color="indigo"
        />
        <MetricCard
          title="Problems Solved"
          value={stats?.problemsSolved ?? 0}
          subtitle="Accepted full solutions"
          icon={CheckCircle}
          color="emerald"
        />
        <MetricCard
          title="Total Submissions"
          value={stats?.totalSubmissions ?? 0}
          subtitle="Code evaluations run"
          icon={FileCode}
          color="cyan"
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${stats?.acceptanceRate ?? 0}%`}
          subtitle="Overall pass accuracy"
          icon={Percent}
          color="amber"
        />
      </div>

      {/* Main Grid: Assessments & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active & Upcoming Assessments (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Assessments Alert */}
          {stats?.activeAssessments && stats.activeAssessments.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
                    Active Assessment in Progress
                  </h3>
                </div>
                <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20">
                  Live Now
                </span>
              </div>
              {stats.activeAssessments.map((a) => (
                <div key={a.id} className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/20">
                  <div>
                    <h4 className="text-base font-bold text-white">{a.title}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Duration: {a.durationMinutes} mins</span>
                      <span>•</span>
                      <span>Total Marks: {a.totalMarks}</span>
                    </p>
                  </div>
                  <Link
                    to={`/student/assessments/${a.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-colors"
                  >
                    Enter Assessment
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Assessments */}
          <div className="glass-panel rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Upcoming Scheduled Assessments</span>
              </h2>
              <Link to="/student/assessments" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                View All
              </Link>
            </div>

            {stats?.upcomingAssessments && stats.upcomingAssessments.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingAssessments.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-gray-100">{item.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>Starts: {new Date(item.startTime).toLocaleString()}</span>
                        <span>•</span>
                        <span>{item.durationMinutes} mins</span>
                      </p>
                    </div>
                    <Link
                      to={`/student/assessments/${item.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    >
                      Instructions
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                No upcoming assessments scheduled at this time.
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="glass-panel rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>Recent Submissions</span>
              </h2>
              <Link to="/student/history" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                View History
              </Link>
            </div>

            {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-semibold">Problem</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Score</th>
                      <th className="pb-3 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {stats.recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-800/20">
                        <td className="py-3 font-medium text-gray-200">{sub.questionTitle}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'Accepted'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : sub.status === 'Wrong Answer'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-gray-300">
                          {sub.score} / {sub.maxScore}
                        </td>
                        <td className="py-3 text-gray-500">{new Date(sub.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs">
                You haven't submitted any solutions yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Performance Breakdown & Leaderboard (1 col) */}
        <div className="space-y-6">
          {/* Difficulty Breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-gray-800">
            <h3 className="text-base font-bold text-white mb-4">Difficulty Breakdown</h3>
            <div className="space-y-3.5">
              {['Easy', 'Medium', 'Hard'].map((diff) => {
                const diffData = stats?.difficultyBreakdown?.[diff] || { attempted: 0, solved: 0 };
                const pct = diffData.attempted > 0 ? Math.round((diffData.solved / diffData.attempted) * 100) : 0;
                const colorClass =
                  diff === 'Easy'
                    ? 'bg-emerald-500'
                    : diff === 'Medium'
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <div key={diff} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">{diff}</span>
                      <span className="text-gray-400 font-mono">
                        {diffData.solved} solved / {diffData.attempted} tried
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard Snippet */}
          <div className="glass-panel rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Top Solvers</span>
              </h3>
              <Link to="/student/leaderboard" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                Full Board
              </Link>
            </div>

            <div className="space-y-2.5">
              {leaderboard.length > 0 ? (
                leaderboard.map((item, idx) => (
                  <div
                    key={item.userId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/50 border border-gray-800/80"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : idx === 1
                            ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {item.rank || idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-200 truncate max-w-[120px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {item.problemsSolved} solved
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">No ranked solvers yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
