import React, { useState } from 'react';
import {
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Activity,
  Radio
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import { KpisContent } from '../../modules/analytics';
import { AutonomousSentinelHUD } from '../../modules/twin';

const TABS = [
  {
    id: 'kpis',
    label: 'Fleet KPIs',
    shortLabel: 'KPIs',
    icon: BarChart3,
    themeColor: '#ff5400',
    description: 'Macro fleet telemetry, delivery SLAs, and fuel efficiency'
  },
  {
    id: 'sentinel',
    label: 'AI Sentinel',
    shortLabel: 'Sentinel',
    icon: ShieldAlert,
    themeColor: '#06b6d4',
    description: 'Real-time incident detection, roadblocks, and autonomous detours'
  }
];

export default function LeftSituationalRail({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  activeTab: controlledTab,
  onTabChange,
  className = ''
}) {
  const { activeDockedTab, setActiveDockedTab } = useWorkspace() || {};

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalTab, setInternalTab] = useState('kpis');

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  // Resolve active tab: controlled prop -> workspace context if matching -> internal state
  const activeTab = controlledTab !== undefined
    ? controlledTab
    : (activeDockedTab === 'kpis' || activeDockedTab === 'sentinel')
    ? activeDockedTab
    : internalTab;

  const handleSelectTab = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalTab(tabId);
    }
    if (setActiveDockedTab) {
      setActiveDockedTab(tabId);
    }
    if (isCollapsed) {
      if (onToggleCollapse) {
        onToggleCollapse(false);
      } else {
        setInternalCollapsed(false);
      }
    }
  };

  // Collapsed compact rail
  if (isCollapsed) {
    return (
      <aside
        aria-label="Situational Awareness Rail (Collapsed)"
        className={`fixed top-16 left-3 bottom-20 z-30 flex flex-col pointer-events-auto transition-all duration-200 ${className}`}
      >
        <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-800 rounded-2xl py-3 px-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center gap-3">
          {/* Expand toggle */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            aria-label="Expand Situational Rail"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Expand Situational Rail"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-5 h-[1px] bg-slate-800" />

          {/* Quick tab icons */}
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                aria-label={`Open ${tab.label}`}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-slate-800/90 text-white border border-slate-700 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={tab.label}
              >
                <Icon
                  className="w-4 h-4"
                  style={{ color: isSelected ? tab.themeColor : undefined }}
                />
                {isSelected && (
                  <span
                    className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
                    style={{ backgroundColor: tab.themeColor }}
                  />
                )}
                {/* Floating tooltip */}
                <span className="pointer-events-none absolute left-12 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-[11px] font-mono whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {tab.label}
                </span>
              </button>
            );
          })}

          <div className="mt-auto flex flex-col items-center pt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Telemetry Feed Live" />
          </div>
        </div>
      </aside>
    );
  }

  const currentTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <aside
      aria-label="Situational Awareness Rail"
      className={`fixed top-16 left-3 bottom-20 z-30 w-[340px] 2xl:w-[380px] flex flex-col pointer-events-auto transition-all duration-200 ${className}`}
    >
      <div className="h-full bg-[#0b0f19]/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100">
        {/* Rail Top Bar */}
        <div className="px-3.5 pt-3 pb-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: currentTabMeta.themeColor,
                boxShadow: `0 0 8px ${currentTabMeta.themeColor}aa`
              }}
            />
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
              Situational Radar
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Collapse Situational Rail"
              className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Collapse Situational Rail"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-800/70 flex items-center gap-1.5 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex-1 min-w-0 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm shadow-slate-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
                title={tab.description}
              >
                <Icon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: isSelected ? tab.themeColor : undefined }}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 relative custom-scrollbar">
          <ErrorBoundary name={`Situational Rail: ${currentTabMeta.label}`}>
            {activeTab === 'kpis' && <KpisContent />}
            {activeTab === 'sentinel' && <AutonomousSentinelHUD />}
          </ErrorBoundary>
        </div>
      </div>
    </aside>
  );
}
