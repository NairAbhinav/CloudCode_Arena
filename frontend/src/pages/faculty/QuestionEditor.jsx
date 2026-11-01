import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { questionsApi } from '../../api/client';
import { ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function QuestionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [topicTags, setTopicTags] = useState('Math, Basics');
  const [starterCode, setStarterCode] = useState(
    '# Write your solution in Python 3\nimport sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n'
  );
  const [visibility, setVisibility] = useState('faculty');
  const [testCases, setTestCases] = useState([
    { input: '', expectedOutput: '', isHidden: false },
    { input: '', expectedOutput: '', isHidden: true }
  ]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      async function load() {
        try {
          const res = await questionsApi.get(id);
          if (res.data.success) {
            const q = res.data.question;
            setTitle(q.title || '');
            setDescription(q.description || '');
            setInputFormat(q.inputFormat || '');
            setOutputFormat(q.outputFormat || '');
            setConstraints(q.constraints || '');
            setDifficulty(q.difficulty || 'Easy');
            setTopicTags(q.topicTags ? q.topicTags.join(', ') : '');
            setStarterCode(q.starterCode || '');
            setVisibility(q.visibility || 'faculty');
            if (q.testCases && q.testCases.length > 0) {
              setTestCases(q.testCases);
            }
          }
        } catch (err) {
          setError('Failed to load question details.');
        } finally {
          setLoading(false);
        }
      }
      load();
    }
  }, [id, isEditing]);

  const addTestCase = (isHidden = false) => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isHidden }]);
  };

  const removeTestCase = (index) => {
    setTestCases(testCases.filter((_, idx) => idx !== index));
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (testCases.length === 0) {
      setError('You must include at least one test case.');
      return;
    }

    // Check if any test case has empty expected output
    for (let i = 0; i < testCases.length; i++) {
      if (!String(testCases[i].expectedOutput).trim()) {
        setError(`Test case #${i + 1} has an empty expected output.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        inputFormat,
        outputFormat,
        constraints,
        difficulty,
        topicTags: topicTags.split(',').map(t => t.trim()).filter(Boolean),
        starterCode,
        visibility,
        testCases
      };

      if (isEditing) {
        await questionsApi.update(id, payload);
      } else {
        await questionsApi.create(payload);
      }

      navigate('/faculty/questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading problem editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <Link
        to="/faculty/questions"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Question Bank</span>
      </Link>

      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-gray-800 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isEditing ? 'Edit Coding Problem' : 'Create New Coding Problem'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Specify problem details, constraints, starter code, and rigorous automated test cases.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Problem Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sum of Two Numbers"
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Problem Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task, algorithms involved, and requirements clearly..."
              rows={4}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Formats & Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Input Format
              </label>
              <textarea
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                placeholder="e.g. Two space-separated integers a and b."
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Output Format
              </label>
              <textarea
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="e.g. Print a single integer representing the sum."
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Constraints
              </label>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. -10^9 <= a, b <= 10^9"
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Topic Tags & Starter Code */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Topic Tags (Comma-separated)
            </label>
            <input
              type="text"
              value={topicTags}
              onChange={(e) => setTopicTags(e.target.value)}
              placeholder="e.g. Math, Strings, Algorithms"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Python 3 Starter Code Template
            </label>
            <textarea
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              rows={5}
              className="w-full bg-gray-950 font-mono text-xs border border-gray-700 rounded-xl p-3 text-gray-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Test Cases Section */}
          <div className="pt-4 border-t border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Automated Test Cases
                </h3>
                <p className="text-[11px] text-gray-400">
                  Hidden test cases are strictly verified on the server and never revealed to students.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => addTestCase(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Public Case</span>
                </button>
                <button
                  type="button"
                  onClick={() => addTestCase(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Hidden Case</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    tc.isHidden
                      ? 'bg-indigo-950/20 border-indigo-500/30'
                      : 'bg-gray-900/60 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <span>Test Case #{idx + 1}</span>
                      {tc.isHidden ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Hidden Case
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Public Case
                        </span>
                      )}
                    </span>

                    <div className="flex items-center space-x-3">
                      <label className="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => updateTestCase(idx, 'isHidden', e.target.checked)}
                          className="rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Hidden</span>
                      </label>

                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="text-gray-500 hover:text-rose-400 p-1"
                          title="Remove test case"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                        Input
                      </label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder="Standard input string"
                        rows={2}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-2 font-mono text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                        Expected Output *
                      </label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                        placeholder="Expected output string"
                        rows={2}
                        required
                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-2 font-mono text-xs text-emerald-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <Link
              to="/faculty/questions"
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
                  <span>Saving Problem...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Problem'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
