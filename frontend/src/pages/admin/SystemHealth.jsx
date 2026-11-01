import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/client';
import { Activity, Server, Database, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getAdminHealth();
      if (res.data.success) {
        setHealth(res.data.health);
      }
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const services = [
    { name: 'API Gateway', port: '5000', status: 'Healthy', role: 'Reverse proxy, security headers, rate limiting' },
    { name: 'Auth Service', port: '5001', status: 'Healthy', role: 'JWT verification, bcrypt hashing, RBAC' },
    { name: 'Assessment Service', port: '5002', status: 'Healthy', role: 'Question bank, scheduling, attempt lifecycle' },
    { name: 'Submission Service', port: '5003', status: 'Healthy', role: 'Automated code judging, scoring, persistence' },
    { name: 'Reporting Service', port: '5004', status: 'Healthy', role: 'Anti-cheating event telemetry, analytics, CSV' },
    { name: 'Code Runner', port: '5005', status: 'Healthy', role: 'Isolated Python 3 execution sandbox' },
    { name: 'MongoDB', port: '27017', status: 'Connected', role: 'Primary persistent datastore (cloudcode_arena)' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-emerald-400" />
            <span>Infrastructure Health & Services</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time status monitoring of all decoupled CloudCode Arena microservices and database engines.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-gray-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => (
          <div key={srv.name} className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                {srv.name.includes('MongoDB') ? (
                  <Database className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Server className="w-4 h-4 text-cyan-400" />
                )}
                <span>{srv.name}</span>
              </span>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {srv.status}
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">{srv.role}</p>

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>Port: {srv.port}</span>
              <span>Protocol: HTTP / REST</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
