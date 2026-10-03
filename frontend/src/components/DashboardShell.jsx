import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  FileCheck2, 
  Cpu, 
  Activity, 
  BarChart3, 
  Truck, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  PlayCircle,
  Terminal,
  Zap
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* High-Visibility Persona Header Banner */}
      <div className="bright-card rounded-2xl p-6 border-l-6 border-l-[#FF5400] relative overflow-hidden bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                Active Operational Persona
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-600">
                Western India Corridor: JNPT / Mumbai ↔ Thane ↔ Nashik ↔ Pune
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              {profile?.title}
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                {currentRole}
              </span>
            </h2>
            <p className="text-sm font-medium text-slate-600 max-w-3xl mt-1.5 leading-relaxed">
              {profile?.description}
            </p>
          </div>

          {/* Quick permissions badge list */}
          <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Assigned Permissions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile?.permissions?.views?.map(v => (
                <span 
                  key={v} 
                  className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300 shadow-xs"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b-2 border-slate-200">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const isAllowed = canView(tab.viewRequired);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 whitespace-nowrap shrink-0 active:scale-[0.98] ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : isAllowed
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
                    : 'text-slate-400 bg-slate-100/60 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
            >
              <TabIcon className={`w-4 h-4 ${isActive ? 'text-[#FF5400]' : isAllowed ? 'text-slate-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {!isAllowed && (
                <Lock className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Display */}
      <div className="mt-2">
        {/* Permission Check Barrier */}
        {!canView(TABS.find(t => t.id === activeTab)?.viewRequired) ? (
          <div className="bright-card rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 border-2 border-rose-200 bg-white shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Access Restricted by RBAC Policy</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              The active persona <strong className="text-slate-900 font-bold">{profile?.title}</strong> is not authorized to access this module under standard organizational governance.
            </p>
            <div className="pt-2">
              <button
                onClick={() => switchPersona('admin')}
                className="px-5 py-2.5 rounded-xl bg-[#FF5400] hover:bg-[#e04a00] text-white text-xs font-bold transition shadow-md shadow-orange-500/25 active:scale-[0.98]"
              >
                Switch to Enterprise IT Administrator
              </button>
            </div>
          </div>
        ) : (
          /* Active Views */
          <div>
            {activeTab === 'kpis' && (
              <div className="space-y-6">
                {/* 4 Core High-Level KPI Cards with Bright Accents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Freight Volume (Safety Orange) */}
                  <div className="bright-card bright-card-hover p-5 rounded-2xl border-t-4 border-t-[#FF5400] bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Corridor Freight Volume
                      </span>
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono-num">
                        4,850 T
                      </span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center">
                        +14.2% <TrendingUp className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">
                      JNPT ↔ Nashik active throughput
                    </span>
                  </div>

                  {/* Card 2: On-Time SLA (Signal Emerald) */}
                  <div className="bright-card bright-card-hover p-5 rounded-2xl border-t-4 border-t-[#00C853] bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        On-Time SLA Delivery
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono-num">
                        98.4%
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Target 98.0%
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">
                      Autonomous corridor tracking active
                    </span>
                  </div>

                  {/* Card 3: Forecast Error (Solar Yellow) */}
                  <div className="bright-card bright-card-hover p-5 rounded-2xl border-t-4 border-t-[#FFB703] bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Forecast Error (WAPE)
                      </span>
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono-num">
                        4.1%
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        PyTorch LSTM
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">
                      95% Confidence Interval bounded
                    </span>
                  </div>

                  {/* Card 4: Active Transit (Vivid Coral) */}
                  <div className="bright-card bright-card-hover p-5 rounded-2xl border-t-4 border-t-[#FF1744] bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Active Transit Fleets
                      </span>
                      <Activity className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono-num">
                        24 Units
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        0 Disrupted
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">
                      Live GPS telemetry online
                    </span>
                  </div>
                </div>

                {/* Persona Quick Action Console */}
                <div className="bright-card p-6 rounded-2xl bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Persona Command Center
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Operational workflows enabled for {profile?.title}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800">
                      Role: {profile?.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <button
                      onClick={() => setActiveTab('forecasting')}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-orange-50 border-2 border-slate-200 hover:border-orange-300 text-left transition-all duration-150 group active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition">
                          Neural Demand Prediction
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Run multi-horizon LSTM predictions with 95% confidence intervals
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab('twin')}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-300 text-left transition-all duration-150 group active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          Simulate Disruption Shock
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Inject port strikes, monsoons, and highway bridge closures
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab('system')}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-rose-50 border-2 border-slate-200 hover:border-rose-300 text-left transition-all duration-150 group active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition">
                          Inspect System Diagnostics
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-700 transition" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Test RBAC guards, database fallback status, and live health
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'forecasting' && (
              <div className="bright-card p-10 rounded-2xl text-center space-y-4 bg-white border-2 border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center mx-auto text-[#FF5400]">
                  <TrendingUp className="w-7 h-7 stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Demand Forecasting Studio</h3>
                <p className="text-xs font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
                  PyTorch LSTM/GRU sequence predictor with multi-step forecasts, 95% confidence intervals, and exogenous weather/promotions feeds. Ready for Issue 02 integration.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-xs font-bold text-orange-800">
                  <CheckCircle2 className="w-4 h-4 text-orange-600" />
                  <span>Authorized for: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'routing' && (
              <div className="bright-card p-10 rounded-2xl text-center space-y-4 bg-white border-2 border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-[#00C853]">
                  <Truck className="w-7 h-7 stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Route & Fleet Optimizer</h3>
                <p className="text-xs font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Deep Reinforcement Learning (DRL) Vehicle Routing Problem agent with dynamic traffic penalties and backhaul freight matching along the Mumbai–Nashik corridor. Ready for Issue 03.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Authorized for: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="bright-card p-10 rounded-2xl text-center space-y-4 bg-white border-2 border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-[#FFB703]">
                  <FileCheck2 className="w-7 h-7 stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Trade Compliance & IDP Orchestrator</h3>
                <p className="text-xs font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Local Vector RAG for sub-second Harmonized System (HS) code classification and Google Gemini OCR/IDP extraction for Bills of Lading and Commercial Invoices. Ready for Issue 05.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Authorized for: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'twin' && (
              <div className="bright-card p-10 rounded-2xl text-center space-y-4 bg-white border-2 border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-[#FF1744]">
                  <Activity className="w-7 h-7 stroke-[2.2]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Digital Twin "What-If" Studio</h3>
                <p className="text-xs font-medium text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Discrete-event network simulation modeling multi-echelon inventory propagation, port container bottlenecks, and automated contingency routing. Ready for Issue 06.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  <CheckCircle2 className="w-4 h-4 text-rose-600" />
                  <span>Authorized for: {profile?.title}</span>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white space-y-5 border-2 border-slate-200">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Enterprise IT Admin Diagnostics Console
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Live verification of role-based header propagation and database fallback resilience
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                      Active: {currentRole}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Execute a real-time request to the restricted administrative endpoint <code className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-900 font-bold font-mono-num">/api/v1/admin/system-status</code>. 
                      Only the <strong>Enterprise IT Administrator</strong> role has permission; other roles receive an immediate HTTP 403 Forbidden with detailed RBAC denial reasons.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleTestAdminEndpoint}
                        disabled={adminLoading}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all duration-150 flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
                      >
                        <Terminal className={`w-4 h-4 ${adminLoading ? 'animate-spin text-orange-400' : 'text-orange-400'}`} />
                        <span>Run RBAC Guard Test</span>
                      </button>

                      <button
                        onClick={() => switchPersona('director')}
                        className="px-3.5 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-bold transition border border-orange-200 active:scale-[0.98]"
                      >
                        Switch to Director (Assert 403)
                      </button>

                      <button
                        onClick={() => switchPersona('admin')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition border border-emerald-200 active:scale-[0.98]"
                      >
                        Switch to Admin (Assert 200)
                      </button>
                    </div>

                    {/* Result Output */}
                    {adminOutput && (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                          <span>RBAC Authorization Succeeded (HTTP 200 OK)</span>
                        </div>
                        <pre className="text-slate-800 overflow-x-auto p-3 bg-white rounded-lg font-mono-num text-[11px] border border-emerald-200">
                          {JSON.stringify(adminOutput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {adminError && (
                      <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                          <span>RBAC Rejection Confirmed (HTTP 403 Forbidden)</span>
                        </div>
                        <div className="text-rose-900 font-mono-num text-[11px] bg-white p-3 rounded-lg border border-rose-200 font-semibold">
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
