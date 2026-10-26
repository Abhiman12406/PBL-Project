import React from 'react';

/**
 * StatusBadge
 * High-legibility status indicators meeting craft-floor contrast standards.
 * Supports operational status aliases, glowing beacon dots, and size variants.
 *
 * @param {React.ReactNode} [children]
 * @param {'neutral'|'emerald'|'amber'|'rose'|'cyan'|'violet'|'orange'} [variant='neutral']
 * @param {string} [status] Alias for variant ('nominal', 'warning', 'critical', 'active', etc.)
 * @param {'xs'|'sm'|'md'} [size='md']
 * @param {boolean} [dot=true]
 * @param {boolean} [pulse=true]
 * @param {string} [className]
 */
export function StatusBadge({
  children,
  variant = 'neutral',
  status,
  size = 'md',
  dot = true,
  pulse = true,
  className = '',
  ...props
}) {
  const statusToVariant = (input) => {
    if (!input) return 'neutral';
    const key = String(input).toLowerCase();
    if (['nominal', 'success', 'ok', 'cleared', 'online', 'emerald'].includes(key)) return 'emerald';
    if (['warning', 'warn', 'alert', 'caution', 'amber', 'solar'].includes(key)) return 'amber';
    if (['critical', 'danger', 'hazard', 'error', 'offline', 'fail', 'rose', 'coral'].includes(key)) return 'rose';
    if (['active', 'live', 'telematics', 'info', 'cyan'].includes(key)) return 'cyan';
    if (['compliance', 'customs', 'violet', 'purple'].includes(key)) return 'violet';
    if (['safety', 'orange'].includes(key)) return 'orange';
    return 'neutral';
  };

  const resolvedVariant = status ? statusToVariant(status) : statusToVariant(variant);

  const variantStyles = {
    neutral: 'bg-slate-900/90 text-slate-200 border-slate-700/80',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50',
    violet: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
    orange: 'bg-orange-950/80 text-orange-300 border-orange-500/50'
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    cyan: 'bg-cyan-400',
    violet: 'bg-purple-400',
    orange: 'bg-orange-400'
  };

  const dotGlowShadows = {
    neutral: 'shadow-[0_0_6px_rgba(148,163,184,0.5)]',
    emerald: 'shadow-[0_0_8px_rgba(16,185,129,0.85)]',
    amber: 'shadow-[0_0_8px_rgba(245,158,11,0.85)]',
    rose: 'shadow-[0_0_8px_rgba(244,63,94,0.85)]',
    cyan: 'shadow-[0_0_8px_rgba(6,182,212,0.85)]',
    violet: 'shadow-[0_0_8px_rgba(168,85,247,0.85)]',
    orange: 'shadow-[0_0_8px_rgba(255,84,0,0.85)]'
  };

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 font-mono tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-mono tracking-wider',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-mono tracking-wide'
  };

  const displayText = children ?? (status || variant);

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-md border font-semibold uppercase select-none ${variantStyles[resolvedVariant] || variantStyles.neutral} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
          {pulse && resolvedVariant !== 'neutral' && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColors[resolvedVariant] || dotColors.neutral}`}
            />
          )}
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColors[resolvedVariant] || dotColors.neutral} ${dotGlowShadows[resolvedVariant] || ''}`}
          />
        </span>
      )}
      <span>{displayText}</span>
    </span>
  );
}

export default StatusBadge;
