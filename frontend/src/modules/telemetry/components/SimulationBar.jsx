import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  AlertTriangle,
  Radio,
  Clock,
  Gauge,
  Flame,
  CheckCircle2,
  Lock,
  ChevronDown
} from 'lucide-react';
import { usePersona } from '../../../context/PersonaContext';
import { telemetryWS } from '../../../services/websocket';
import { api } from '../../../services/api';

const ROADBLOCK_PRESETS = [
  {
    id: 'RB-KASARA-01',
    name: 'Kasara Ghat Monsoon Landslide',
    corridor_node: 'KSR',
    latitude: 19.6967,
    longitude: 73.5611,
    radius_km: 15.0,
    severity: 'CRITICAL',
    description: 'Rockfall blocked NH-48 uphill section. 10x penalty edge applied.',
    penalty_multiplier: 10.0
  },
  {
    id: 'RB-MAJHIWADA-02',
    name: 'Thane Majhiwada Chemical Spill',
    corridor_node: 'THN',
    latitude: 19.2183,
    longitude: 72.9781,
    radius_km: 10.0,
    severity: 'HIGH',
    description: 'Hazardous tanker overturned on flyover. 8x congestion penalty.',
    penalty_multiplier: 8.0
  },
  {
    id: 'RB-BHIWANDI-03',
    name: 'Bhiwandi Bypass Freight Gridlock',
    corridor_node: 'BHW',
    latitude: 19.2967,
    longitude: 73.0631,
    radius_km: 12.0,
    severity: 'HIGH',
    description: 'Severe multi-vehicle logistics gridlock at warehousing hub.',
    penalty_multiplier: 6.0
  }
];

