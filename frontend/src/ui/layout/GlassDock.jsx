import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Navigation,
  FileCheck2,
  ShieldAlert,
  Globe,
  Cpu,
  Lock,
  Minus,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Compass
} from 'lucide-react';
import { DOCK_SERVICES } from '../../constants/dockConfig';
import { usePersona } from '../../context/PersonaContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const ICON_MAP = {
  kpis: BarChart3,
  forecasting: TrendingUp,
  routing: Navigation,
  compliance: FileCheck2,
  sentinel: ShieldAlert,
  twin: Globe,
  system: Cpu
};

export default function GlassDock() {
  const { currentRole, profile, switchPersona } = usePersona();
  const {
    windows,
    toggleWindow,
    isAllowed,
    minimizeAll,
    restoreAll,
    resetLayout,
    workspaceMode,
    activeDockedTab,
    setActiveDockedTab,
    toggleGuide
  } = useWorkspace();

  const [hoveredId, setHoveredId] = useState(null);
  const [lockedNotice, setLockedNotice] = useState(null);

  const handleDockClick = (service) => {
    const allowed = isAllowed(service.viewRequired);
    if (!allowed) {
      setLockedNotice({
        service: service.label,
        role: profile?.title || currentRole,
        viewRequired: service.viewRequired
      });
      setTimeout(() => setLockedNotice(null), 4000);
      return;
    }
    if (workspaceMode === 'docked') {
      setActiveDockedTab(service.id);
    } else {
      toggleWindow(service.id);
    }
  };

  // When in anchored cockpit mode, bottom controls are managed by BottomTelemetryBar
  if (workspaceMode !== 'floating') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-auto">
      {/* RBAC Lock Toast Notice */}
      {lockedNotice && (
        <div className="mb-3 cyber-glass rounded-xl px-4 py-2.5 border border-rose-500/60 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">{lockedNotice.service}</span> is locked for{' '}
            <span className="text-rose-300 font-bold">{lockedNotice.role}</span>.
          </div>
          <button
            onClick={() => {
              switchPersona('admin');
              setLockedNotice(null);
            }}
            className="text-[11px] font-bold px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm ml-1 cursor-pointer"
          >
            Switch to Admin
          </button>
          <button
            onClick={() => setLockedNotice(null)}
            className="text-slate-400 hover:text-white text-xs ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Frosted Glass Dock Toolbar */}
      <nav
        aria-label="Service Dock"
        className="cyber-glass-dock rounded-2xl px-3 py-2 flex items-center gap-1.5 sm:gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-slate-700/60 backdrop-blur-2xl"
      >
        {DOCK_SERVICES.map((service) => {
          const Icon = ICON_MAP[service.id] || BarChart3;
          const allowed = isAllowed(service.viewRequired);
          const win = windows[service.id];
          const isOpen = win?.isOpen;
          const isMinimized = win?.isMinimized;
          const isHovered = hoveredId === service.id;
          const isActive = workspaceMode === 'docked' ? activeDockedTab === service.id : isOpen;

          return (
            <div
              key={service.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredId(service.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-12 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-mono whitespace-nowrap shadow-xl pointer-events-none z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                  <span>{service.label}</span>
                  {!allowed && (
                    <span className="text-rose-400 flex items-center gap-0.5 text-[10px]">
                      <Lock className="w-2.5 h-2.5" /> (Locked)
                    </span>
                  )}
                  {service.badgeText && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {service.badgeText}
                    </span>
                  )}
                </div>
              )}

              {/* Dock Icon Button */}
              <button
                onClick={() => handleDockClick(service)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  !allowed
                    ? 'opacity-40 hover:opacity-75 bg-slate-900/60 border border-slate-800 text-slate-500'
                    : isActive
                    ? isMinimized && workspaceMode === 'floating'
                      ? 'bg-slate-800/80 border border-slate-600 text-slate-300 hover:text-white shadow-md'
                      : 'bg-slate-800/90 border border-cyan-500/70 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-900/80 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
                title={service.label}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>

              {/* Lock icon overlay for unauthorized services */}
              {!allowed && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-rose-400 pointer-events-none">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}

              {/* Active Open State Pill Marker */}
              {isActive && (
                <span
                  className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full transition-all pointer-events-none ${
                    isMinimized && workspaceMode === 'floating' ? 'bg-slate-500' : 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div className="w-[1px] h-7 bg-slate-700/60 mx-1" />

        {/* Global Workspace Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleGuide}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Open Feature Guide & Tour"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={minimizeAll}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Minimize all windows"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={resetLayout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Reset window layouts"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
