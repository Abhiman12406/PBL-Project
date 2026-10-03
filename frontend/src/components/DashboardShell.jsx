import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  FileCheck2, 
  Cpu, 
  Activity, 
  ShieldAlert, 
  BarChart3, 
  Truck, 
  Lock, 
  Unlock, 
  Clock, 
  ArrowRight,
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { usePersona } from '../context/PersonaContext';
import { api } from '../services/api';

const TABS = [
  { id: 'kpis', label: 'Executive KPIs', icon: BarChart3, viewRequired: 'kpis' },
  { id: 'forecasting', label: 'Demand Forecasting', icon: TrendingUp, viewRequired: 'forecasting' },
  { id: 'routing', label: 'Route & Fleet Optimizer', icon: MapPin, viewRequired: 'routing' },
  { id: 'compliance', label: 'Trade Compliance & IDP', icon: FileCheck2, viewRequired: 'compliance' },
  { id: 'twin', label: 'Digital Twin Studio', icon: Activity, viewRequired: 'twin' },
  { id: 'system', label: 'IT Administration', icon: Cpu, viewRequired: 'system' }
];

export default function DashboardShell() {
  const { currentRole, profile, canView, canPerform, switchPersona } = usePersona();
  const [activeTab, setActiveTab] = useState('kpis');
  const [adminOutput, setAdminOutput] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  // If current active tab is not accessible by the new persona, switch to first allowed tab
  useEffect(() => {
    const isAllowed = canView(activeTab);
    if (!isAllowed) {
      const firstAllowed = TABS.find(t => canView(t.viewRequired));
      if (firstAllowed) {
        setActiveTab(firstAllowed.id);
      }
    }
  }, [currentRole, profile]);

  const handleTestAdminEndpoint = async () => {
    setAdminLoading(true);
    setAdminError(null);
    setAdminOutput(null);
    try {
      const res = await api.getAdminSystemStatus();
      setAdminOutput(res);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Persona Header & Context Banner */}
      <div className="glass-panel-glow rounded-2xl p-5 sm:p-6 border border-slate-700/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Active Operational Persona
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Corridor: Mumbai (JNPT) ↔ Thane ↔ Nashik ↔ Pune
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              {profile?.title}
              <span className="text-xs font-normal px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                Role: {currentRole}
              </span>
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl mt-1">
              {profile?.description}
            </p>
          </div>

          {/* Quick permissions badge list */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Authorized:</span>
            {profile?.permissions?.views?.map(v => (
              <span 
                key={v} 
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const isAllowed = canView(tab.viewRequired);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 relative ${
                isActive
                  ? 'bg-slate-800 text-white shadow-lg border border-slate-700/80'
                  : isAllowed
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    : 'text-slate-600 hover:text-slate-500 opacity-60 cursor-not-allowed border border-transparent'
              }`}
            >
              <TabIcon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : isAllowed ? 'text-slate-400' : 'text-slate-600'}`} />
              <span>{tab.label}</span>
              {!isAllowed && (
                <Lock className="w-3 h-3 text-slate-500 ml-1 shrink-0" />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Display */}
      <div className="mt-4">
        {/* Permission Check Barrier */}
        {!canView(TABS.find(t => t.id === activeTab)?.viewRequired) ? (
          <div className="glass-panel rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 border border-rose-500/30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Access Restricted by RBAC Policy</h3>
            <p className="text-xs text-slate-400">
              The active persona <strong className="text-slate-200">{profile?.title}</strong> does not possess view permissions for this module.
            </p>
            <div className="pt-2">
              <button
                onClick={() => switchPersona('admin')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-600/20"
              >
                Switch to Enterprise IT Admin Role
              </button>
            </div>
          </div>
        ) : (
          /* Active Views */
          <div>
            {activeTab === 'kpis' && (
              <div className="space-y-6">
                {/* 4 Core High-Level KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-medium text-slate-400">Corridor Freight Volume</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-white">4,850 T</span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center">
                        +14.2% <TrendingUp className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">JNPT – Nashik daily throughput</span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-medium text-slate-400">On-Time SLA Delivery</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-white">98.4%</span>
                      <span className="text-xs font-semibold text-emerald-400">Target 98.0%</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Fleet telemetry confirmed</span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-medium text-slate-400">Forecast Error (WAPE)</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-white">4.1%</span>
                      <span className="text-xs font-semibold text-cyan-400">LSTM / GRU</span>
                    </div>
                    <span className="text-[11px] text-slate-500">95% CI bounds compliant</span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-medium text-slate-400">Active Transit Fleets</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-white">24 Units</span>
                      <span className="text-xs font-semibold text-indigo-400">0 Roadblocks</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Live GPS tracking active</span>
                  </div>
                </div>

                {/* Persona Quick Actions Card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Persona Action Console</h3>
                      <p className="text-xs text-slate-400">
                        Operational actions available under current RBAC permissions
                      </p>
                    </div>
                    <span className="text-xs text-indigo-400 font-medium">Role: {profile?.title}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setActiveTab('forecasting')}
                      className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition">
                          Run Neural Demand Prediction
                        </div>
                        <div className="text-[11px] text-slate-400">Issue 02 Vertical Slice</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                    </button>

                    <button
                      onClick={() => setActiveTab('twin')}
                      className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition">
                          Simulate Disruption Shock
                        </div>
                        <div className="text-[11px] text-slate-400">Port strike / Monsoon risk</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                    </button>

                    <button
                      onClick={() => setActiveTab('system')}
                      className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition">
                          Inspect System Diagnostics
                        </div>
                        <div className="text-[11px] text-slate-400">RBAC & In-Memory Fallback</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'forecasting' && (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Demand Forecasting Studio</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  PyTorch LSTM/GRU Multi-Step Predictor with 95% Confidence Intervals & Exogenous Weather/Promo feeds. (Ready for Issue 02 Vertical Slice integration).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Persona Authorized: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'routing' && (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Route Optimization & Freight Matching</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Interactive Leaflet.js corridor map with live DRL turn-by-turn routing and backhaul freight pairing. (Ready for Issue 03 integration).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Persona Authorized: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Trade Compliance & IDP Orchestrator</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Local Vector RAG HS Code Retrieval + Google Gemini Intelligent Document Extraction for Bills of Lading and Invoices. (Ready for Issue 05 integration).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Persona Authorized: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'twin' && (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Digital Twin "What-If" Scenario Studio</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Discrete-event network simulation modeling multi-echelon inventory, port labor strikes, and highway bridge closures. (Ready for Issue 06 integration).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Persona Authorized: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Enterprise IT Admin Diagnostics Console
                      </h3>
                      <p className="text-xs text-slate-400">
                        Verify RBAC middleware token propagation and live service availability
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Active: {currentRole}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      Test the role-guarded endpoint <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400">/api/v1/admin/system-status</code>. 
                      Only the <strong>Enterprise IT Administrator</strong> role has permission to access this endpoint; other personas receive an HTTP 403 Forbidden with detailed RBAC denial message.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleTestAdminEndpoint}
                        disabled={adminLoading}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                      >
                        <Cpu className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                        <span>Execute RBAC Guard Test</span>
                      </button>

                      <button
                        onClick={() => switchPersona('director')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                      >
                        Switch to Director (Test 403)
                      </button>

                      <button
                        onClick={() => switchPersona('admin')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                      >
                        Switch to Admin (Test 200)
                      </button>
                    </div>

                    {/* Result Output */}
                    {adminOutput && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>RBAC Authorization Succeeded (HTTP 200)</span>
                        </div>
                        <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded font-mono text-[11px]">
                          {JSON.stringify(adminOutput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {adminError && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-rose-500/30 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-rose-400 font-semibold">
                          <AlertTriangle className="w-4 h-4" />
                          <span>RBAC Rejection Confirmed (HTTP 403 Forbidden)</span>
                        </div>
                        <div className="text-slate-300 font-mono text-[11px] bg-slate-900 p-2 rounded">
                          {adminError}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
