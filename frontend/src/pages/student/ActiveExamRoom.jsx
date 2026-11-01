import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentsApi, submissionsApi, anticheatApi } from '../../api/client';
import CodeEditor from '../../components/CodeEditor';
import OutputPanel from '../../components/OutputPanel';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { STARTER_TEMPLATES, DEFAULT_LANGUAGES } from '../../utils/languageTemplates';

export default function ActiveExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [codes, setCodes] = useState({}); // questionId -> code string
  const [languages, setLanguages] = useState({}); // questionId -> language string
  const [customInput, setCustomInput] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Anti-cheating state
  const [violationsCount, setViolationsCount] = useState(0);
  const [lastWarning, setLastWarning] = useState('');
  const [isTerminated, setIsTerminated] = useState(false);

  const attemptRef = useRef(null);
  attemptRef.current = attempt;

  // 1. Initial Load of Assessment & Active Attempt
  useEffect(() => {
    async function initRoom() {
      try {
        const [aRes, attRes] = await Promise.all([
          assessmentsApi.get(id),
          assessmentsApi.getActiveAttempt(id)
        ]);

        if (aRes.data.success) {
          const aData = aRes.data.assessment;
          setAssessment(aData);

          // Populate initial starter codes
          const initialCodes = {};
          aData.questions?.forEach((q) => {
            initialCodes[q.questionId] = q.starterCode || '# Write your solution in Python 3\n';
          });
          setCodes(initialCodes);
        }

        if (attRes.data.success) {
          const att = attRes.data.attempt;
          setAttempt(att);
          setViolationsCount(att.violationsCount || 0);
          if (att.status === 'terminated') {
            setIsTerminated(true);
            navigate('/student/dashboard', {
              replace: true,
              state: {
                message: `Assessment attempt TERMINATED: ${att.disqualificationReason || 'Anti-cheating violation threshold exceeded'}. Redirected to dashboard.`
              }
            });
            return;
          }
          const secs = Math.max(0, Math.floor((attRes.data.remainingMinutes || 0) * 60));
          setRemainingSeconds(secs);
        }
      } catch (err) {
        console.error('Failed to initialize assessment room:', err);
        navigate('/student/dashboard', {
          replace: true,
          state: {
            message: err.response?.data?.error || 'No active assessment attempt found. Redirected to dashboard.'
          }
        });
      } finally {
        setLoading(false);
      }
    }

    initRoom();
  }, [id, navigate]);

  // 2. Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0 || isTerminated) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit('Time has expired for this assessment.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, isTerminated]);

  // 3. Anti-Cheating Event Listeners & Immediate Termination Redirect
  useEffect(() => {
    if (!assessment || !assessment.antiCheatingConfig?.enabled || isTerminated) {
      return;
    }

    const config = assessment.antiCheatingConfig;

    const recordViolation = async (eventType, metadata = {}) => {
      if (!attemptRef.current || attemptRef.current.status !== 'in_progress') return;

      try {
        const res = await anticheatApi.recordEvent({
          assessmentId: id,
          attemptId: attemptRef.current._id,
          eventType,
          metadata
        });

        if (res.data.success) {
          setViolationsCount(res.data.violationsCount);
          if (res.data.isTerminated || res.data.actionTaken === 'terminated') {
            setIsTerminated(true);
            navigate('/student/dashboard', {
              replace: true,
              state: {
                message: `Assessment attempt TERMINATED IMMEDIATELY: Exceeded allowed violation threshold (${res.data.violationsCount}/${res.data.maxViolations || 3}). Redirected to dashboard.`
              }
            });
            return;
          }
          if (res.data.actionTaken === 'warning') {
            setLastWarning(
              `Integrity Warning: ${eventType.replace('_', ' ')} detected! (${res.data.violationsCount}/${res.data.maxViolations} warnings)`
            );
          } else if (res.data.actionTaken === 'flagged') {
            setLastWarning(
              `Integrity Alert: Threshold reached (${res.data.violationsCount}/${res.data.maxViolations}). Attempt FLAGGED for faculty review.`
            );
          }
        }
      } catch (err) {
        console.error('Failed to report monitoring event:', err.message);
      }
    };

    // Tab switch listener
    const handleVisibilityChange = () => {
      if (document.hidden && config.trackTabSwitches) {
        recordViolation('tab_switch', { hiddenAt: new Date().toISOString() });
      }
    };

    // Focus loss listener
    const handleBlur = () => {
      if (config.trackFocusLoss) {
        recordViolation('focus_loss', { blurredAt: new Date().toISOString() });
      }
    };

    // Fullscreen exit listener
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && config.trackFullscreenExit) {
        recordViolation('fullscreen_exit', { timestamp: new Date().toISOString() });
      }
    };

    // Clipboard external paste listener
    const handlePaste = (e) => {
      if (config.trackClipboard) {
        const target = e.target;
        const isInsideEditor = target && target.closest && target.closest('.monaco-editor');
        if (!isInsideEditor) {
          recordViolation('paste_external', {
            pastedAt: new Date().toISOString()
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('paste', handlePaste);
    };
  }, [assessment, id, isTerminated, navigate]);

  // 4. Real-time Polling for Remote Termination by Faculty
  useEffect(() => {
    if (isTerminated || loading) return;

    const pollInterval = setInterval(async () => {
      try {
        const attRes = await assessmentsApi.getActiveAttempt(id);
        if (attRes.data?.success) {
          const att = attRes.data.attempt;
          if (att.status === 'terminated') {
            setIsTerminated(true);
            clearInterval(pollInterval);
            navigate('/student/dashboard', {
              replace: true,
              state: {
                message: `Assessment attempt TERMINATED by instructor: ${att.disqualificationReason || 'Attempt terminated by faculty.'}. Redirected to dashboard.`
              }
            });
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setIsTerminated(true);
          clearInterval(pollInterval);
          navigate('/student/dashboard', {
            replace: true,
            state: {
              message: 'Assessment attempt has ended or was terminated. Redirected to dashboard.'
            }
          });
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [id, isTerminated, loading, navigate]);

  const currentQuestion = assessment?.questions?.[currentQuestionIndex];
  const currentLanguage = (currentQuestion && languages[currentQuestion.questionId]) || 'python';
  const currentCode = (currentQuestion && codes[currentQuestion.questionId]) || '';

  const handleCodeChange = (newCode) => {
    if (currentQuestion) {
      setCodes((prev) => ({
        ...prev,
        [currentQuestion.questionId]: newCode
      }));
    }
  };

  const handleLanguageChange = (newLang) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.questionId;
    setLanguages((prev) => ({ ...prev, [qId]: newLang }));
    setCodes((prev) => ({
      ...prev,
      [qId]: STARTER_TEMPLATES[newLang] || ''
    }));
  };

  const handleReset = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.questionId;
    const lang = languages[qId] || 'python';
    if (lang === 'python' && currentQuestion.starterCode) {
      setCodes((prev) => ({ ...prev, [qId]: currentQuestion.starterCode }));
    } else {
      setCodes((prev) => ({ ...prev, [qId]: STARTER_TEMPLATES[lang] || '' }));
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await submissionsApi.runCode({
        code: currentCode,
        input: customInput || (currentQuestion?.sampleTestCases?.[0]?.input ?? currentQuestion?.testCases?.[0]?.input ?? ''),
        timeoutMs: 5000,
        language: currentLanguage
      });
      if (res.data.success) {
        setRunResult(res.data);
      }
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        stdout: '',
        stderr: err.response?.data?.error || err.message,
        executionTimeMs: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!currentQuestion) return;
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await submissionsApi.submit({
        questionId: currentQuestion.questionId,
        assessmentId: id,
        code: currentCode,
        language: currentLanguage
      });
      if (res.data.success) {
        setSubmissionResult(res.data.submission);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit problem solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async (reason) => {
    try {
      await assessmentsApi.submitAttempt(id);
      alert(reason || 'Assessment submitted.');
      navigate(`/student/assessments`);
    } catch (e) {
      navigate('/student/assessments');
    }
  };

  const handleFinishAssessment = async () => {
    const confirm = window.confirm(
      'Are you sure you want to finish and submit the assessment? You cannot make further edits once submitted.'
    );
    if (!confirm) return;

    setIsFinishing(true);
    try {
      const res = await assessmentsApi.submitAttempt(id);
      if (res.data.success) {
        alert('Assessment submitted successfully!');
        navigate(`/student/assessments`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to finalize assessment attempt.');
    } finally {
      setIsFinishing(false);
    }
  };

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f19]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading secure exam room...</p>
      </div>
    );
  }

  const formatTimer = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] select-text">
      {/* Top Proctored Exam Bar */}
      <header className="bg-[#111827] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>EXAM IN PROGRESS</span>
          </div>
          <span className="text-sm font-bold text-white hidden sm:inline">{assessment?.title}</span>
        </div>

        {/* Center: Realtime Countdown Timer */}
        <div className="flex items-center space-x-2 bg-gray-900 border border-indigo-500/30 px-3.5 py-1 rounded-xl shadow-inner">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-extrabold font-mono text-white tracking-widest">
            {formatTimer(remainingSeconds)}
          </span>
        </div>

        {/* Right: Fullscreen trigger & Finish Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={requestFullscreen}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleFinishAssessment}
            disabled={isFinishing || isTerminated}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isFinishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Finish & Submit</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Warning Alert Banner (if anti-cheating violations detected) */}
      {lastWarning && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between font-semibold ${
            isTerminated
              ? 'bg-rose-900/90 text-rose-200 border-b border-rose-700'
              : 'bg-amber-900/80 text-amber-200 border-b border-amber-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{lastWarning}</span>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
            Violations: {violationsCount}
          </span>
        </div>
      )}

      {/* Question Selector Tabs */}
      <div className="bg-[#161f30] px-4 py-2 border-b border-gray-800 flex items-center space-x-2 overflow-x-auto">
        <span className="text-xs text-gray-400 font-semibold mr-2 flex-shrink-0">Questions:</span>
        {assessment?.questions?.map((q, idx) => (
          <button
            key={q.questionId}
            onClick={() => {
              setCurrentQuestionIndex(idx);
              setRunResult(null);
              setSubmissionResult(null);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 flex items-center space-x-1.5 ${
              currentQuestionIndex === idx
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
          >
            <span>Q{idx + 1}</span>
            <span className="text-[10px] text-indigo-300 font-normal">({q.marks} pts)</span>
          </button>
        ))}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-3 gap-3">
        {/* Left Side: Question Details (5 cols) */}
        <div className="lg:col-span-5 h-[calc(100vh-175px)] overflow-y-auto glass-panel rounded-2xl p-5 border border-gray-800 space-y-5">
          {currentQuestion ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-extrabold text-white">
                    {currentQuestionIndex + 1}. {currentQuestion.title}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    {currentQuestion.marks} Marks
                  </span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                  {currentQuestion.description}
                </div>
              </div>

              {currentQuestion.inputFormat && (
                <div>
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Input Format
                  </h3>
                  <div className="text-xs text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap">
                    {currentQuestion.inputFormat}
                  </div>
                </div>
              )}

              {currentQuestion.outputFormat && (
                <div>
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Output Format
                  </h3>
                  <div className="text-xs text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap">
                    {currentQuestion.outputFormat}
                  </div>
                </div>
              )}

              {currentQuestion.constraints && (
                <div>
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Constraints
                  </h3>
                  <div className="text-xs text-gray-400 font-mono bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                    {currentQuestion.constraints}
                  </div>
                </div>
              )}

              {/* Public / Sample Cases */}
              {((currentQuestion.sampleTestCases && currentQuestion.sampleTestCases.length > 0) || (currentQuestion.testCases && currentQuestion.testCases.length > 0)) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Public Test Cases
                  </h3>
                  <div className="space-y-3">
                    {(currentQuestion.sampleTestCases && currentQuestion.sampleTestCases.length > 0 ? currentQuestion.sampleTestCases : currentQuestion.testCases).map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-400">
                          Public Case #{idx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Input:</span>
                          <div className="p-2 rounded bg-black/40 font-mono text-xs text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
                            {tc.input || '(empty)'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Expected Output:</span>
                          <div className="p-2 rounded bg-black/40 font-mono text-xs text-emerald-400 mt-0.5 whitespace-pre-wrap break-words">
                            {tc.output ?? tc.expectedOutput}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">No question selected.</div>
          )}
        </div>

        {/* Right Side: Monaco Editor + Evaluation Console (7 cols) */}
        <div className="lg:col-span-7 h-[calc(100vh-175px)] flex flex-col gap-3 overflow-hidden">
          {/* Monaco Editor */}
          <div className="flex-[3] min-h-[300px] overflow-hidden">
            <CodeEditor
              code={currentCode}
              onChange={handleCodeChange}
              onReset={handleReset}
              onRun={handleRunCode}
              onSubmit={handleSubmitQuestion}
              language={currentLanguage}
              onLanguageChange={handleLanguageChange}
              supportedLanguages={currentQuestion?.supportedLanguages || DEFAULT_LANGUAGES}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              readOnly={isTerminated}
            />
          </div>

          {/* Test & Console Output */}
          <div className="flex-[2] min-h-[220px] overflow-hidden">
            <OutputPanel
              runResult={runResult}
              submissionResult={submissionResult}
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
