import React from 'react';
import { PersonaProvider } from './context/PersonaContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { PersistentStage3D } from './modules/twin';
import { CyberStatusBar, WindowManager, GlassDock } from './ui/layout';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * NeoLogix Global Application Root
 * Cognitive Software-Driven Smart Logistics & Multi-Agent Autonomous Corridor Platform
 * Modular Architecture:
 * - src/modules: Domain feature modules (twin, forecasting, routing, compliance, telemetry, analytics, admin)
 * - src/ui: Shared primitives (GlassCard, StatusBadge, TabularMetric) and workspace layout (CyberStatusBar, WindowManager, GlassDock)
 * - src/core: Centralized context, constants, services, and math/3D utilities
 */
function App() {
  return (
    <ErrorBoundary name="NeoLogix Global Application Root">
      <PersonaProvider>
        <WorkspaceProvider>
          <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans select-none">
            {/* 1. Persistent 3D Operational Stage (Continuous 60 FPS Dual-Engine World) */}
            <PersistentStage3D />

            {/* 2. Cyber-Dark Status Bar with Corridor Routing & RBAC Persona Switcher */}
            <CyberStatusBar />

            {/* 3. Floating Modular Glassmorphic Service Panels */}
            <WindowManager />

            {/* 4. Role-Adaptive Glassmorphic Dock Toolbar */}
            <GlassDock />
          </div>
        </WorkspaceProvider>
      </PersonaProvider>
    </ErrorBoundary>
  );
}

export default App;
