import React from 'react';

/**
 * CyberButton
 * Accessible, tactile button with cyber-physical styling and focused micro-interactions.
 */
export default function CyberButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const variantStyles = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-slate-950 font-bold border-cyan-400/40 shadow-[0_4px_16px_rgba(6,182,212,0.3)]',
    secondary: 'bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-900 text-slate-200 border-slate-700/80 shadow-sm',
    accent: 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold border-orange-400/40 shadow-[0_4px_16px_rgba(255,84,0,0.3)]',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold border-emerald-400/40 shadow-[0_4px_16px_rgba(16,185,129,0.3)]',
    danger: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold border-rose-400/40 shadow-[0_4px_16px_rgba(244,63,94,0.3)]',
    ghost: 'bg-transparent hover:bg-slate-800/60 active:bg-slate-900 text-slate-300 border-transparent hover:border-slate-700'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
    md: 'text-xs px-3.5 py-2 gap-2 rounded-xl',
    lg: 'text-sm px-4 py-2.5 gap-2.5 rounded-xl'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium border transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />}
      <span>{children}</span>
    </button>
  );
}
