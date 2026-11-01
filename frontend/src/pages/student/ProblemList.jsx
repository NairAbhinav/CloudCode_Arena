import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionsApi } from '../../api/client';
import { Search, Filter, CheckCircle2, ChevronRight, Loader2, BookOpen } from 'lucide-react';

export default function ProblemList() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const topics = ['Math', 'Strings', 'Arrays', 'Algorithms', 'Basics', 'Recursion'];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionsApi.list({
        search: search || undefined,
        difficulty: difficulty || undefined,
        topic: selectedTopic || undefined,
        page,
        limit: 12
      });

      if (res.data.success) {
        setQuestions(res.data.questions);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, difficulty, selectedTopic]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            <span>Coding Practice Bank</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Solve curated algorithm challenges in Python 3. Test your code against sample and hidden test cases.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 border border-gray-700 w-fit">
          {total} Problems Available
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-gray-800 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems by title or keyword..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Difficulty:</span>
            </span>
            {['', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => { setDifficulty(diff); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  difficulty === diff
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60'
                }`}
              >
                {diff || 'All Difficulties'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 font-semibold mr-1">Topic:</span>
            <button
              onClick={() => { setSelectedTopic(''); setPage(1); }}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedTopic === ''
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Topics
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => { setSelectedTopic(t); setPage(1); }}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                  selectedTopic === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problem Cards List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-xs text-gray-400">Loading problem bank...</p>
        </div>
      ) : questions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="glass-card rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      q.difficulty === 'Easy'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : q.difficulty === 'Medium'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {q.difficulty}
                  </span>

                  {q.isSolved && (
                    <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Solved</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1.5">
                  {q.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                  {q.description}
                </p>

                {/* Topic tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {q.topicTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-gray-800/80 text-[10px] text-gray-300 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-mono">Python 3</span>
                <Link
                  to={`/student/problems/${q.id}`}
                  className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
                >
                  <span>Solve Problem</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-2xl border border-gray-800">
          <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-300">No problems found</h3>
          <p className="text-xs text-gray-500 mt-1">Try clearing your search or adjusting the filters.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-4">
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
    </div>
  );
}
