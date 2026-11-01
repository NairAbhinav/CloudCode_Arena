import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionsApi } from '../../api/client';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine'); // 'mine' or 'shared'
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionsApi.list({
        visibility: tab,
        search: search || undefined,
        difficulty: difficulty || undefined,
        limit: 50
      });
      if (res.data.success) {
        setQuestions(res.data.questions);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [tab, difficulty]);

  const handleTogglePublish = async (id) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await questionsApi.publish(id);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        fetchQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle publication status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
    try {
      const res = await questionsApi.delete(id);
      if (res.data.success) {
        setSuccessMsg('Question deleted successfully.');
        fetchQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete question.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-cyan-400" />
            <span>Question Management Bank</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Author custom coding problems, define public & hidden test cases, and publish questions.
          </p>
        </div>

        <Link
          to="/faculty/questions/new"
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Problem</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="glass-panel rounded-2xl p-4 border border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTab('mine')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'mine'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              My Questions
            </button>
            <button
              onClick={() => setTab('shared')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'shared'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Shared Question Bank
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
                placeholder="Search questions..."
                className="bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
              />
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading question bank...</p>
          </div>
        ) : questions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Title</th>
                  <th className="px-6 py-3.5 font-semibold">Difficulty</th>
                  <th className="px-6 py-3.5 font-semibold">Tags</th>
                  <th className="px-6 py-3.5 font-semibold">Visibility</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      <div>{q.title}</div>
                      <div className="text-[11px] text-gray-400 line-clamp-1">{q.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          q.difficulty === 'Easy'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : q.difficulty === 'Medium'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {q.topicTags?.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-gray-400 uppercase">
                      {q.visibility}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(q.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                          q.isPublished
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {q.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/faculty/questions/${q.id}/edit`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-300 hover:bg-gray-800 transition-colors inline-block"
                        title="Edit Question & Test Cases"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">
            No questions found in this view.
          </div>
        )}
      </div>
    </div>
  );
}
