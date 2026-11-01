import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/client';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBoard() {
      try {
        const res = await reportsApi.getLeaderboard();
        if (res.data.success) {
          setLeaderboard(res.data.leaderboard);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-sm shadow-md shadow-amber-500/20">
          <Trophy className="w-4 h-4 fill-amber-400 text-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40 flex items-center justify-center font-bold text-sm shadow-md shadow-slate-300/20">
          <Medal className="w-4 h-4 text-slate-300" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center font-bold text-sm">
          <Award className="w-4 h-4 text-amber-600" />
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center font-mono font-bold text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-amber-500/20">
          <Trophy className="w-7 h-7 text-gray-950 fill-gray-950" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Arena Leaderboard</h1>
        <p className="text-xs text-gray-400 mt-2">
          Rankings are calculated based on distinct problems solved, overall test scores earned, and earliest submission timestamps.
        </p>
      </div>

      <div className="glass-panel rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading standings...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold w-20 text-center">Rank</th>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold text-center">Problems Solved</th>
                  <th className="px-6 py-4 font-semibold text-center">Total Points</th>
                  <th className="px-6 py-4 font-semibold text-right">Latest Solved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {leaderboard.map((user) => (
                  <tr
                    key={user.userId}
                    className={`hover:bg-gray-800/20 transition-colors ${
                      user.rank <= 3 ? 'bg-indigo-950/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 flex justify-center">{getRankBadge(user.rank)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{user.name}</div>
                      <div className="text-[11px] text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-indigo-400 text-sm">
                      {user.problemsSolved}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-emerald-400 text-sm">
                      {user.totalScore}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-[11px]">
                      {new Date(user.latestSolvedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500 text-xs">
            No submissions registered yet on the leaderboard.
          </div>
        )}
      </div>
    </div>
  );
}
