import React from 'react';

/**
 * SectionHeader
 * Clean, bold technical section heading adhering strictly to craft-floor guidelines:
 * Bans prohibited eyebrow/kicker labels above headings and establishes strong hierarchy.
 */
export default function SectionHeader({
  title,
  description,
  action,
  icon: Icon,
  className = ''
}) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-3 border-b border-slate-800/80 ${className}`}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-cyan-400">
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
