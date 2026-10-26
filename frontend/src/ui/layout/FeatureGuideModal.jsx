import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Navigation,
  TrendingUp,
  FileCheck2,
  Globe,
  ShieldAlert,
  Layers,
  Truck,
  Eye,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Video,
  Cpu,
  Lock,
  Play
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';
import CyberButton from '../primitives/CyberButton';
import StatusBadge from '../primitives/StatusBadge';

const GUIDE_SECTIONS = [
  {
    id: 'routing',
    title: 'Fleet Routing & Detours',
    icon: Navigation,
    color: '#10b981',
    headline: 'Autonomous DRL Highway Optimization & Roadblock Detours',
    description: 'The platform simulates real-time traffic and hazard events along NH-160/NH-48. When a disruption occurs (such as a monsoon mudslide at Kasara Ghat elevation +580m), the reinforcement learning router dynamically computes an optimal bypass route in under 5 seconds.',
    steps: [
      'Open the "Route & Fleet Optimizer" from the dock or sidebar.',
      'Under "Disruption Simulation", select the "Kasara Ghat Mudslide" preset.',
      'Click "Simulate Roadblock" to penalize the mountain pass edge.',
      'Observe the autonomous DRL engine compute the NH-61 Malshej Ghat detour, saving 98.4% SLA delivery compliance.'
    ],
    targetService: 'routing',
    actionText: 'Launch Route Optimizer'
  },
  {
    id: 'forecasting',
    title: 'Demand Forecasting',
    icon: TrendingUp,
    color: '#f59e0b',
    headline: 'Multi-Horizon Neural Demand Predictions with 95% Confidence Bounds',
    description: 'Replaces rigid linear formulas with a PyTorch LSTM/GRU neural network that factors in seasonal weekly cycles, promotional discounts (0-50%), and monsoon weather volatility to prevent stockouts and overstocking across corridor hubs.',
    steps: [
      'Open "Demand Forecasting" from the dock or sidebar.',
      'Select a regional SKU (e.g., SKU-NAS-AGRI-01 for Nashik Agro Depot).',
      'Select a forecast horizon: 7 Days, 14 Days, or 30 Days.',
      'Adjust the Promotional Discount or Weather Severity sliders to observe dynamic safety stock recalculation.'
    ],
    targetService: 'forecasting',
    actionText: 'Launch Demand Forecaster'
  },
  {
    id: 'compliance',
    title: 'Customs & Trade IDP',
    icon: FileCheck2,
    color: '#8b5cf6',
    headline: 'Automated Shipping Document Extraction & HS Code Tariff Auditing',
    description: 'Uses semantic AI and RAG to automatically parse unstructured Bills of Lading and Commercial Invoices into structured data, classify Harmonized System (HS) codes, and flag cross-border customs discrepancies.',
    steps: [
      'Open "Trade Compliance & IDP" from the dock or sidebar.',
      'Select a sample Bill of Lading (e.g., BOL-JNPT-2026-001).',
      'Review automated key-value extraction (Shipper, Consignee, Port of Entry, Weight).',
      'Audit the HS Code classification and cross-verify with Indian Customs tariff schedules.'
    ],
    targetService: 'compliance',
    actionText: 'Launch Trade Compliance'
  },
  {
    id: 'twin',
    title: '3D Spatial Navigation',
    icon: Globe,
    color: '#06b6d4',
    headline: 'Dual-Engine Corridor Digital Twin & Multi-Perspective Camera Suite',
    description: 'A 60 FPS Three.js corridor stage models real topography, extruded highways, and animated logistics hubs, synchronized with CesiumJS WGS84 geospatial GIS.',
    steps: [
      'Chase Cam (Key [1]): Dynamically tracks behind active freight vehicle TRK-MH-01 with free-look mouse yaw.',
      'Cockpit POV (Key [2]): Puts you inside the truck cab with a live dashboard HUD.',
      'Drone God-View (Key [3]): Elevated tactical aerial view showing macro traffic pulses.',
      'Free Orbit (Key [4]): Full 360° inspection of any corridor facility.',
      'Toggle Day/Night: Experience dynamic emissive highway and facility beacon illumination.'
    ],
    targetService: 'sentinel',
    actionText: 'Inspect 3D Twin Sentinel'
  },
  {
    id: 'rbac',
    title: 'Personas & Access Control',
    icon: Layers,
    color: '#ff5400',
    headline: 'Role-Based Access Control Tailored to 4 Real-World Personas',
    description: 'The platform calibrates available tools and data density to the operator persona active in the control room.',
    steps: [
      'Supply Chain Director: Executive KPIs, demand distributions, and network simulation.',
      'Fleet Dispatcher: Active vehicle tracking, real-time telematics, and dynamic route detour execution.',
      'Customs Officer: Cross-border trade documentation, HS code classification, and discrepancy audits.',
      'IT Administrator: Full system access, model retraining studio, and API gateway health diagnostics.'
    ],
    targetService: 'kpis',
    actionText: 'View Executive KPIs'
  }
];

