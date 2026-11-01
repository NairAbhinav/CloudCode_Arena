import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { anticheatApi } from '../../api/client';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function FlaggedReviews() {
  const { id } = useParams();
  const [flaggedAttempts, setFlaggedAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchFlagged = async () => {
    try {
      const res = await anticheatApi.getFlagged(id);
      if (res.data.success) {
        setFlaggedAttempts(res.data.flaggedAttempts);
      }
    } catch (err) {
      console.error('Failed to load flagged attempts:', err);
      setError('Failed to load flagged monitoring incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagged();
  }, [id]);

  const handleAction = async (attemptId, action) => {
    let reason = '';
    if (action === 'disqualify' || action === 'terminate') {
      reason = prompt('Enter reason for terminating/disqualifying this attempt:', 'Terminated by faculty reviewer for anti-cheating violations.');
      if (!reason) return;
    }

    setActionLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await anticheatApi.reviewAction(attemptId, { action, reason });
      if (res.data.success) {
        setMessage(`Attempt updated: ${action === 'resolve' ? 'Resolved & Approved' : 'Terminated & Disqualified'}.`);
        fetchFlagged();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update attempt.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading flagged incidents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <Link
        to="/faculty/assessments"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assessments</span>
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
          <span>Flagged Monitoring Review & Adjudication</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review chronological proctoring violations recorded by anti-cheating listeners, evaluate context, and resolve or disqualify attempts.
        </p>
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

      {flaggedAttempts.length > 0 ? (
        <div className="space-y-6">
          {flaggedAttempts.map((item) => (
            <div
              key={item.attemptId}
              className={`glass-panel rounded-3xl p-6 border ${
                item.isDisqualified
                  ? 'border-rose-600/40 bg-rose-950/10'
                  : 'border-amber-500/30 bg-amber-950/10'
              } space-y-5`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {item.student?.name || 'Unknown Student'}
                  </h3>
                  <div className="text-xs text-gray-400">{item.student?.email}</div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      item.isDisqualified
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : item.status === 'terminated'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.isDisqualified ? 'Disqualified' : item.status}
                  </span>

                  <span className="text-xs font-mono font-bold text-gray-300">
                    Violations: <span className="text-rose-400">{item.violationsCount}</span>
                  </span>
                </div>
              </div>

              {/* Event Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                  Recorded Monitoring Event Timeline
                </h4>
                <div className="space-y-2">
                  {item.events?.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span className="font-semibold text-gray-200 capitalize">
                          {ev.eventType.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                          {ev.actionTaken}
                        </span>
                      </div>
                      <span className="text-gray-500 font-mono text-[11px]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Decision Actions */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-end space-x-3">
                <button
                  onClick={() => handleAction(item.attemptId, 'resolve')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolve & Clear Flag</span>
                </button>

                <button
                  onClick={() => handleAction(item.attemptId, 'terminate')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Terminate & Disqualify Attempt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass-panel rounded-3xl border border-gray-800 text-gray-500 text-xs">
          No flagged anti-cheating incidents or threshold violations detected for this assessment.
        </div>
      )}
    </div>
  );
}
