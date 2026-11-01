import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assessmentsApi, reportsApi, anticheatApi } from '../../api/client';
import {
  Users,
  Download,
  Share2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  XCircle,
  Trash2
} from 'lucide-react';

export default function AssessmentMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [terminatingId, setTerminatingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchParticipants = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        assessmentsApi.get(id),
        assessmentsApi.getParticipants(id)
      ]);
      if (aRes.data.success) setAssessment(aRes.data.assessment);
      if (pRes.data.success) setParticipants(pRes.data.participants);
    } catch (err) {
      console.error('Failed to load participants:', err);
      setError('Failed to load participant data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTerminateAttempt = async (attemptId, studentName) => {
    const reason = prompt(
      `Terminate active attempt for ${studentName}?\nThe student will be immediately redirected to their dashboard.\n\nEnter reason for termination:`,
      'Terminated by faculty from monitoring dashboard.'
    );
    if (!reason) return;

    setTerminatingId(attemptId);
    setError('');
    setMessage('');
    try {
      const res = await anticheatApi.reviewAction(attemptId, { action: 'terminate', reason });
      if (res.data.success) {
        setMessage(`Attempt for ${studentName} was terminated. Student redirected.`);
        fetchParticipants();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to terminate attempt.');
    } finally {
      setTerminatingId(null);
    }
  };

  const handleReleaseResults = async () => {
    setReleasing(true);
    setMessage('');
    try {
      const res = await assessmentsApi.releaseResults(id);
      if (res.data.success) {
        setMessage('Results successfully released to all participating students!');
        fetchParticipants();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to release results.');
    } finally {
      setReleasing(false);
    }
  };

  const handleDeleteAssessment = async () => {
    const confirm = window.confirm(
      `Are you sure you want to permanently delete assessment "${assessment?.title}"?\n\nThis will remove the assessment, all student attempts, anti-cheating records, and results. This action cannot be undone.`
    );
    if (!confirm) return;

    setDeleting(true);
    setError('');
    setMessage('');
    try {
      const res = await assessmentsApi.delete(id);
      if (res.data.success) {
        navigate('/faculty/assessments');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete assessment.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(reportsApi.exportCsvUrl(id), '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading live assessment participants...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <Link
        to="/faculty/assessments"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assessments</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Assessment Participants & Results: {assessment?.title}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Live monitor student attempts, review earned scores, inspect anti-cheating alerts, and export data.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Link
            to={`/faculty/assessments/${id}/flags`}
            className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Proctoring Incidents</span>
          </Link>

          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs border border-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleReleaseResults}
            disabled={releasing || assessment?.isResultsReleased}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {releasing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>{assessment?.isResultsReleased ? 'Results Released' : 'Release Results to Students'}</span>
          </button>

          <button
            onClick={handleDeleteAssessment}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-xs border border-rose-500/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Delete this assessment permanently"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete Assessment</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Participants Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {participants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Student Name & Email</th>
                  <th className="px-6 py-3.5 font-semibold">Attempt</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Score / Marks</th>
                  <th className="px-6 py-3.5 font-semibold">Percentage</th>
                  <th className="px-6 py-3.5 font-semibold">Violations</th>
                  <th className="px-6 py-3.5 font-semibold">Submitted Time</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {participants.map((p) => (
                  <tr key={p.attemptId} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{p.student?.name || 'Unknown Student'}</div>
                      <div className="text-[11px] text-gray-400">{p.student?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-300">
                      Attempt #{p.attemptNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : p.status === 'in_progress'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white text-sm">
                      {p.score} / {p.totalMarks}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">
                      {p.percentage}%
                    </td>
                    <td className="px-6 py-4">
                      {p.violationsCount > 0 ? (
                        <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {p.violationsCount} alerts
                        </span>
                      ) : (
                        <span className="text-gray-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400 text-[11px]">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleTimeString() : 'In Progress'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'in_progress' || p.status === 'flagged' ? (
                        <button
                          onClick={() => handleTerminateAttempt(p.attemptId, p.student?.name || 'Student')}
                          disabled={terminatingId === p.attemptId}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          title="Terminate attempt immediately and redirect student"
                        >
                          {terminatingId === p.attemptId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Terminate Attempt</span>
                        </button>
                      ) : (
                        <span className="text-gray-500 text-[11px] font-mono">
                          {p.status === 'terminated' ? 'Terminated' : 'Finalized'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">
            No students have started or submitted an attempt for this assessment yet.
          </div>
        )}
      </div>
    </div>
  );
}
