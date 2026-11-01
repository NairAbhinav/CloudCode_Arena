import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { assessmentsApi, questionsApi } from '../../api/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ShieldAlert,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';

export default function AssessmentEditor() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    'Please read all problem statements carefully. Anti-cheating monitoring is active during this assessment. Monaco Editor shortcuts and copy/paste within the editor are allowed.'
  );

  // Default times: start now, end in 7 days
  const now = new Date();
  const defaultStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [resultReleasePolicy, setResultReleasePolicy] = useState('after_deadline');

  // Anti-cheating config
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [trackTabSwitches, setTrackTabSwitches] = useState(true);
  const [trackFocusLoss, setTrackFocusLoss] = useState(true);
  const [trackFullscreenExit, setTrackFullscreenExit] = useState(false);
  const [trackClipboard, setTrackClipboard] = useState(true);
  const [maxViolations, setMaxViolations] = useState(3);
  const [actionOnThreshold, setActionOnThreshold] = useState('flag');

  // Question Selector
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]); // [{ questionId, title, marks }]

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await questionsApi.list({ limit: 100 });
        if (res.data.success) {
          setAvailableQuestions(res.data.questions);
          // Pre-select first 2 if available
          if (res.data.questions.length > 0) {
            const initial = res.data.questions.slice(0, 2).map(q => ({
              questionId: q.id,
              title: q.title,
              marks: 50
            }));
            setSelectedQuestions(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load questions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, []);

  const handleAddQuestion = (questionId) => {
    if (selectedQuestions.some(q => q.questionId === questionId)) return;
    const qObj = availableQuestions.find(q => q.id === questionId);
    if (qObj) {
      setSelectedQuestions([...selectedQuestions, { questionId: qObj.id, title: qObj.title, marks: 25 }]);
    }
  };

  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.questionId !== questionId));
  };

  const handleUpdateMarks = (questionId, marks) => {
    setSelectedQuestions(selectedQuestions.map(q => q.questionId === questionId ? { ...q, marks: parseInt(marks, 10) || 0 } : q));
  };

  const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Assessment title is required.');
      return;
    }

    if (selectedQuestions.length === 0) {
      setError('You must select at least one question for this assessment.');
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError('End time must be set after start time.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions,
        questions: selectedQuestions.map(q => ({ questionId: q.questionId, marks: q.marks })),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes: parseInt(durationMinutes, 10),
        maxAttempts: parseInt(maxAttempts, 10),
        resultReleasePolicy,
        antiCheatingConfig: {
          enabled: antiCheatEnabled,
          trackTabSwitches,
          trackFocusLoss,
          trackFullscreenExit,
          trackClipboard,
          maxViolations: parseInt(maxViolations, 10),
          actionOnThreshold
        }
      };

      await assessmentsApi.create(payload);
      navigate('/faculty/assessments');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading assessment builder...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <Link
        to="/faculty/assessments"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assessments</span>
      </Link>

      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-gray-800 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Assessment</h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure examination schedule, select coding challenges, assign marks, and customize anti-cheating proctoring.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Assessment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Python Assessment 2026"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of syllabus or topics covered..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Student Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Timing & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                min="5"
                max="300"
                required
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Attempts & Results Policy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Maximum Attempts
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                min="1"
                max="5"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Result Release Policy
              </label>
              <select
                value={resultReleasePolicy}
                onChange={(e) => setResultReleasePolicy(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="immediate">Immediate (On attempt completion)</option>
                <option value="after_deadline">After Assessment Deadline Passes</option>
                <option value="manual">Manual (Faculty releases manually)</option>
              </select>
            </div>
          </div>

          {/* Anti-Cheating Monitoring Configuration (Section 12) */}
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Anti-Cheating Monitoring Configuration
                </h3>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiCheatEnabled}
                  onChange={(e) => setAntiCheatEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                <span className="ml-2 text-xs font-semibold text-gray-300">
                  {antiCheatEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {antiCheatEnabled && (
              <div className="space-y-4 pt-3 border-t border-indigo-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
                  <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackTabSwitches}
                      onChange={(e) => setTrackTabSwitches(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Track Tab / Window Switches</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackFocusLoss}
                      onChange={(e) => setTrackFocusLoss(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Track Window Blur / Focus Loss</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackFullscreenExit}
                      onChange={(e) => setTrackFullscreenExit(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Track Fullscreen Exits</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackClipboard}
                      onChange={(e) => setTrackClipboard(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Track External Clipboard Activity</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Violation Threshold (Count)
                    </label>
                    <input
                      type="number"
                      value={maxViolations}
                      onChange={(e) => setMaxViolations(e.target.value)}
                      min="1"
                      max="10"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Action on Exceeding Threshold
                    </label>
                    <select
                      value={actionOnThreshold}
                      onChange={(e) => setActionOnThreshold(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="warn">Warn student only</option>
                      <option value="flag">Flag attempt for faculty review</option>
                      <option value="terminate">Terminate attempt immediately</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 italic">
                  * Editor shortcuts and copy/paste inside Monaco Editor are always preserved for normal coding.
                </p>
              </div>
            )}
          </div>

          {/* Selected Questions Section */}
          <div className="pt-4 border-t border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Assessment Questions ({selectedQuestions.length})
                </h3>
                <span className="text-xs text-cyan-400 font-bold font-mono">
                  Total Marks: {totalMarks}
                </span>
              </div>

              {/* Add question dropdown */}
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddQuestion(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">+ Add Question from Bank...</option>
                  {availableQuestions
                    .filter(q => !selectedQuestions.some(sq => sq.questionId === q.id))
                    .map(q => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.difficulty})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              {selectedQuestions.map((q, idx) => (
                <div
                  key={q.questionId}
                  className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-gray-800 text-gray-400 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white">{q.title}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-gray-400">Marks:</span>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => handleUpdateMarks(q.questionId, e.target.value)}
                        min="1"
                        max="100"
                        className="w-16 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.questionId)}
                      className="p-1 text-gray-500 hover:text-rose-400"
                      title="Remove from assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <Link
              to="/faculty/assessments"
              className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Assessment...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
