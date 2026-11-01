import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Terminal, ShieldCheck } from 'lucide-react';

export default function OutputPanel({
  runResult,
  submissionResult,
  customInput,
  onCustomInputChange,
  isRunning = false,
  isSubmitting = false
}) {
  const [activeTab, setActiveTab] = useState('results');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted':
      case 'Success':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accepted
          </span>
        );
      case 'Wrong Answer':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Wrong Answer
          </span>
        );
      case 'Time Limit Exceeded':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 mr-1" /> Time Limit Exceeded
          </span>
        );
      case 'Runtime Error':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Runtime Error
          </span>
        );
      default:
        return status ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
            {status}
          </span>
        ) : null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Tabs Header */}
      <div className="bg-[#161f30] px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              activeTab === 'results'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evaluation Results</span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              activeTab === 'output'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console & Errors</span>
          </button>

          <button
            onClick={() => setActiveTab('input')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'input'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Custom Input</span>
          </button>
        </div>

        {/* Status Chip */}
        {(submissionResult || runResult) && (
          <div className="flex items-center space-x-2">
            {submissionResult && getStatusBadge(submissionResult.status)}
            {runResult && getStatusBadge(runResult.status)}
            <span className="text-[11px] text-gray-400 font-mono">
              {(submissionResult?.executionTimeMs || runResult?.executionTimeMs || 0)}ms
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300">
        {/* TAB 1: Evaluation Results */}
        {activeTab === 'results' && (
          <div>
            {submissionResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/60">
                  <div>
                    <span className="text-gray-400 text-xs">Passed Test Cases: </span>
                    <span className="font-bold text-white text-sm">
                      {submissionResult.passedCount} / {submissionResult.totalCases}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Score Earned: </span>
                    <span className="font-bold text-indigo-400 text-sm">
                      {submissionResult.score} / {submissionResult.maxScore}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {submissionResult.testCaseResults?.map((tc, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        tc.passed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {tc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-xs">
                            Test Case #{tc.testCaseNumber || idx + 1}{' '}
                            {tc.isHidden && (
                              <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-sans">
                                Hidden
                              </span>
                            )}
                          </div>
                          {tc.stderr && (
                            <div className="text-[11px] text-rose-400/90 mt-1 font-sans">
                              {tc.stderr}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {tc.executionTimeMs}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : runResult ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 mb-1">Standard Output:</div>
                <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 whitespace-pre-wrap min-h-[60px]">
                  {runResult.stdout || '(No output produced)'}
                </div>
                {runResult.stderr && (
                  <>
                    <div className="text-xs text-rose-400 mb-1 mt-3">Error Output / Traceback:</div>
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 whitespace-pre-wrap">
                      {runResult.stderr}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
                <Terminal className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Run code or submit solution to view test case evaluations.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Console & Errors */}
        {activeTab === 'output' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">stdout:</div>
              <pre className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 whitespace-pre-wrap min-h-[80px]">
                {runResult?.stdout || '(No stdout)'}
              </pre>
            </div>
            <div>
              <div className="text-xs text-rose-400 mb-1">stderr / syntax diagnostics:</div>
              <pre className="p-3 rounded-xl bg-gray-900 border border-rose-500/20 text-rose-300 whitespace-pre-wrap min-h-[80px]">
                {runResult?.stderr || '(No stderr recorded)'}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: Custom Input */}
        {activeTab === 'input' && (
          <div className="h-full flex flex-col">
            <label className="text-xs text-gray-400 mb-2 block">
              Enter standard input for "Run Code" execution:
            </label>
            <textarea
              value={customInput}
              onChange={(e) => onCustomInputChange && onCustomInputChange(e.target.value)}
              placeholder="Enter sample input parameters here (e.g. 5 10)"
              className="flex-1 w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-gray-200 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none min-h-[140px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
