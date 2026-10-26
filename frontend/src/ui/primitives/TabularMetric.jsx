import React from 'react';

/**
 * TabularMetric
 * High-precision tabular numerical metric display for live logistics telemetry and forecasts.
 * Strict tabular-nums alignment prevents horizontal jitter during 60 FPS live streaming.
 *
 * @param {string|number} value
 * @param {string} [unit='']
 * @param {string} [label]
 * @param {string|object} [delta] String or object { text, positive }
 * @param {object} [trend] Alias for delta object { text, positive }
 * @param {'positive'|'negative'|'neutral'} [deltaType='positive']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string} [subtext]
 * @param {string} [className]
 */
export function TabularMetric({
  value,
  unit = '',
  label,
  delta,
  trend,
  deltaType = 'positive',
  size = 'md',
  subtext,
  className = '',
  ...props
}) {
  const sizeStyles = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const deltaStyles = {
    positive: 'text-emerald-400 bg-emerald-950/70 border-emerald-600/50',
    negative: 'text-rose-400 bg-rose-950/70 border-rose-600/50',
    neutral: 'text-slate-400 bg-slate-900/70 border-slate-700/50'
  };

  // Resolve delta / trend payload
  const activeTrend = trend || (typeof delta === 'object' && delta !== null ? delta : null);
  const trendText = activeTrend ? (activeTrend.text ?? activeTrend.value) : delta;
  const isTrendPositive = activeTrend
    ? Boolean(activeTrend.positive ?? (typeof activeTrend.value === 'string' && activeTrend.value.startsWith('+')))
    : deltaType === 'positive';
  const resolvedDeltaType = activeTrend
    ? (isTrendPositive ? 'positive' : 'negative')
    : deltaType;

  const displayValue = value === null || value === undefined || value === '' ? '--' : value;

  return (
    <div
      className={`flex flex-col gap-0.5 ${className}`}
      aria-label={`${label ? `${label}: ` : ''}${displayValue} ${unit}`.trim()}
      {...props}
    >
      {label && <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{label}</span>}
      <div className="flex items-baseline gap-2">
        <span className={`font-mono font-bold tracking-tight text-white tabular-nums ${sizeStyles[size] || sizeStyles.md}`}>
          {displayValue}
          {unit && <span className="text-xs font-mono text-slate-400 font-normal ml-1 select-none">{unit}</span>}
        </span>
        {trendText && (
          <span
            className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border tabular-nums ${deltaStyles[resolvedDeltaType] || deltaStyles.neutral}`}
          >
            {activeTrend && (isTrendPositive ? '↑ ' : '↓ ')}
            {trendText}
          </span>
        )}
      </div>
      {subtext && <span className="text-[11px] font-mono text-slate-400">{subtext}</span>}
    </div>
  );
}

export default TabularMetric;