export default function FeatureGuideModal() {
  const { guideOpen, setGuideOpen, quickLaunchFeature, setCameraMode, setWorkspaceMode } = useWorkspace();
  const { currentRole, switchPersona } = usePersona();
  const [activeTab, setActiveTab] = useState('routing');
  const closeButtonRef = useRef(null);

  // Focus trap / escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setGuideOpen(false);
      }
    };
    if (guideOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guideOpen, setGuideOpen]);

  if (!guideOpen) return null;

  const currentSection = GUIDE_SECTIONS.find((s) => s.id === activeTab) || GUIDE_SECTIONS[0];
  const Icon = currentSection.icon;

  const handleLaunch = (serviceId) => {
    setWorkspaceMode('docked');
    quickLaunchFeature(serviceId);
    setGuideOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Platform Feature Guide & Walkthrough"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] cyber-glass rounded-2xl border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/50">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>NeoLogix Feature Guide & Interactive Walkthrough</span>
                <StatusBadge variant="cyan" size="sm">Interactive Guide</StatusBadge>
              </h1>
              <p className="text-xs text-slate-400">
                Explore the 5 core operational engines and learn how to run simulations
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={() => setGuideOpen(false)}
            aria-label="Close Guide"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {GUIDE_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const isSelected = activeTab === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <SectionIcon className="w-3.5 h-3.5" style={{ color: section.color }} />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Headline & Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${currentSection.color}22`, border: `1px solid ${currentSection.color}55` }}
              >
                <Icon className="w-4 h-4" style={{ color: currentSection.color }} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {currentSection.headline}
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {currentSection.description}
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step-by-Step Usage Instructions
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {currentSection.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 font-mono font-bold text-[11px] flex items-center justify-center text-cyan-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Feature Controls */}
          {activeTab === 'twin' && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">
                Quick Camera Perspective Test
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCameraMode('CHASE')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>[1] Chase Cam</span>
                </button>
                <button
                  onClick={() => setCameraMode('COCKPIT')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>[2] Driver Cockpit POV</span>
                </button>
                <button
                  onClick={() => setCameraMode('DRONE')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>[3] Drone God-View</span>
                </button>
                <button
                  onClick={() => setCameraMode('FREE_ORBIT')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-violet-400" />
                  <span>[4] Free Orbit</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rbac' && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">
                Instant Role Switcher
              </h3>
              <div className="flex flex-wrap gap-2">
                {['director', 'dispatcher', 'customs', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => switchPersona(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition border cursor-pointer ${
                      currentRole === role
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {role} {currentRole === role && '✓'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Instant Launch Action */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 hidden sm:block">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> anytime to dismiss overlays
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setGuideOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
            <CyberButton
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={() => handleLaunch(currentSection.targetService)}
            >
              {currentSection.actionText}
            </CyberButton>
          </div>
        </div>
      </div>
    </div>
  );
}