export default function SimulationBar({ onRerouteEvent }) {
  const { canDo, currentRole } = usePersona();
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');
  const [simState, setSimState] = useState({
    is_running: false,
    speed_multiplier: 1.0,
    elapsed_seconds: 0,
    elapsed_formatted: '00:00:00',
    simulated_time: '08:00:00 AM'
  });
  const [activeRoadblocks, setActiveRoadblocks] = useState([]);
  const [selectedRoadblock, setSelectedRoadblock] = useState(ROADBLOCK_PRESETS[0]);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const canControl = (typeof canDo === 'function' ? canDo('telemetry_control') : false) || currentRole === 'admin' || currentRole === 'dispatcher' || currentRole === 'director';
  const canInject = (typeof canDo === 'function' ? canDo('inject_roadblock') : false) || currentRole === 'admin' || currentRole === 'dispatcher' || currentRole === 'director';

  // Connect WebSocket & subscribe to events
  useEffect(() => {
    telemetryWS.connect();

    const unsubStatus = telemetryWS.subscribe('status', (st) => {
      setWsStatus(st);
    });

    const unsubState = telemetryWS.subscribe('state', (state) => {
      if (state) {
        setSimState(prev => ({ ...prev, ...state }));
      }
    });

    const unsubTick = telemetryWS.subscribe('tick', (tickMsg) => {
      if (tickMsg.simulation) {
        setSimState(prev => ({ ...prev, ...tickMsg.simulation }));
      }
      if (tickMsg.active_roadblocks) {
        setActiveRoadblocks(tickMsg.active_roadblocks);
      }
    });

    const unsubReroute = telemetryWS.subscribe('reroute', (event) => {
      if (event.roadblock) {
        setActiveRoadblocks(prev => {
          const exists = prev.some(r => r.roadblock_id === event.roadblock.roadblock_id);
          return exists ? prev : [...prev, event.roadblock];
        });
      }
      if (onRerouteEvent) {
        onRerouteEvent(event);
      }
      setStatusMessage({
        type: 'warning',
        text: `🚨 Dynamic Re-routing Broadcast: ${event.affected_vehicles?.join(', ')} diverted around ${event.roadblock?.name} (+21.6 km detour).`
      });
      setTimeout(() => setStatusMessage(null), 9000);
    });

    const unsubCleared = telemetryWS.subscribe('roadblocksCleared', () => {
      setActiveRoadblocks([]);
      setStatusMessage({
        type: 'success',
        text: '✅ All corridor disruptions cleared. Baseline highway trajectories restored.'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    });

    // Also fetch initial state via REST fallback
    api.getTelemetryState().then(res => {
      if (res.simulation) setSimState(res.simulation);
      if (res.active_roadblocks) setActiveRoadblocks(res.active_roadblocks);
    }).catch(err => console.debug('Initial telemetry state REST load:', err));

    return () => {
      unsubStatus();
      unsubState();
      unsubTick();
      unsubReroute();
      unsubCleared();
    };
  }, [onRerouteEvent]);

  // Controls handlers
  const handleTogglePlay = async () => {
    if (!canControl) return;
    setActionLoading(true);
    try {
      if (simState.is_running) {
        telemetryWS.pause();
        await api.controlTelemetry('PAUSE');
        setSimState(s => ({ ...s, is_running: false }));
      } else {
        telemetryWS.play();
        await api.controlTelemetry('PLAY', simState.speed_multiplier);
        setSimState(s => ({ ...s, is_running: true }));
      }
    } catch (e) {
      console.warn('Play/pause error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStep = async () => {
    if (!canControl) return;
    setActionLoading(true);
    try {
      telemetryWS.step(15);
      await api.controlTelemetry('STEP', simState.speed_multiplier, 15);
    } catch (e) {
      console.warn('Step error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpeedChange = async (speed) => {
    if (!canControl) return;
    try {
      telemetryWS.setSpeed(speed);
      await api.controlTelemetry('SET_SPEED', speed);
      setSimState(s => ({ ...s, speed_multiplier: speed }));
    } catch (e) {
      console.warn('Speed set error:', e);
    }
  };

  const handleReset = async () => {
    if (!canControl) return;
    setActionLoading(true);
    try {
      telemetryWS.reset();
      await api.controlTelemetry('RESET');
      setSimState({
        is_running: false,
        speed_multiplier: 1.0,
        elapsed_seconds: 0,
        elapsed_formatted: '00:00:00',
        simulated_time: '08:00:00 AM'
      });
      setActiveRoadblocks([]);
    } catch (e) {
      console.warn('Reset error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // One-click roadblock injection
  const handleInjectRoadblock = async (preset = selectedRoadblock) => {
    if (!canInject) return;
    setActionLoading(true);
    setShowPresetsMenu(false);
    try {
      const payload = {
        roadblock_id: preset.id,
        name: preset.name,
        corridor_node: preset.corridor_node,
        latitude: preset.latitude,
        longitude: preset.longitude,
        radius_km: preset.radius_km,
        severity: preset.severity,
        description: preset.description,
        penalty_multiplier: preset.penalty_multiplier,
        target_vehicle_id: 'TRK-MH-01'
      };

      telemetryWS.injectRoadblock(payload);
      const res = await api.injectDisruption(payload);
      if (res.roadblock) {
        setActiveRoadblocks(prev => {
          const exists = prev.some(r => r.roadblock_id === res.roadblock.roadblock_id);
          return exists ? prev : [...prev, res.roadblock];
        });
      }
      if (onRerouteEvent) {
        onRerouteEvent(res);
      }
    } catch (e) {
      console.error('Roadblock injection failed:', e);
      setStatusMessage({
        type: 'error',
        text: `Failed to inject disruption: ${e.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearRoadblocks = async () => {
    if (!canInject) return;
    setActionLoading(true);
    try {
      telemetryWS.clearRoadblocks();
      await api.clearDisruptions();
      setActiveRoadblocks([]);
    } catch (e) {
      console.error('Clear roadblocks failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Main Playback Bar Container */}
      <div className="cyber-glass p-3 sm:p-4 rounded-2xl bg-[#0b0f19]/90 border border-slate-800 text-slate-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Left Cluster: Live Clock & WebSocket Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pulsing WS status pill */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="relative flex h-2 w-2">
                {wsStatus === 'CONNECTED' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </>
                ) : wsStatus === 'CONNECTING' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                {wsStatus === 'CONNECTED' ? 'WS Live' : wsStatus === 'CONNECTING' ? 'Connecting' : 'Reconnecting'}
              </span>
            </div>

            {/* Simulated Time Readout */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-white shadow-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-extrabold tracking-tight text-white">
                  {simState.simulated_time}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  +{simState.elapsed_formatted}
                </span>
              </div>
            </div>
          </div>

          {/* Center Cluster: Playback Controls (Play, Pause, Step, Speed, Reset) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Play / Pause Toggle Button */}
            <button
              onClick={handleTogglePlay}
              disabled={!canControl || actionLoading}
              title={!canControl ? 'Permission required: telemetry_control' : simState.is_running ? 'Pause Simulation' : 'Start Simulation'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 shadow-sm active:scale-[0.98] cursor-pointer ${
                simState.is_running
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  : 'bg-[#FF5400] hover:bg-[#ff6a1a] text-white shadow-orange-500/20'
              } ${!canControl ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {simState.is_running ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            {/* Step Button */}
            <button
              onClick={handleStep}
              disabled={!canControl || actionLoading}
              title={!canControl ? 'Permission required' : 'Advance simulation clock by 15 seconds'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <SkipForward className="w-3 h-3 text-slate-400" />
              <span>+15s</span>
            </button>

            {/* Speed Multiplier Pill Selectors: 1x, 2x, 5x */}
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-slate-800">
              {[1.0, 2.0, 5.0].map((spd) => {
                const isActive = Math.abs(simState.speed_multiplier - spd) < 0.1;
                return (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    disabled={!canControl}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition font-mono cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>

            {/* Reset Simulation */}
            <button
              onClick={handleReset}
              disabled={!canControl || actionLoading}
              title="Reset simulation to initial state"
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Cluster: One-Click "Inject Roadblock" Action & Disruption Controls */}
          <div className="flex items-center gap-2 relative shrink-0">
            {activeRoadblocks.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 bg-rose-950/50 px-2.5 py-1.5 rounded-xl border border-rose-800/80">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>{activeRoadblocks.length} Roadblock Active</span>
                </span>
                <button
                  onClick={handleClearRoadblocks}
                  disabled={!canInject || actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Clear Disruption</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex rounded-xl shadow-xs">
                {/* Primary 1-Click Action */}
                <button
                  onClick={() => handleInjectRoadblock(selectedRoadblock)}
                  disabled={!canInject || actionLoading}
                  title={!canInject ? 'Permission required: inject_roadblock' : `1-Click: Inject ${selectedRoadblock.name}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all duration-150 shadow-md shadow-rose-950 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  <span>Inject Roadblock</span>
                </button>

                {/* Dropdown chevron to pick other presets */}
                <button
                  onClick={() => setShowPresetsMenu(p => !p)}
                  disabled={!canInject}
                  title="Choose incident scenario"
                  className="px-2 py-1.5 rounded-r-xl bg-rose-700 hover:bg-rose-600 text-white border-l border-rose-500/50 transition cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Roadblock Preset Selector Dropdown */}
                {showPresetsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#0b0f19] rounded-xl shadow-2xl border border-slate-700/80 z-50 p-2 space-y-1 backdrop-blur-xl">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                      Select Corridor Incident
                    </div>
                    {ROADBLOCK_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedRoadblock(preset);
                          handleInjectRoadblock(preset);
                          setShowPresetsMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition cursor-pointer ${
                          selectedRoadblock.id === preset.id
                            ? 'bg-rose-950/60 text-rose-200 font-bold border border-rose-800/80'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-white">{preset.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Alert Banner when Re-Routing occurs */}
      {statusMessage && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
          statusMessage.type === 'warning'
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${statusMessage.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold px-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
