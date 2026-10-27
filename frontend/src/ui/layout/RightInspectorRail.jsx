import React, { useState } from 'react';
import {
  TrendingUp,
  Navigation,
  FileCheck2,
  Cpu,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';
import ErrorBoundary from '../../components/ErrorBoundary';

import { RoutingTab } from '../../modules/routing';
import { ForecastingTab } from '../../modules/forecasting';
import { ComplianceTab } from '../../modules/compliance';
import { AdminRetrainContent } from '../../modules/admin';

const INSPECTOR_TABS = [
  {
    id: 'routing',
    label: 'DRL Routing',
    shortLabel: 'Routing',
    icon: Navigation,
    themeColor: '#10b981',
    viewRequired: 'routing',
    badgeText: 'FLEET-OPT',
    description: 'Dynamic multi-stop vehicle routing, cold-chain telematics, and backhaul matching'
  },
  {
    id: 'forecasting',
    label: 'Demand Forecasting',
    shortLabel: 'Forecast',
    icon: TrendingUp,
    themeColor: '#f59e0b',
    viewRequired: 'forecasting',
    badgeText: 'AI-PREDICT',
    description: 'Temporal fusion demand predictions, inventory rebalancing, and stock risk alerts'
  },
  {
    id: 'compliance',
    label: 'Trade Compliance',
    shortLabel: 'Compliance',
    icon: FileCheck2,
    themeColor: '#8b5cf6',
    viewRequired: 'compliance',
    badgeText: 'CUSTOMS-IDP',
    description: 'Automated bill-of-lading processing, HS-code validation, and tariff calculations'
  },
  {
    id: 'system',
    label: 'IT Admin Retrain',
    shortLabel: 'Admin',
    icon: Cpu,
    themeColor: '#8b5cf6',
    viewRequired: 'system',
    badgeText: 'SYSTEM-OPS',
    description: 'PyTorch model retraining studio, system health diagnostics, and audit logs'
  }
];

export default function RightInspectorRail({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  isExpandedWidth: controlledExpandedWidth,
  onToggleExpandWidth,
  activeTab: controlledTab,
  onTabChange,
  className = ''
}) {
  const { activeDockedTab, setActiveDockedTab, isAllowed } = useWorkspace() || {};
  const { currentRole, profile, switchPersona } = usePersona() || {};

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalExpandedWidth, setInternalExpandedWidth] = useState(false);
  const [internalTab, setInternalTab] = useState('routing');

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const isExpandedWidth = controlledExpandedWidth !== undefined ? controlledExpandedWidth : internalExpandedWidth;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const handleToggleExpandWidth = () => {
    if (onToggleExpandWidth) {
      onToggleExpandWidth(!isExpandedWidth);
    } else {
      setInternalExpandedWidth((prev) => !prev);
    }
  };

  // Determine active tab
  const activeTab = controlledTab !== undefined
    ? controlledTab
    : INSPECTOR_TABS.some((t) => t.id === activeDockedTab)
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

  // Collapsed rail state
  if (isCollapsed) {
    return (
      <aside
        aria-label="Analytical Inspector Rail (Collapsed)"
        className={`fixed top-16 right-3 bottom-20 z-30 flex flex-col pointer-events-auto transition-all duration-200 ${className}`}
      >
        <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-800 rounded-2xl py-3 px-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center gap-3">
          {/* Expand toggle */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            aria-label="Expand Analytical Inspector Rail"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Expand Analytical Inspector Rail"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-5 h-[1px] bg-slate-800" />

          {/* Tab icons */}
          {INSPECTOR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            const allowed = isAllowed ? isAllowed(tab.viewRequired) : true;

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
                {!allowed && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-rose-400">
                    <Lock className="w-2 h-2" />
                  </span>
                )}
                {isSelected && (
                  <span
                    className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
                    style={{ backgroundColor: tab.themeColor }}
                  />
                )}
                {/* Floating tooltip */}
                <span className="pointer-events-none absolute right-12 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-[11px] font-mono whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {tab.label} {!allowed ? '(Locked)' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  const currentTabMeta = INSPECTOR_TABS.find((t) => t.id === activeTab) || INSPECTOR_TABS[0];
  const allowed = isAllowed ? isAllowed(currentTabMeta.viewRequired) : true;

  const widthClass = isExpandedWidth
    ? 'w-[calc(100vw-32px)] sm:w-[680px] md:w-[720px] xl:w-[760px]'
    : 'w-[440px] 2xl:w-[520px]';

  return (
    <aside
      aria-label="Analytical Inspector Rail"
      className={`fixed top-16 right-3 bottom-20 z-30 ${widthClass} flex flex-col pointer-events-auto transition-all duration-200 ${className}`}
    >
      <div className="h-full bg-[#0b0f19]/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="px-3.5 pt-3 pb-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: currentTabMeta.themeColor,
                boxShadow: `0 0 8px ${currentTabMeta.themeColor}aa`
              }}
            />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-slate-200 tracking-tight truncate">
                {currentTabMeta.label}
              </span>
              {currentTabMeta.badgeText && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shrink-0">
                  {currentTabMeta.badgeText}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Expand width toggle */}
            <button
              type="button"
              onClick={handleToggleExpandWidth}
              aria-label={isExpandedWidth ? 'Standard Width' : 'Expand Width'}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title={isExpandedWidth ? 'Standard Width' : 'Expand Rail Width'}
            >
              {isExpandedWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Collapse rail toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Collapse Analytical Rail"
              className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Collapse Analytical Rail"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-800/70 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          {INSPECTOR_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            const tabAllowed = isAllowed ? isAllowed(tab.viewRequired) : true;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex-1 min-w-0 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
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
                <span className="truncate">{tab.shortLabel}</span>
                {!tabAllowed && <Lock className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Active Module Content Area */}
        <div className="flex-1 overflow-y-auto p-4 relative custom-scrollbar">
          <ErrorBoundary name={`Inspector Rail: ${currentTabMeta.label}`}>
            {!allowed ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="max-w-sm">
                  <h3 className="text-base font-bold text-white">Access Restricted (RBAC)</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    The <span className="text-slate-200 font-semibold">{currentTabMeta.label}</span> module requires{' '}
                    <span className="font-mono text-cyan-400 font-bold">{currentTabMeta.viewRequired}</span> clearance.
                    Your current active role is{' '}
                    <span className="text-rose-400 font-semibold uppercase">{profile?.title || currentRole}</span>.
                  </p>
                </div>
                {switchPersona && (
                  <button
                    type="button"
                    onClick={() => switchPersona('admin')}
                    className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40 flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <span>Elevate to Administrator</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'routing' && <RoutingTab />}
                {activeTab === 'forecasting' && <ForecastingTab personaProfile={profile} />}
                {activeTab === 'compliance' && <ComplianceTab />}
                {activeTab === 'system' && <AdminRetrainContent />}
              </>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </aside>
  );
}
