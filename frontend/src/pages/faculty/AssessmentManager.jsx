import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '../../api/client';
import {
  FileSpreadsheet,
  Plus,
  Clock,
  Calendar,
  Users,
  ShieldAlert,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function AssessmentManager() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await assessmentsApi.list({ filter: 'mine' });
      if (res.data.success) {
        setAssessments(res.data.assessments);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleTogglePublish = async (id) => {
    setError('');
    setMessage('');
    try {
      const res = await assessmentsApi.publish(id);
      if (res.data.success) {
        setMessage(res.data.message);
        fetchAssessments();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle assessment publication.');
    }
  };

  const handleDeleteAssessment = async (id, title) => {
    const confirm = window.confirm(
      `Are you sure you want to permanently delete assessment "${title}"?\n\nThis will remove the assessment, all student attempts, anti-cheating incidents, and evaluation records. This action cannot be undone.`
    );
    if (!confirm) return;

    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      const res = await assessmentsApi.delete(id);
      if (res.data.success) {
        setMessage(res.data.message || `Assessment "${title}" was deleted.`);
        fetchAssessments();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete assessment.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-cyan-400" />
            <span>Coding Assessments Management</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure assessment timing, question selections, anti-cheating proctoring thresholds, and review student outcomes.
          </p>
        </div>

        <Link
          to="/faculty/assessments/new"
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Assessment</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Assessment Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading assessments...</p>
          </div>
        ) : assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Title</th>
                  <th className="px-6 py-3.5 font-semibold">Timeline & Duration</th>
                  <th className="px-6 py-3.5 font-semibold">Questions / Marks</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Anti-Cheating</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{a.title}</div>
                      <div className="text-[11px] text-gray-400 line-clamp-1">{a.description}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-gray-300">
                      <div>Start: {new Date(a.startTime).toLocaleString()}</div>
                      <div>End: {new Date(a.endTime).toLocaleString()}</div>
                      <div className="text-indigo-400 font-bold">{a.durationMinutes} mins limit</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <span className="font-bold text-white">{a.questionCount}</span> questions (
                      <span className="font-mono text-cyan-400">{a.totalMarks}</span> marks)
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(a.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                          a.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                        title="Click to toggle draft/published status"
                      >
                        {a.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {a.antiCheatingEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Monitored
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
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
                      <button
                        onClick={() => handleDeleteAssessment(a.id, a.title)}
                        disabled={deletingId === a.id}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 font-semibold text-[11px] transition-colors border border-rose-500/30 inline-flex items-center gap-1 disabled:opacity-50"
                        title="Delete assessment"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">
            No assessments created yet. Click "Create New Assessment" to set up your first exam.
          </div>
        )}
      </div>
    </div>
  );
}
