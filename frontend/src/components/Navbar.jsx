import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  Truck, 
  FileCheck2, 
  ShieldAlert, 
  ChevronDown, 
  Check, 
  Database, 
  Server, 
  Cpu, 
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import { usePersona } from '../context/PersonaContext';
import { api } from '../services/api';

const ROLE_ICONS = {
  director: Layers,
  dispatcher: Truck,
  customs: FileCheck2,
  admin: Cpu
};

const BADGE_COLORS = {
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
};

const GLOW_COLORS = {
  indigo: 'shadow-indigo-500/20',
  emerald: 'shadow-emerald-500/20',
  amber: 'shadow-amber-500/20',
  cyan: 'shadow-cyan-500/20'
};

export default function Navbar() {
  const { currentRole, profile, rolesMap, switchPersona } = usePersona();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [latency, setLatency] = useState(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const data = await api.getHealth();
      setHealth(data);
      setLatency(Math.round(performance.now() - start));
    } catch {
      setHealth(null);
      setLatency(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const ActiveIcon = ROLE_ICONS[currentRole] || Layers;
  const badgeColorClass = BADGE_COLORS[profile?.badge_color || 'indigo'];
  const glowColorClass = GLOW_COLORS[profile?.badge_color || 'indigo'];

  const isHealthy = Boolean(health);
  const isFallbackDb = health?.services?.database?.status === 'fallback_in_memory';
  const isFallbackRedis = health?.services?.redis?.status === 'fallback_in_memory';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Brand & Platform Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 shadow-lg">
          <Zap className="w-5 h-5 text-indigo-400" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Cognitive Logistics
            </h1>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Autonomous Corridor & Dynamic Freight Intelligence
          </p>
        </div>
      </div>

      {/* Right controls: Health Indicator & Persona Switcher */}
      <div className="flex items-center gap-3">
        {/* Live System Health Badge */}
        <div className="relative">
          <button
            onClick={() => setHealthModalOpen(!healthModalOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-xs transition-all duration-200"
            title="Click to view detailed system health"
          >
            <span className="relative flex h-2 w-2">
              {isHealthy ? (
                <>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFallbackDb ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isFallbackDb ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-slate-300 font-medium hidden md:inline">
              {isHealthy ? (isFallbackDb ? 'In-Memory Fallback' : 'System Online') : 'Backend Offline'}
            </span>
            {latency !== null && (
              <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">
                {latency}ms
              </span>
            )}
          </button>

          {/* Health Details Popover */}
          {healthModalOpen && (
            <div className="absolute right-0 mt-2 w-72 p-4 rounded-xl glass-panel-glow bg-slate-900/95 border border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">System Infrastructure</span>
                </div>
                <button
                  onClick={fetchHealth}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                  disabled={healthLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                {/* API Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    FastAPI Engine
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${isHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {isHealthy ? 'Healthy' : 'Disconnected'}
                  </span>
                </div>

                {/* Database Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    Relational Storage
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${!isFallbackDb && isHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {health?.services?.database?.dialect === 'postgresql' ? 'PostgreSQL 17' : 'SQLite In-Memory'}
                  </span>
                </div>

                {/* pgvector Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 pl-5">Vector Extension</span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {health?.services?.database?.pgvector ? 'pgvector Active' : 'Fallback Vector Match'}
                  </span>
                </div>

                {/* Redis Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    Redis Cache
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${!isFallbackRedis && isHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {health?.services?.redis?.is_fallback ? 'In-Memory Dict' : 'Redis 7 Live'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Active Corridor</span>
                <span className="text-slate-200 font-medium">Mumbai – Nashik</span>
              </div>
            </div>
          )}
        </div>

        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 shadow-md ${badgeColorClass} ${glowColorClass}`}
          >
            <ActiveIcon className="w-4 h-4" />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{profile?.title || 'Persona'}</div>
              <div className="text-[10px] opacity-75 capitalize">{currentRole} Mode</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Persona Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel-glow bg-slate-900/95 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="text-xs font-semibold text-white">Switch Active Persona</div>
                <div className="text-[11px] text-slate-400">
                  Role-based view permissions & API headers update dynamically
                </div>
              </div>

              <div className="mt-1 space-y-1">
                {Object.entries(rolesMap).map(([roleKey, roleItem]) => {
                  const Icon = ROLE_ICONS[roleKey] || Layers;
                  const isSelected = currentRole === roleKey;
                  const itemColor = BADGE_COLORS[roleItem.badge_color || 'indigo'];

                  return (
                    <button
                      key={roleKey}
                      onClick={() => {
                        switchPersona(roleKey);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                        isSelected 
                          ? 'bg-slate-800/90 border border-slate-700 shadow-sm' 
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-lg border ${itemColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white truncate">
                            {roleItem.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 ml-1 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {roleItem.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {roleItem.permissions?.views?.map(v => (
                            <span key={v} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
