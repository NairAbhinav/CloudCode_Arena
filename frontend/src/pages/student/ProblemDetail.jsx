import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { questionsApi, submissionsApi } from '../../api/client';
import CodeEditor from '../../components/CodeEditor';
import OutputPanel from '../../components/OutputPanel';
import { STARTER_TEMPLATES, DEFAULT_LANGUAGES } from '../../utils/languageTemplates';
import { ArrowLeft, BookOpen, AlertCircle, AlertTriangle, Loader2, Award } from 'lucide-react';

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [language, setLanguage] = useState('python');
  const [codePerLang, setCodePerLang] = useState({});
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState('');

  // 3-Attempt limit tracking
  const [attemptCount, setAttemptCount] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  useEffect(() => {
    async function loadQuestionAndHistory() {
      try {
        const [qRes, histRes] = await Promise.all([
          questionsApi.get(id),
          submissionsApi.getMyHistory({ questionId: id, limit: 100 })
        ]);

        if (qRes.data.success) {
          const q = qRes.data.question;
          setQuestion(q);
          const initialCode = q.starterCode || STARTER_TEMPLATES.python;
          setCode(initialCode);
          setCodePerLang({ python: initialCode });

          const publicCases = (q.sampleTestCases && q.sampleTestCases.length > 0)
            ? q.sampleTestCases
            : (q.testCases && q.testCases.length > 0 ? q.testCases : []);
          if (publicCases.length > 0) {
            setCustomInput(publicCases[0].input || '');
          }

          // Check previous attempts
          if (histRes.data?.success) {
            const count = histRes.data.total ?? histRes.data.submissions.length;
            setAttemptCount(count);
            if (count >= 3) {
              navigate('/student/dashboard', {
                replace: true,
                state: {
                  message: `You have reached the maximum 3 attempts for problem "${q.title}". Redirected to dashboard.`
                }
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load question details:', err);
        setError('Failed to load problem. Please verify problem ID.');
      } finally {
        setLoading(false);
      }
    }

    loadQuestionAndHistory();
  }, [id, navigate]);

  // Countdown timer for automatic redirect after 3rd attempt
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      navigate('/student/dashboard', {
        state: {
          message: `Maximum attempts (3/3) reached for "${question?.title || 'problem'}". Redirected to dashboard.`
        }
      });
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate, question]);

  const handleLanguageChange = (newLang) => {
    // Preserve current code for current language
    setCodePerLang((prev) => ({ ...prev, [language]: code }));
    setLanguage(newLang);

    if (codePerLang[newLang]) {
      setCode(codePerLang[newLang]);
    } else if (newLang === 'python' && question?.starterCode) {
      setCode(question.starterCode);
    } else {
      setCode(STARTER_TEMPLATES[newLang] || '');
    }
  };

  const handleReset = () => {
    if (language === 'python' && question?.starterCode) {
      setCode(question.starterCode);
    } else {
      setCode(STARTER_TEMPLATES[language] || '');
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await submissionsApi.runCode({
        code,
        input: customInput,
        timeoutMs: 5000,
        language
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

  const handleSubmitSolution = async () => {
    if (attemptCount >= 3) {
      navigate('/student/dashboard', {
        state: {
          message: `You have already used all 3 attempts for "${question?.title}". Redirected to dashboard.`
        }
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);
    try {
      const res = await submissionsApi.submit({
        questionId: id,
        code,
        language
      });

      if (res.data.success) {
        setSubmissionResult(res.data.submission);
        const nextAttempt = attemptCount + 1;
        setAttemptCount(nextAttempt);

        // If this was the 3rd attempt, trigger redirect countdown
        if (nextAttempt >= 3) {
          setRedirectCountdown(3);
        }
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.error || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading problem environment...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Problem Not Available</h2>
        <p className="text-xs text-gray-400 mb-6">{error || 'Could not find the requested problem.'}</p>
        <Link
          to="/student/problems"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Problems</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col overflow-hidden bg-[#0b0f19] relative">
      {/* 3rd Attempt Redirect Modal / Overlay */}
      {redirectCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161f30] border border-amber-500/40 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Maximum Attempts Reached (3/3)</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              You have completed all 3 submission attempts for <strong className="text-indigo-400">{question.title}</strong>.
            </p>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              Redirecting to student dashboard in <span className="text-white font-mono font-bold text-base">{redirectCountdown}</span>s...
            </div>
            <button
              onClick={() =>
                navigate('/student/dashboard', {
                  state: {
                    message: `Maximum attempts (3/3) reached for "${question.title}". Redirected to dashboard.`
                  }
                })
              }
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      )}

      {/* Top Banner / Breadcrumb */}
      <div className="bg-[#111827] border-b border-gray-800 px-4 lg:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/student/problems"
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Back to Problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-bold text-white">{question.title}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              question.difficulty === 'Easy'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : question.difficulty === 'Medium'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {question.difficulty}
          </span>

          {/* Attempt counter pill */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              attemptCount >= 2
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            Attempts: {attemptCount} / 3
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {question.topicTags?.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Main Split Screen Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-3 gap-3">
        {/* Left Side: Problem Statement & Testcases (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-y-auto glass-panel rounded-2xl p-5 border border-gray-800 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-2">Description</h2>
            <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
              {question.description}
            </div>
          </div>

          {question.inputFormat && (
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Input Format</h3>
              <div className="text-xs text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap">
                {question.inputFormat}
              </div>
            </div>
          )}

          {question.outputFormat && (
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Output Format</h3>
              <div className="text-xs text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap">
                {question.outputFormat}
              </div>
            </div>
          )}

          {question.constraints && (
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Constraints</h3>
              <div className="text-xs text-gray-400 font-mono bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                {question.constraints}
              </div>
            </div>
          )}

          {/* Public / Sample Test Cases */}
          {((question.sampleTestCases && question.sampleTestCases.length > 0) || (question.testCases && question.testCases.length > 0)) && (
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Public Test Cases
              </h3>
              <div className="space-y-3">
                {(question.sampleTestCases && question.sampleTestCases.length > 0 ? question.sampleTestCases : question.testCases).map((tc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      Public Case #{idx + 1}
                    </span>
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Input:</div>
                      <div className="p-2 rounded bg-black/40 font-mono text-xs text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
                        {tc.input || '(empty)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Expected Output:</div>
                      <div className="p-2 rounded bg-black/40 font-mono text-xs text-emerald-400 mt-0.5 whitespace-pre-wrap break-words">
                        {tc.output ?? tc.expectedOutput}
                      </div>
                    </div>
                    {tc.explanation && (
                      <p className="text-[11px] text-gray-400 italic mt-1 font-sans">
                        Explanation: {tc.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Monaco Editor + Output/Results (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col gap-3 overflow-hidden">
          {/* Top Half: Code Editor */}
          <div className="flex-[3] min-h-[300px] overflow-hidden">
            <CodeEditor
              code={code}
              onChange={setCode}
              onReset={handleReset}
              onRun={handleRunCode}
              onSubmit={handleSubmitSolution}
              language={language}
              onLanguageChange={handleLanguageChange}
              supportedLanguages={question.supportedLanguages || DEFAULT_LANGUAGES}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              readOnly={attemptCount >= 3}
            />
          </div>

          {/* Bottom Half: Output & Evaluation Results */}
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
