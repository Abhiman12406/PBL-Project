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
  ArrowRight,
  Maximize2,
  Minimize2,
  Compass,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DOCK_SERVICES } from '../../constants/dockConfig';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';
import ErrorBoundary from '../../components/ErrorBoundary';

import { KpisContent } from '../../modules/analytics';
import { ForecastingTab } from '../../modules/forecasting';
import { RoutingTab } from '../../modules/routing';
import { ComplianceTab } from '../../modules/compliance';
import { AutonomousSentinelHUD, DigitalTwinTab } from '../../modules/twin';
import { AdminRetrainContent } from '../../modules/admin';

const MODULE_ICONS = {
  kpis: BarChart3,
  forecasting: TrendingUp,
  routing: Navigation,
  compliance: FileCheck2,
  sentinel: ShieldAlert,
  twin: Globe,
  system: Cpu
};

export default function DockedWorkspaceView() {
  const {
    workspaceMode,
    setWorkspaceMode,
    activeDockedTab,
    setActiveDockedTab,
    isAllowed,
    toggleGuide
  } = useWorkspace();

  const { currentRole, profile, switchPersona } = usePersona();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (workspaceMode !== 'docked') return null;

  const currentService = DOCK_SERVICES.find((s) => s.id === activeDockedTab) || DOCK_SERVICES[0];
  const allowed = isAllowed(currentService.viewRequired);
  const CurrentIcon = MODULE_ICONS[currentService.id] || BarChart3;

  return (
    <div className="fixed top-16 left-4 bottom-20 z-30 flex pointer-events-auto transition-all duration-200">
      {/* Collapsed State Toggle Pill */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="self-center cyber-glass px-3 py-4 rounded-r-2xl border border-slate-700/80 shadow-2xl flex flex-col items-center gap-2 text-cyan-400 hover:text-white transition cursor-pointer"
          title="Expand Operational Panel"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase tracking-wider text-slate-300">
            {currentService.shortLabel || currentService.label}
          </span>
        </button>
      ) : (
        <div className="w-[calc(100vw-32px)] sm:w-[620px] md:w-[680px] lg:w-[740px] xl:w-[780px] cyber-glass rounded-2xl border border-slate-700/70 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-100">
          {/* Top Module Tab Switcher */}
          <div className="bg-slate-900/80 border-b border-slate-800/80 px-3 pt-2.5 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              {DOCK_SERVICES.map((service) => {
                const Icon = MODULE_ICONS[service.id] || BarChart3;
                const isSelected = activeDockedTab === service.id;
                const serviceAllowed = isAllowed(service.viewRequired);

                return (
                  <button
                    key={service.id}
                    onClick={() => setActiveDockedTab(service.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border border-slate-600 shadow-md shadow-slate-950/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                    title={service.description}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: isSelected ? service.themeColor : undefined }}
                    />
                    <span>{service.shortLabel || service.label}</span>
                    {!serviceAllowed && <Lock className="w-2.5 h-2.5 text-rose-400" />}
                  </button>
                );
              })}
            </div>

            {/* Panel Quick Actions */}
            <div className="flex items-center gap-1 shrink-0 pb-2 border-l border-slate-800 pl-2">
              <button
                onClick={toggleGuide}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition cursor-pointer"
                title="How this feature works"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setWorkspaceMode('floating')}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Switch to Floating Window Mode"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCollapsed(true)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Module Sub-Header */}
          <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: currentService.themeColor,
                  boxShadow: `0 0 10px ${currentService.themeColor}aa`
                }}
              />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{currentService.label}</span>
                  {currentService.badgeText && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                      {currentService.badgeText}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                  {currentService.description}
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden md:block">
              ACTIVE PERSONA: <strong className="text-white uppercase">{currentRole}</strong>
            </div>
          </div>

          {/* Active Feature Content View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 relative custom-scrollbar">
            <ErrorBoundary name={`Docked Feature: ${currentService.label}`}>
              {!allowed ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-base font-bold text-white">Access Restricted (RBAC)</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      The <span className="text-slate-200 font-semibold">{currentService.label}</span> service requires{' '}
                      <span className="font-mono text-cyan-400 font-bold">{currentService.viewRequired}</span> clearance.
                      Your current active role is{' '}
                      <span className="text-rose-400 font-semibold uppercase">{profile?.title || currentRole}</span>.
                    </p>
                  </div>
                  <button
                    onClick={() => switchPersona('admin')}
                    className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white flex items-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer"
                  >
                    <span>Elevate to Administrator</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {currentService.id === 'kpis' && <KpisContent />}
                  {currentService.id === 'forecasting' && <ForecastingTab personaProfile={profile} />}
                  {currentService.id === 'routing' && <RoutingTab />}
                  {currentService.id === 'compliance' && <ComplianceTab />}
                  {currentService.id === 'sentinel' && <AutonomousSentinelHUD />}
                  {currentService.id === 'twin' && <DigitalTwinTab />}
                  {currentService.id === 'system' && <AdminRetrainContent />}
                </>
              )}
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
