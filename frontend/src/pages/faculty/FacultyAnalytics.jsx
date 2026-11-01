import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/client';
import MetricCard from '../../components/MetricCard';
import {
  Activity,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function FacultyAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await reportsApi.getFacultyAnalytics();
        if (res.data.success) {
          setAnalytics(res.data.analytics);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDownloadCsv = (assessmentId) => {
    window.open(reportsApi.exportCsvUrl(assessmentId), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading faculty reporting metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Activity className="w-7 h-7 text-cyan-400" />
          <span>Faculty Analytics & CSV Reporting</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review overall assessment completion metrics, student performance trends, and export verified results to CSV.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Assessments"
          value={analytics?.totalAssessments ?? 0}
          subtitle="Managed assessments"
          icon={FileSpreadsheet}
          color="cyan"
        />
        <MetricCard
          title="Total Student Attempts"
          value={analytics?.totalParticipants ?? 0}
          subtitle="All recorded evaluations"
          icon={Users}
          color="indigo"
        />
        <MetricCard
          title="Average Score"
          value={`${analytics?.averagePercentage ?? 0}%`}
          subtitle="Across all completed tests"
          icon={Award}
          color="emerald"
        />
        <MetricCard
          title="Flagged Incidents"
          value={analytics?.flaggedAttemptsCount ?? 0}
          subtitle="Total proctoring violations"
          icon={CheckCircle}
          color="rose"
        />
      </div>

      {/* Assessment Performance Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#161f30] border-b border-gray-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Assessment Performance & CSV Export</span>
          </h2>
        </div>

        {analytics?.assessmentStats && analytics.assessmentStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Assessment Title</th>
                  <th className="px-6 py-3.5 font-semibold">Participants</th>
                  <th className="px-6 py-3.5 font-semibold">Completed</th>
                  <th className="px-6 py-3.5 font-semibold">Average Score</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {analytics.assessmentStats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{stat.title}</td>
                    <td className="px-6 py-4 font-mono text-gray-300">{stat.participants} students</td>
                    <td className="px-6 py-4 font-mono text-gray-300">{stat.completed} submitted</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-sm">
                      {stat.averageScore} / {stat.totalMarks}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadCsv(stat.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 font-semibold text-xs border border-gray-700 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        title="Download CSV spreadsheet protected against formula injection"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download CSV</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">
            No assessment metrics recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
