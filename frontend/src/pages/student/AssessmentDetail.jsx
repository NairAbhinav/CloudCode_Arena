import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { assessmentsApi } from '../../api/client';
import {
  FileSpreadsheet,
  Clock,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Play,
  Loader2
} from 'lucide-react';

export default function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await assessmentsApi.get(id);
        if (res.data.success) {
          setAssessment(res.data.assessment);
        }
      } catch (err) {
        console.error('Failed to load assessment details:', err);
        setError('Failed to load assessment details.');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [id]);

  const handleStartAttempt = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await assessmentsApi.startAttempt(id);
      if (res.data.success) {
        navigate(`/student/assessments/${id}/room`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start assessment attempt.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading assessment instructions...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Assessment Not Found</h2>
        <Link to="/student/assessments" className="text-xs text-indigo-400 font-semibold underline">
          Back to Assessments
        </Link>
      </div>
    );
  }

  const antiCheat = assessment.antiCheatingConfig || {};
  const isMonitored = antiCheat.enabled;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <Link
        to="/student/assessments"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assessments</span>
      </Link>

      {/* Main Card */}
      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-gray-800 space-y-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                assessment.phase === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {assessment.phase === 'active' ? 'Live Assessment' : assessment.phase}
            </span>
            {isMonitored && (
              <span className="flex items-center space-x-1 text-xs font-semibold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Cheating Active</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {assessment.title}
          </h1>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            {assessment.description}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Duration</div>
            <div className="text-base font-extrabold text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{assessment.durationMinutes} mins</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Total Marks</div>
            <div className="text-base font-extrabold text-indigo-400 mt-0.5">
              {assessment.totalMarks}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Questions</div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {assessment.questions?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Allowed Attempts</div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {assessment.maxAttempts}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-2">
            Assessment Instructions
          </h2>
          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 text-xs text-gray-300 whitespace-pre-line leading-relaxed">
            {assessment.instructions || 'Read all problems thoroughly and submit before time expires.'}
          </div>
        </div>

        {/* Anti-Cheating Proctored Notice */}
        {isMonitored && (
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>ANTI-CHEATING INTEGRITY NOTICE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              This assessment uses automated integrity monitoring configured by the faculty. Please note the following rules:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
              {antiCheat.trackTabSwitches && (
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Tab / window switching is monitored</span>
                </li>
              )}
              {antiCheat.trackFocusLoss && (
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Browser window focus loss is recorded</span>
                </li>
              )}
              {antiCheat.trackFullscreenExit && (
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Fullscreen mode is required</span>
                </li>
              )}
              {antiCheat.trackClipboard && (
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Clipboard actions outside the editor are tracked</span>
                </li>
              )}
            </ul>
            <div className="text-[11px] text-gray-400 pt-2 border-t border-indigo-500/20 italic">
              <strong>Note:</strong> Standard copy, paste, and cut operations <strong>inside</strong> the Monaco Code Editor remain fully functional.
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Previous Attempts Section (Student View) */}
        {assessment.myAttempts && assessment.myAttempts.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>Your Attempts ({assessment.myAttempts.length} / {assessment.maxAttempts})</span>
              </h2>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Attempt</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Anti-Cheat Alerts</th>
                      <th className="px-4 py-3 font-semibold">Details / Reason</th>
                      <th className="px-4 py-3 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {assessment.myAttempts.map((att) => (
                      <tr key={att.attemptId} className="hover:bg-gray-800/20">
                        <td className="px-4 py-3 font-bold text-white">
                          Attempt #{att.attemptNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              att.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : att.status === 'in_progress'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : att.status === 'terminated'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-200">
                          {att.score} / {att.totalMarks} ({att.percentage}%)
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {att.violationsCount > 0 ? (
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {att.violationsCount} alerts
                            </span>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-400 max-w-xs truncate">
                          {att.disqualificationReason || (att.status === 'in_progress' ? 'Session active' : 'Completed normally')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-gray-400">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleTimeString() : new Date(att.startTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Start / Resume / Limit Action Button Area */}
        <div className="pt-2">
          {assessment.phase === 'active' ? (
            assessment.hasActiveAttempt ? (
              <button
                onClick={() => navigate(`/student/assessments/${id}/room`)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Active Attempt</span>
              </button>
            ) : assessment.attemptsCount >= assessment.maxAttempts ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">
                      Maximum Attempts Reached ({assessment.attemptsCount} of {assessment.maxAttempts})
                    </div>
                    <div className="text-xs text-amber-300/80 mt-0.5">
                      You have utilized all allowed attempts for this assessment. Review your scores and evaluation details above.
                    </div>
                  </div>
                </div>
                <Link
                  to="/student/assessments"
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition-colors self-start sm:self-auto"
                >
                  All Assessments
                </Link>
              </div>
            ) : (
              <button
                onClick={handleStartAttempt}
                disabled={starting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Assessment Room...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      Start Attempt {assessment.attemptsCount > 0 ? `(#${assessment.attemptsCount + 1} of ${assessment.maxAttempts})` : ''}
                    </span>
                  </>
                )}
              </button>
            )
          ) : assessment.phase === 'upcoming' ? (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
              This assessment has not opened yet. It starts at {new Date(assessment.startTime).toLocaleString()}.
            </div>
          ) : (
            <div className="text-xs text-gray-400 bg-gray-900 border border-gray-800 p-3 rounded-xl">
              This assessment deadline has passed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
