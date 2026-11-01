import React, { useEffect, useState } from 'react';
import { submissionsApi } from '../../api/client';
import { History, Eye, X, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const res = await submissionsApi.getMyHistory({ page, limit: 15 });
        if (res.data.success) {
          setSubmissions(res.data.submissions);
          setTotalPages(res.data.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [page]);

  const viewDetails = async (id) => {
    setModalLoading(true);
    try {
      const res = await submissionsApi.getById(id);
      if (res.data.success) {
        setSelectedSubmission(res.data.submission);
      }
    } catch (err) {
      alert('Failed to load submission details.');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accepted
          </span>
        );
      case 'Wrong Answer':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Wrong Answer
          </span>
        );
      case 'Time Limit Exceeded':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 mr-1" /> Time Limit Exceeded
          </span>
        );
      case 'Runtime Error':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Runtime Error
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <History className="w-7 h-7 text-indigo-400" />
          <span>My Submission History</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Review all your past code evaluations, execution times, scores, and submitted source code.
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading submissions...</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Problem Title</th>
                  <th className="px-5 py-3.5 font-semibold">Context</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Score</th>
                  <th className="px-5 py-3.5 font-semibold">Duration</th>
                  <th className="px-5 py-3.5 font-semibold">Submitted At</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      {sub.question?.title || 'Unknown Problem'}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {sub.assessment?.title ? (
                        <span className="text-indigo-400 font-medium">Assessment: {sub.assessment.title}</span>
                      ) : (
                        <span className="text-gray-500">Practice</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-5 py-4 font-mono font-bold text-gray-200">
                      {sub.score} / {sub.maxScore}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-400">
                      {sub.executionTimeMs}ms
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {new Date(sub.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => viewDetails(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-indigo-400 hover:text-indigo-300 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">
            No submissions recorded yet. Head over to the practice bank to begin solving!
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400 font-mono px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Code & Evaluation Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-gray-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#161f30] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Submission Details - {selectedSubmission.question?.title}
                </h3>
                <span className="text-xs text-gray-400">
                  {new Date(selectedSubmission.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
                <div>
                  <span className="text-xs text-gray-400">Status: </span>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div>
                  <span className="text-xs text-gray-400">Score: </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {selectedSubmission.score} / {selectedSubmission.maxScore}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Duration: </span>
                  <span className="font-mono text-gray-200">{selectedSubmission.executionTimeMs}ms</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Submitted Code (Python 3)
                </h4>
                <pre className="p-4 rounded-2xl bg-black/50 border border-gray-800 text-gray-200 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
                  {selectedSubmission.code}
                </pre>
              </div>

              {selectedSubmission.testCaseResults && (
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Test Case Breakdown
                  </h4>
                  <div className="space-y-2">
                    {selectedSubmission.testCaseResults.map((tc, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                          tc.passed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {tc.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          <span>Test Case #{tc.testCaseNumber || idx + 1} {tc.isHidden && '(Hidden)'}</span>
                        </div>
                        <span>{tc.executionTimeMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
