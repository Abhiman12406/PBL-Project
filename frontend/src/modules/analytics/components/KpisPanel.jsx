import React from 'react';
import {
  TrendingUp,
  Truck,
  CheckCircle2,
  BarChart3,
  Activity,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { usePersona } from '../../../context/PersonaContext';
import { useWorkspace } from '../../../context/WorkspaceContext';
import GlassCard from '../../../ui/primitives/GlassCard';
import StatusBadge from '../../../ui/primitives/StatusBadge';
import TabularMetric from '../../../ui/primitives/TabularMetric';

export default function KpisPanel() {
  const { currentRole } = usePersona();
  const { toggleWindow } = useWorkspace();

  return (
    <div className="space-y-5 text-slate-100">
      {/* 4 Core High-Level KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Metric 1: Corridor Freight Volume */}
        <GlassCard variant="default" className="p-4 bg-slate-900/60 border-slate-700/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Corridor Freight Volume
            </span>
            <Truck className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <TabularMetric value="4,850" unit="T" size="md" />
            <StatusBadge variant="emerald" size="sm">
              +14.2% <TrendingUp className="w-2.5 h-2.5 ml-0.5 inline" />
            </StatusBadge>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            JNPT ↔ Nashik active throughput
          </p>
        </GlassCard>

        {/* Metric 2: On-Time SLA Delivery */}
        <GlassCard variant="default" className="p-4 bg-slate-900/60 border-slate-700/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              On-Time SLA Delivery
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <TabularMetric value="98.4" unit="%" size="md" />
            <StatusBadge variant="emerald" size="sm">
              Target 98.0%
            </StatusBadge>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Autonomous corridor tracking active
          </p>
        </GlassCard>

        {/* Metric 3: Forecast Error (WAPE) */}
        <GlassCard variant="default" className="p-4 bg-slate-900/60 border-slate-700/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Forecast Error (WAPE)
            </span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <TabularMetric value="4.1" unit="%" size="md" />
            <StatusBadge variant="amber" size="sm">
              PyTorch LSTM
            </StatusBadge>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            95% Confidence interval bounded
          </p>
        </GlassCard>

        {/* Metric 4: Active Transit Fleets */}
        <GlassCard variant="default" className="p-4 bg-slate-900/60 border-slate-700/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Active Transit Fleets
            </span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <TabularMetric value="24" unit="Units" size="md" />
            <StatusBadge variant="cyan" size="sm">
              0 Disrupted
            </StatusBadge>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Live 1Hz GPS telemetry online
          </p>
        </GlassCard>
      </div>

      {/* Multi-Echelon Corridor Stock Health */}
      <GlassCard variant="subtle" className="p-4 border-slate-700/70 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200">
              Multi-Echelon Facility Capacity Status
            </h3>
          </div>
          <StatusBadge variant="emerald" size="sm">Nominal</StatusBadge>
        </div>

        <div className="space-y-2.5">
          {[
            { node: 'PORT-JNPT-01', name: 'JNPT Maritime Port', fill: 84, color: 'bg-emerald-500' },
            { node: 'DC-BHW-01', name: 'Bhiwandi Central DC', fill: 76, color: 'bg-emerald-500' },
            { node: 'HUB-THN-01', name: 'Thane Regional Hub', fill: 68, color: 'bg-emerald-500' },
            { node: 'DEP-NSK-01', name: 'Nashik Agro Depot', fill: 55, color: 'bg-amber-500' },
            { node: 'FC-PUN-01', name: 'Pune Auto FC', fill: 82, color: 'bg-emerald-500' }
          ].map((item) => (
            <div key={item.node} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{item.name}</span>
                <span className="font-mono text-slate-400 font-bold tabular-nums">{item.fill}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-300`}
                  style={{ width: `${item.fill}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Quick Launch Service Workflows */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-300">
          Operational Shortcuts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => toggleWindow('routing')}
            className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/70 hover:border-emerald-500/50 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                Launch Route Optimizer
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Backhaul matching & dynamic detours</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            onClick={() => toggleWindow('sentinel')}
            className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/70 hover:border-cyan-500/50 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                Autonomous Sentinel HUD
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Corridor hazard telemetry & DRL response</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>
    </div>
  );
}
