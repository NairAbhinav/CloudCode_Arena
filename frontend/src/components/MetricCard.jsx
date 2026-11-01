import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      iconText: 'text-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300'
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      iconText: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-300'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconText: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconText: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300'
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      iconText: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300'
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`glass-card rounded-2xl p-5 border ${scheme.border} hover:border-gray-600 transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.iconText} group-hover:scale-110 transition-transform`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight mb-1">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
