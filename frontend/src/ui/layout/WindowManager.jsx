import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Navigation,
  FileCheck2,
  ShieldAlert,
  Globe,
  Cpu
} from 'lucide-react';
import { DOCK_SERVICES } from '../../constants/dockConfig';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';

import GlassPanel from './GlassPanel';
import DockedWorkspaceView from './DockedWorkspaceView';
import UnifiedCockpitLayout from './UnifiedCockpitLayout';
import OperationsSidebar from './OperationsSidebar';
import FeatureGuideModal from './FeatureGuideModal';

import { KpisContent } from '../../modules/analytics';
import { ForecastingTab } from '../../modules/forecasting';
import { RoutingTab } from '../../modules/routing';
import { ComplianceTab } from '../../modules/compliance';
import { AutonomousSentinelHUD, DigitalTwinTab } from '../../modules/twin';
import { AdminRetrainContent } from '../../modules/admin';

const SERVICE_ICONS = {
  kpis: BarChart3,
  forecasting: TrendingUp,
  routing: Navigation,
  compliance: FileCheck2,
  sentinel: ShieldAlert,
  twin: Globe,
  system: Cpu
};

export default function WindowManager() {
  const { windows, workspaceMode } = useWorkspace();
  const { profile } = usePersona();

  return (
    <>
      {/* 1. Global Navigation Operations Sidebar */}
      <OperationsSidebar />

      {/* 2. Interactive How-It-Works Feature Guide Modal */}
      <FeatureGuideModal />

      {/* 3. Unified Command Cockpit Layout (Primary anchored non-overlapping interface) */}
      {(workspaceMode === 'docked' || workspaceMode === 'cockpit') && <UnifiedCockpitLayout />}

      {/* Legacy Docked Split View (fallback) */}
      {workspaceMode === 'legacy_docked' && <DockedWorkspaceView />}

      {/* 4. Floating Multi-Window Mode (OS draggable glass panels) */}
      {workspaceMode === 'floating' && (
        <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
          {DOCK_SERVICES.map((service) => {
            const win = windows[service.id];
            if (!win || !win.isOpen) return null;

            const Icon = SERVICE_ICONS[service.id] || BarChart3;

            return (
              <div key={service.id} className="pointer-events-auto">
                <GlassPanel
                  id={service.id}
                  title={service.label}
                  shortLabel={service.shortLabel}
                  icon={Icon}
                  themeColor={service.themeColor}
                  viewRequired={service.viewRequired}
                  badgeText={service.badgeText}
                >
                  {service.id === 'kpis' && <KpisContent />}
                  {service.id === 'forecasting' && <ForecastingTab personaProfile={profile} />}
                  {service.id === 'routing' && <RoutingTab />}
                  {service.id === 'compliance' && <ComplianceTab />}
                  {service.id === 'sentinel' && <AutonomousSentinelHUD />}
                  {service.id === 'twin' && <DigitalTwinTab />}
                  {service.id === 'system' && <AdminRetrainContent />}
                </GlassPanel>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
