import React, { useState } from 'react';
import {
  X,
  Search,
  BarChart3,
  TrendingUp,
  Navigation,
  FileCheck2,
  ShieldAlert,
  Globe,
  Cpu,
  Layers,
  Lock,
  Compass,
  Truck,
  Eye,
  Video,
  MapPin,
  ChevronRight,
  Maximize2,
  Layout,
  ExternalLink
} from 'lucide-react';
import { DOCK_SERVICES } from '../../constants/dockConfig';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';
import StatusBadge from '../primitives/StatusBadge';

const CATEGORIES = [
  {
    name: 'Operational Intelligence',
    services: ['kpis', 'routing', 'forecasting']
  },
  {
    name: 'Autonomous & Spatial',
    services: ['sentinel', 'twin']
  },
  {
    name: 'Trade & Administration',
    services: ['compliance', 'system']
  }
];

const ICONS = {
  kpis: BarChart3,
  routing: Navigation,
  forecasting: TrendingUp,
  sentinel: ShieldAlert,
  twin: Globe,
  compliance: FileCheck2,
  system: Cpu
};

export default function OperationsSidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    workspaceMode,
    setWorkspaceMode,
    activeDockedTab,
    setActiveDockedTab,
    quickLaunchFeature,
    windows,
    isAllowed,
    cameraMode,
    setCameraMode,
    selectFacility,
    toggleGuide
  } = useWorkspace();

  const { currentRole, profile, switchPersona } = usePersona();
  const [searchQuery, setSearchQuery] = useState('');

  if (!sidebarOpen) return null;

  const handleSelectService = (serviceId) => {
    setActiveDockedTab(serviceId);
    if (workspaceMode === 'floating') {
      quickLaunchFeature(serviceId);
    }
  };

  const filteredServices = DOCK_SERVICES.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        onClick={() => setSidebarOpen(false)}
        className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
      />

      {/* Sidebar Drawer */}
      <aside
        aria-label="Operations Navigation Hub"
        className="fixed top-14 left-0 bottom-0 w-80 sm:w-88 z-40 cyber-glass border-r border-slate-700/80 shadow-2xl flex flex-col text-slate-100 select-none animate-in slide-in-from-left duration-200"
      >
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Operations Hub
              </h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search filter input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search features (e.g. routing, forecast)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          {/* Workspace Mode Quick Switcher */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Workspace View Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setWorkspaceMode('docked')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  workspaceMode === 'docked'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layout className="w-3 h-3" />
                <span>Docked Split</span>
              </button>
              <button
                onClick={() => setWorkspaceMode('floating')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  workspaceMode === 'floating'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>Floating OS</span>
              </button>
            </div>
          </div>

          {/* Module Categories */}
          {CATEGORIES.map((cat) => {
            const catServices = filteredServices.filter((s) => cat.services.includes(s.id));
            if (catServices.length === 0) return null;

            return (
              <div key={cat.name} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
                  {cat.name}
                </span>

                <div className="space-y-1">
                  {catServices.map((service) => {
                    const Icon = ICONS[service.id] || BarChart3;
                    const allowed = isAllowed(service.viewRequired);
                    const isSelected = activeDockedTab === service.id;
                    const isOpen = windows[service.id]?.isOpen;

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleSelectService(service.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-950/30 text-white'
                            : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${service.themeColor}18`,
                              border: `1px solid ${service.themeColor}40`
                            }}
                          >
                            <Icon className="w-4 h-4" style={{ color: service.themeColor }} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{service.label}</span>
                              {!allowed && <Lock className="w-3 h-3 text-rose-400" />}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {service.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isOpen && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Camera POV Switcher */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              3D Camera Perspectives
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setCameraMode('CHASE')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition ${
                  cameraMode === 'CHASE'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Chase [1]</span>
              </button>
              <button
                onClick={() => setCameraMode('COCKPIT')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition ${
                  cameraMode === 'COCKPIT'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Cockpit [2]</span>
              </button>
              <button
                onClick={() => setCameraMode('DRONE')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition ${
                  cameraMode === 'DRONE'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Drone [3]</span>
              </button>
              <button
                onClick={() => setCameraMode('FREE_ORBIT')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition ${
                  cameraMode === 'FREE_ORBIT'
                    ? 'bg-violet-950/80 border-violet-500 text-violet-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>Orbit [4]</span>
              </button>
            </div>
          </div>

          {/* Quick Facility Teleport */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Corridor Hub Inspection
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'PORT-JNPT-01', label: 'JNPT Port' },
                { id: 'DC-BHW-01', label: 'Bhiwandi' },
                { id: 'HUB-THN-01', label: 'Thane' },
                { id: 'PASS-KASARA-01', label: 'Kasara Ghat' },
                { id: 'DEP-NSK-01', label: 'Nashik' },
                { id: 'FC-PUN-01', label: 'Pune FC' }
              ].map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => selectFacility(hub.id)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {hub.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Feature Guide Launcher */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/70 space-y-2">
          <button
            onClick={() => {
              setSidebarOpen(false);
              toggleGuide();
            }}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-900/60 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open Feature Guide & Tour</span>
          </button>
        </div>
      </aside>
    </>
  );
}
