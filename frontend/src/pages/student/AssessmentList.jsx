import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '../../api/client';
import { FileSpreadsheet, Clock, Calendar, CheckCircle2, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';

export default function AssessmentList() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssessments() {
      try {
        const res = await assessmentsApi.list();
        if (res.data.success) {
          setAssessments(res.data.assessments);
        }
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading scheduled assessments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
          <span>Scheduled Coding Assessments</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Participate in timed examinations with automated code judging and configured anti-cheating proctoring.
        </p>
      </div>

      {assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assessments.map((a) => (
            <div
              key={a.id}
              className={`glass-panel rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                a.phase === 'active'
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : a.phase === 'upcoming'
                  ? 'border-indigo-500/30'
                  : 'border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      a.phase === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : a.phase === 'upcoming'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {a.phase === 'active' ? 'Active Now' : a.phase}
                  </span>

                  {a.antiCheatingEnabled && (
                    <span className="flex items-center space-x-1 text-[11px] font-semibold text-cyan-400" title="Anti-cheating monitoring active">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Monitored</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-2 line-clamp-1">{a.title}</h3>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{a.description || 'No description provided.'}</p>

                <div className="space-y-1.5 text-xs text-gray-400 mb-6 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Duration:
                    </span>
                    <span className="font-semibold text-gray-200">{a.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Start:
                    </span>
                    <span className="font-mono text-[11px] text-gray-300">
                      {new Date(a.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Marks:</span>
                    <span className="font-bold text-indigo-400">{a.totalMarks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Questions:</span>
                    <span className="font-semibold text-gray-200">{a.questionCount}</span>
                  </div>
                </div>
              </div>

              <div>
                <Link
                  to={`/student/assessments/${a.id}`}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    a.phase === 'active'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <span>{a.phase === 'active' ? 'Enter Assessment' : 'View Instructions'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-2xl border border-gray-800">
          <FileSpreadsheet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-300">No assessments scheduled</h3>
          <p className="text-xs text-gray-500 mt-1">Check back later for newly published tests from your faculty.</p>
        </div>
      )}
    </div>
  );
}
