import React from 'react';

/**
 * GlassCard
 * Cyber-Physical Obsidian Glass Container Primitive.
 * Features precision 1px borders, subtle soft depth, and backdrop blur.
 *
 * @param {React.ReactNode} children
 * @param {string} [className]
 * @param {'default'|'elevated'|'subtle'|'interactive'} [variant='default']
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [padding='md']
 * @param {function} [onClick]
 * @param {string|React.ElementType} [as='div']
 */
export function GlassCard({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  onClick,
  as: Component = 'div',
  onKeyDown,
  role,
  tabIndex,
  ...props
}) {
  const variantStyles = {
    default: 'bg-slate-950/85 border-slate-800/90 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.75)]',
    elevated: 'bg-slate-900/90 border-slate-700/80 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)]',
    subtle: 'bg-slate-950/45 border-slate-800/60 shadow-sm',
    interactive:
      'bg-slate-950/85 border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-900/80 active:scale-[0.99] cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60'
  };

  const paddingStyles = {
    none: 'p-0',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const isInteractive = Boolean(onClick) || variant === 'interactive';

  const handleKeyDown = (e) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }
    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <Component
      className={`rounded-xl border backdrop-blur-xl text-slate-100 ${variantStyles[variant] || variantStyles.default} ${paddingStyles[padding] || paddingStyles.md} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role || (isInteractive && Component === 'div' ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      {...props}
    >
      {children}
    </Component>
  );
}

export default GlassCard;
