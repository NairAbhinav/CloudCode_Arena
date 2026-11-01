import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/client';
import { ShieldCheck, Search, Loader2 } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getAdminAuditLogs({
        search: search || undefined,
        action: action || undefined,
        page,
        limit: 20
      });
      if (res.data.success) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-rose-500" />
          <span>Platform Security Audit Logs</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Immutable audit trail capturing all administrative mutations, user authentications, and assessment actions.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            placeholder="Search by action or keyword..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
        >
          <option value="">All Actions</option>
          <option value="USER_LOGIN">User Login</option>
          <option value="USER_REGISTERED">User Registered</option>
          <option value="USER_ROLE_CHANGED">Role Changed</option>
          <option value="USER_STATUS_CHANGED">Status Changed</option>
          <option value="QUESTION_CREATED">Question Created</option>
          <option value="ASSESSMENT_CREATED">Assessment Created</option>
          <option value="ATTEMPT_STARTED">Attempt Started</option>
          <option value="ATTEMPT_SUBMITTED">Attempt Submitted</option>
          <option value="ADMIN_BOOTSTRAP">Admin Bootstrap</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading audit trail...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161f30] text-gray-300 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                  <th className="px-6 py-3.5 font-semibold">User</th>
                  <th className="px-6 py-3.5 font-semibold">Action</th>
                  <th className="px-6 py-3.5 font-semibold">Resource</th>
                  <th className="px-6 py-3.5 font-semibold">IP Address</th>
                  <th className="px-6 py-3.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-3.5 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-300 font-sans font-medium">
                      {log.userId?.name || 'Anonymous / System'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-rose-300 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-400">{log.resource}</td>
                    <td className="px-6 py-3.5 text-gray-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="px-6 py-3.5 text-gray-400 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500 text-xs">No audit logs recorded matching query.</div>
        )}
      </div>
    </div>
  );
}
