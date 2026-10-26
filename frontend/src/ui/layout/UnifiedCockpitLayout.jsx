import React, { useState, useEffect, useCallback } from 'react';
import { Minimize2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import LeftSituationalRail from './LeftSituationalRail';
import RightInspectorRail from './RightInspectorRail';
import BottomTelemetryBar from './BottomTelemetryBar';
import ErrorBoundary from '../../components/ErrorBoundary';

/**
 * UnifiedCockpitLayout
 * 
 * The master command center container for the NeoLogix Smart Logistics Platform.
 * Establishes a permanently anchored, non-overlapping 3-tier operational cockpit:
 * - Left: Situational Awareness Rail (Macro Fleet Health, KPIs, AI Sentinel Alerts)
 * - Center: Dedicated, unobstructed 60 FPS 3D Digital Twin Viewport (pointer events pass-through)
 * - Right: Deep Analytical Inspector Rail (DRL Dynamic Routing, LSTM Forecasting, Trade Compliance, Admin Retrain)
 * - Bottom: Docked Telematics & Multi-Perspective Camera Control Bar
 */
export default function UnifiedCockpitLayout({
  className = '',
  defaultLeftCollapsed = false,
  defaultRightCollapsed = false
}) {
  const workspace = useWorkspace() || {};
  const {
    workspaceMode,
    leftRailCollapsed,
    setLeftRailCollapsed,
    rightRailCollapsed,
    setRightRailCollapsed,
    rightRailExpanded,
    setRightRailExpanded
  } = workspace;

  const [internalLeftCollapsed, setInternalLeftCollapsed] = useState(defaultLeftCollapsed);
  const [internalRightCollapsed, setInternalRightCollapsed] = useState(defaultRightCollapsed);
  const [internalRightExpanded, setInternalRightExpanded] = useState(false);

  const leftCollapsed = leftRailCollapsed !== undefined ? leftRailCollapsed : internalLeftCollapsed;
  const setLeftCollapsed = setLeftRailCollapsed || setInternalLeftCollapsed;
  const rightCollapsed = rightRailCollapsed !== undefined ? rightRailCollapsed : internalRightCollapsed;
  const setRightCollapsed = setRightRailCollapsed || setInternalRightCollapsed;
  const rightExpanded = rightRailExpanded !== undefined ? rightRailExpanded : internalRightExpanded;
  const setRightExpanded = setRightRailExpanded || setInternalRightExpanded;

  // Auto-collapse rails on smaller viewports to prevent 3D canvas cramping (< 1280px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1200) {
          setLeftCollapsed(true);
        }
        if (window.innerWidth < 1024) {
          setRightCollapsed(true);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quick toggle to collapse/expand both rails simultaneously for full 3D panoramic inspection
  const bothCollapsed = leftCollapsed && rightCollapsed;
  const toggleBothRails = useCallback(() => {
    if (bothCollapsed) {
      setLeftCollapsed(false);
      setRightCollapsed(false);
    } else {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  }, [bothCollapsed]);

  // If user switches to immersive mode, collapse both rails
  useEffect(() => {
    if (workspaceMode === 'immersive') {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  }, [workspaceMode]);

  return (
    <div
      data-testid="unified-cockpit-layout"
      className={`fixed inset-0 pointer-events-none z-30 select-none overflow-hidden ${className}`}
    >
      {/* 1. Anchored Left Rail: Situational Awareness (Fleet KPIs & Autonomous Sentinel) */}
      <ErrorBoundary name="Left Situational Rail">
        <LeftSituationalRail
          isCollapsed={leftCollapsed}
          onToggleCollapse={setLeftCollapsed}
        />
      </ErrorBoundary>

      {/* 2. Central Spatial Arena remains completely open and transparent for 60 FPS Three.js/Cesium mouse rotation */}
      <div className="absolute top-16 inset-x-0 bottom-20 pointer-events-none">
        {bothCollapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              type="button"
              onClick={toggleBothRails}
              aria-label="Restore Cockpit Rails"
              className="cyber-glass px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-[#0b0f19]/90 backdrop-blur-md text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
              title="Restore Cockpit Rails (Exit Panorama 3D)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Restore Rails (Exit Panorama 3D)</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Anchored Right Rail: Analytical Inspector (Routing, Forecasting, Compliance, Admin) */}
      <ErrorBoundary name="Right Analytical Inspector Rail">
        <RightInspectorRail
          isCollapsed={rightCollapsed}
          onToggleCollapse={setRightCollapsed}
          isExpandedWidth={rightExpanded}
          onToggleExpandWidth={setRightExpanded}
        />
      </ErrorBoundary>

      {/* 4. Bottom Docked Telematics Strip & Camera Mode Selector */}
      <ErrorBoundary name="Bottom Telemetry Bar">
        <div
          data-testid="bottom-telemetry-container"
          className="fixed bottom-6 z-40 pointer-events-none flex justify-center transition-all duration-200"
          style={{
            left: leftCollapsed ? '64px' : (typeof window !== 'undefined' && window.innerWidth >= 1536 ? '400px' : '360px'),
            right: rightCollapsed ? '64px' : (rightExpanded ? '760px' : (typeof window !== 'undefined' && window.innerWidth >= 1536 ? '540px' : '460px'))
          }}
        >
          <BottomTelemetryBar className="relative !left-auto !right-auto !bottom-auto !translate-x-0" />
        </div>
      </ErrorBoundary>
    </div>
  );
}
