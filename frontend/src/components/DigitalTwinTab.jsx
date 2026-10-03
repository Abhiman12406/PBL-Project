import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  CloudRain,
  Compass,
  ShieldCheck,
  Clock,
  Fuel,
  Package,
  Layers,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Send,
  Zap,
  Split,
  Route
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { api } from '../services/api';
import { usePersona } from '../context/PersonaContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DigitalTwinTab() {
  const { profile } = usePersona();

  // State
  const [selectedScenarioId, setSelectedScenarioId] = useState('port_strike');
  const [shockIntensity, setShockIntensity] = useState(75);
  const [enableMitigation, setEnableMitigation] = useState(true);
  const [horizonDays, setHorizonDays] = useState(7);

  // Simulation Results
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState('DC-BHW-01');
  const [chartMetric, setChartMetric] = useState('stock'); // 'stock' | 'delay'
  const [dispatchedDirectives, setDispatchedDirectives] = useState({});

  // Run Simulation
  const runSimulation = useCallback(async (
    scenarioId = selectedScenarioId,
    intensity = shockIntensity,
    mit = enableMitigation,
    horizon = horizonDays
  ) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        scenario_id: scenarioId,
        shock_intensity: Number(intensity),
        enable_mitigation: Boolean(mit),
        simulation_horizon_days: Number(horizon)
      };

      const result = await api.simulateTwinScenario(payload);
      setSimulationData(result);
    } catch (err) {
      console.error('Twin simulation execution failed:', err);
      setError(err.message || 'Simulation execution failed.');
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, shockIntensity, enableMitigation, horizonDays]);

  // Initial simulation run on mount
  useEffect(() => {
    runSimulation('port_strike', 75, true, 7);
  }, [runSimulation]);

  // Intensity Severity Rating helper
  const getSeverityBadge = (intensity) => {
    if (intensity <= 30) {
      return { label: 'Level 1: Mild Shock', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' };
    } else if (intensity <= 60) {
      return { label: 'Level 2: Moderate Disruption', color: 'bg-amber-50 text-amber-700 border-amber-300' };
    } else if (intensity <= 80) {
      return { label: 'Level 3: Severe Bottleneck', color: 'bg-orange-50 text-orange-700 border-orange-300' };
    } else {
      return { label: 'Level 4: Catastrophic Breakdown', color: 'bg-rose-50 text-rose-700 border-rose-300' };
    }
  };

  const currentSeverity = useMemo(() => getSeverityBadge(shockIntensity), [shockIntensity]);

  // Selected Node Details
  const activeNodeDetails = useMemo(() => {
    if (!simulationData || !simulationData.nodes) return null;
    return simulationData.nodes.find(n => n.node_id === selectedNodeId) || simulationData.nodes[0];
  }, [simulationData, selectedNodeId]);

  // Handle Directive Dispatch Mock
  const handleDispatchDirective = (index) => {
    setDispatchedDirectives(prev => ({
      ...prev,
      [index]: true
    }));
  };

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!simulationData || !simulationData.timeline_events) return null;

    const labels = simulationData.timeline_events.map(e => e.label);

    if (chartMetric === 'stock') {
      return {
        labels,
        datasets: [
          {
            label: 'Baseline Unmitigated Stock (Units)',
            data: simulationData.timeline_events.map(e => e.baseline_stock),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#ef4444',
            pointRadius: 4,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Mitigated Buffer Stock (Units)',
            data: simulationData.timeline_events.map(e => e.mitigated_stock),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
            tension: 0.35,
            fill: true
          }
        ]
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'Baseline Cumulative Delay (Hours)',
            data: simulationData.timeline_events.map(e => e.baseline_cum_delay),
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#f97316',
            pointRadius: 4,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Mitigated Cumulative Delay (Hours)',
            data: simulationData.timeline_events.map(e => e.mitigated_cum_delay),
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#0284c7',
            pointRadius: 4,
            tension: 0.3,
            fill: true
          }
        ]
      };
    }
  }, [simulationData, chartMetric]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'JetBrains Mono', size: 11 } }
      }
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header Banner & Quick Diagnostics */}
      <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>Digital Twin Engine Active • SLA &lt; 5.0s</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Digital Twin "What-If" Scenario Studio
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
              Stress-test catastrophic operational shocks across the Western India logistics corridor (JNPT, Bhiwandi, Thane, Nashik, Pune) with discrete-event simulation and automated mitigation routing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Authorized Persona</div>
              <div className="text-xs font-extrabold text-slate-800">{profile?.title || 'Supply Chain Director'}</div>
            </div>
            <button
              onClick={() => runSimulation(selectedScenarioId, shockIntensity, enableMitigation, horizonDays)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5400] text-white text-xs font-bold shadow-md hover:bg-[#e04a00] transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {simulationData && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Active Scenario: <strong className="text-slate-900">{simulationData.scenario_name}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Execution Time: <strong className="font-mono text-emerald-700">{simulationData.execution_time_seconds}s</strong></span>
              <span className="text-slate-300">|</span>
              <span>Horizon: <strong className="text-slate-900">{simulationData.simulation_horizon_days} Days</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Mitigation Routing:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${simulationData.enable_mitigation ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {simulationData.enable_mitigation ? 'AUTOMATED ACTIVE' : 'DISABLED (BASELINE ONLY)'}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Scenario Presets & Shock Parameter Controls */}
      <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-200 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#ff5400]" />
              Select Operational Shock Scenario
            </h3>
            <span className="text-xs font-medium text-slate-500">Pick preset or configure custom shock</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Preset 1: Port Strike */}
            <div
              onClick={() => {
                setSelectedScenarioId('port_strike');
                setShockIntensity(75);
                runSimulation('port_strike', 75, enableMitigation, horizonDays);
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                selectedScenarioId === 'port_strike'
                  ? 'border-[#ff5400] bg-orange-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-[#ff5400]">
                  <Anchor className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                  Maritime Strike
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Port Labor Strike at JNPT</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Dockworker crane shutdown halts container gates. Dwell surges to 120h+, throttling Bhiwandi DC inbound.
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Affected: JNPT Terminal</span>
                <span className="text-[#ff5400]">Preset: 75%</span>
              </div>
            </div>

            {/* Preset 2: Monsoon Closures */}
            <div
              onClick={() => {
                setSelectedScenarioId('monsoon_closures');
                setShockIntensity(70);
                runSimulation('monsoon_closures', 70, enableMitigation, horizonDays);
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                selectedScenarioId === 'monsoon_closures'
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <CloudRain className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Monsoon Mudslide
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Extreme Monsoon Road Closures</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Torrential 180mm rain triggers Kasara Ghat NH-160 mudslides, cutting off Nashik Agro Corridor convoys.
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Affected: Kasara / Nashik</span>
                <span className="text-blue-600">Preset: 70%</span>
              </div>
            </div>

            {/* Preset 3: Bridge Failure */}
            <div
              onClick={() => {
                setSelectedScenarioId('bridge_failure');
                setShockIntensity(85);
                runSimulation('bridge_failure', 85, enableMitigation, horizonDays);
              }}
              className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                selectedScenarioId === 'bridge_failure'
                  ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  Viaduct Fracture
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Expressway Bridge Failure</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Structural viaduct fault on Khandala Expressway shuts heavy freight to Pune Auto Hub.
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Affected: Pune Expressway</span>
                <span className="text-rose-600">Preset: 85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Slider & Control Parameters */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Slider */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="shock-intensity-slider" className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>Shock Disruption Intensity:</span>
                <span className="font-mono text-sm text-[#ff5400] font-black">{shockIntensity}%</span>
              </label>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${currentSeverity.color}`}>
                {currentSeverity.label}
              </span>
            </div>
            <input
              id="shock-intensity-slider"
              type="range"
              min="1"
              max="100"
              value={shockIntensity}
              onChange={(e) => setShockIntensity(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ff5400]"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>1% (Minimal Friction)</span>
              <span>25% (Mild Delay)</span>
              <span>50% (Significant Strain)</span>
              <span>75% (Severe Gridlock)</span>
              <span>100% (Complete Outage)</span>
            </div>
          </div>

          {/* Horizon & Mitigation Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
            <div className="w-full sm:w-auto">
              <label htmlFor="simulation-horizon-select" className="block text-[11px] font-bold text-slate-500 mb-1">Horizon</label>
              <select
                id="simulation-horizon-select"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                <option value={7}>7 Days (Standard)</option>
                <option value={14}>14 Days (Extended)</option>
                <option value={21}>21 Days (Strategic)</option>
              </select>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">Mitigation</div>
                <div className="text-[10px] text-slate-500">Auto Reroute</div>
              </div>
              <button
                type="button"
                onClick={() => setEnableMitigation(!enableMitigation)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableMitigation ? 'bg-[#00c853]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enableMitigation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Side-by-Side Comparative KPI Summary Matrix */}
      {simulationData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Comparative Impact Metrics (Baseline vs. Mitigated)
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {simulationData.comparative_delta?.sla_delay_reduction_pct}% SLA Delay Reduced via Contingency Rerouting
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Risk Index */}
            <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Composite Risk Index</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  -{simulationData.comparative_delta?.risk_reduction_pct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black font-mono-num text-slate-900">
                    {simulationData.mitigated_metrics?.risk_index}
                    <span className="text-xs font-normal text-slate-400"> / 100</span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mitigated Risk</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono-num text-rose-600 line-through opacity-70">
                    {simulationData.baseline_metrics?.risk_index}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">Baseline Shock</div>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${simulationData.mitigated_metrics?.risk_index}%` }}
                />
              </div>
            </div>

            {/* KPI 2: SLA Delay Hours */}
            <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SLA Delay</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  -{simulationData.comparative_delta?.sla_delay_reduction_pct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black font-mono-num text-slate-900">
                    {simulationData.mitigated_metrics?.sla_delay_hours}h
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mitigated Delay</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono-num text-rose-600 line-through opacity-70">
                    {simulationData.baseline_metrics?.sla_delay_hours}h
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">Baseline Shock</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Saves approx. {Math.round(simulationData.baseline_metrics?.sla_delay_hours - simulationData.mitigated_metrics?.sla_delay_hours)} delivery delay hours across corridor.
              </div>
            </div>

            {/* KPI 3: Holding Cost Surge */}
            <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Holding & Demurrage</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Save ₹{Math.round(simulationData.comparative_delta?.cost_savings_inr / 1000)}k
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black font-mono-num text-slate-900">
                    ₹{(simulationData.mitigated_metrics?.holding_cost_inr / 1000).toFixed(1)}k
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                    <span>Surge: +{simulationData.mitigated_metrics?.holding_cost_surge_pct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono-num text-rose-600 line-through opacity-70">
                    ₹{(simulationData.baseline_metrics?.holding_cost_inr / 1000).toFixed(1)}k
                  </div>
                  <div className="text-[11px] font-semibold text-rose-600">+{simulationData.baseline_metrics?.holding_cost_surge_pct}%</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Prevents port yard container demurrage accumulation.
              </div>
            </div>

            {/* KPI 4: CO2 Carbon Impact */}
            <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport Carbon (CO2)</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {simulationData.comparative_delta?.co2_delta_kg > 0 ? `+${simulationData.comparative_delta.co2_delta_kg} kg` : 'Optimized'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black font-mono-num text-slate-900">
                    {Math.round(simulationData.mitigated_metrics?.co2_emissions_kg).toLocaleString()}
                    <span className="text-xs font-normal text-slate-400"> kg</span>
                  </div>
                  <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                    <Fuel className="w-3.5 h-3.5" />
                    <span>Detour Cruise Mode</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono-num text-slate-600">
                    {Math.round(simulationData.baseline_metrics?.co2_emissions_kg).toLocaleString()} kg
                  </div>
                  <div className="text-[11px] font-semibold text-rose-500">Idling Waste</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Bypass routing trades +25km detour to eliminate heavy engine idling.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Multi-Echelon Network Topology Node Status Diagram */}
      {simulationData && (
        <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#ff5400]" />
                Multi-Echelon Network Topology Status Diagram
              </h3>
              <p className="text-xs text-slate-500">
                Click any node or corridor to inspect live inventory balances and replenishment flows
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Stressed
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Disrupted
              </span>
              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Rerouted
              </span>
            </div>
          </div>

          {/* Interactive Topology Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {simulationData.nodes?.map((node) => {
              const isSelected = selectedNodeId === node.node_id;
              const statusColor = {
                healthy: 'border-emerald-300 bg-emerald-50/40 text-emerald-800',
                stressed: 'border-amber-300 bg-amber-50/40 text-amber-800',
                critical: 'border-rose-400 bg-rose-50 text-rose-800',
                disrupted: 'border-rose-500 bg-rose-100 text-rose-900',
                rerouted: 'border-blue-400 bg-blue-50 text-blue-900'
              }[node.mitigated.status] || 'border-slate-200 bg-white text-slate-800';

              const tierLabel = {
                port: 'Tier 1 Gateway',
                central_dc: 'Tier 2 Mega DC',
                regional_hub: 'Tier 3 Hub',
                regional_depot: 'Tier 3 Depot',
                fulfillment_center: 'Tier 3 Fulfillment'
              }[node.node_type] || 'Node';

              return (
                <div
                  key={node.node_id}
                  onClick={() => setSelectedNodeId(node.node_id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[#ff5400] shadow-md ring-2 ring-orange-200 bg-white'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {tierLabel}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusColor}`}>
                      {node.mitigated.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 truncate" title={node.name}>
                    {node.name}
                  </h4>
                  <div className="text-[11px] font-semibold text-slate-500">{node.city}</div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Stock:</span>
                      <span className="font-mono font-bold text-slate-800">{node.mitigated.stock?.toLocaleString()} u</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#ff5400] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, node.mitigated.capacity_utilization_pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Util: {node.mitigated.capacity_utilization_pct}%</span>
                      <span>Lead: {node.lead_time_days}d</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#ff5400] rotate-45 rounded-xs" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Node Detail Inspector Drawer */}
          {activeNodeDetails && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-[#ff5400]">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {activeNodeDetails.name} <span className="font-mono text-xs text-slate-400">({activeNodeDetails.node_id})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      {activeNodeDetails.city} • Holding Rate: ₹{activeNodeDetails.holding_cost_rate}/unit/day • Replenishment Lead Time: {activeNodeDetails.lead_time_days} days
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Capacity</div>
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {activeNodeDetails.capacity_units?.toLocaleString()} units
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side node metrics: Baseline vs Mitigated */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Mitigated Stock Level</div>
                  <div className="text-base font-extrabold font-mono text-emerald-700">
                    {activeNodeDetails.mitigated?.stock?.toLocaleString()} units
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Baseline was: {activeNodeDetails.baseline?.stock?.toLocaleString()} units
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Capacity Utilization</div>
                  <div className="text-base font-extrabold font-mono text-slate-900">
                    {activeNodeDetails.mitigated?.capacity_utilization_pct}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Baseline was: {activeNodeDetails.baseline?.capacity_utilization_pct}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Stockout Probability</div>
                  <div className="text-base font-extrabold font-mono text-emerald-700">
                    {activeNodeDetails.mitigated?.stockout_probability_pct}%
                  </div>
                  <div className="text-[10px] text-rose-500 font-bold">
                    Baseline was: {activeNodeDetails.baseline?.stockout_probability_pct}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Unmet Customer Demand</div>
                  <div className="text-base font-extrabold font-mono text-emerald-700">
                    {activeNodeDetails.mitigated?.unmet_demand_units} units
                  </div>
                  <div className="text-[10px] text-rose-500 font-bold">
                    Baseline deficit: {activeNodeDetails.baseline?.unmet_demand_units} units
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inter-Node Corridor Status Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#ff5400]" />
              Corridor Transit &amp; Contingency Bypass Status
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Corridor</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Normal</th>
                    <th className="p-3">Baseline Shock</th>
                    <th className="p-3">Mitigated Transit</th>
                    <th className="p-3">Contingency Bypass Alignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {simulationData.links?.map((link) => {
                    const isRerouted = link.mitigated?.is_rerouted;
                    return (
                      <tr key={link.link_id} className={isRerouted ? 'bg-blue-50/30' : 'bg-white'}>
                        <td className="p-3 font-bold text-slate-900">
                          {link.corridor_name}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{link.distance_km} km</td>
                        <td className="p-3 font-mono text-slate-600">{link.nominal_hours}h</td>
                        <td className="p-3">
                          <span className={`font-mono font-bold ${link.baseline.delay_hours > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {link.baseline.simulated_hours}h
                            {link.baseline.delay_hours > 0 && ` (+${link.baseline.delay_hours}h)`}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-emerald-700">
                            {link.mitigated.simulated_hours}h
                            {link.mitigated.delay_hours > 0 && ` (+${link.mitigated.delay_hours}h)`}
                          </span>
                        </td>
                        <td className="p-3">
                          {isRerouted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              <Split className="w-3 h-3" />
                              {link.alternative_route?.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard Direct Alignment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Trajectory Simulation Timeline Chart */}
      {chartData && (
        <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff5400]" />
                Simulation Trajectory Over Time
              </h3>
              <p className="text-xs text-slate-500">
                Discrete-event ripple effect comparison across the {simulationData.simulation_horizon_days}-day horizon
              </p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setChartMetric('stock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'stock' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Network Inventory Stock
              </button>
              <button
                onClick={() => setChartMetric('delay')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartMetric === 'delay' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cumulative SLA Delay Hours
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* 6. Automated Contingency Rerouting & Mitigation Recommendations */}
      {simulationData && (
        <div className="bright-card p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ff5400]" />
                Automated Contingency Directives &amp; Actionable Playbook
              </h3>
              <p className="text-xs text-slate-500">
                Actionable supply chain rerouting directives synthesized by the Cognitive Digital Twin Engine
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#ff5400] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
              {simulationData.contingency_recommendations?.length || 0} Directives Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simulationData.contingency_recommendations?.map((rec, idx) => {
              const priorityBadge = {
                CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300',
                HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
                MEDIUM: 'bg-amber-100 text-amber-800 border-amber-300',
                LOW: 'bg-slate-100 text-slate-700 border-slate-300'
              }[rec.priority] || 'bg-slate-100 text-slate-700';

              const isDispatched = dispatchedDirectives[idx];

              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${priorityBadge}`}>
                        {rec.priority} PRIORITY
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {rec.expected_impact}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {rec.action}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rec.details}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      Target: TMS &amp; WMS Dispatch
                    </span>
                    <button
                      onClick={() => handleDispatchDirective(idx)}
                      disabled={isDispatched}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                        isDispatched
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isDispatched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Dispatched to TMS</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Directive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
