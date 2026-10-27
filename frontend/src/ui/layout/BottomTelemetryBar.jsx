import React, { useState, useEffect } from 'react';
import {
  Truck,
  Eye,
  Navigation,
  Rotate3d,
  Sun,
  Moon,
  Play,
  Pause,
  FastForward,
  Gauge,
  Thermometer,
  BatteryCharging
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { telemetryWS } from '../../services/websocket';
import { CAMERA_MODES, CAMERA_MODE_METADATA } from '../../utils/cameraControllers';
import { TabularMetric } from '../primitives';

const CAMERA_BUTTONS = [
  { mode: CAMERA_MODES.CHASE, icon: Truck, label: 'Chase', hotkey: '1' },
  { mode: CAMERA_MODES.COCKPIT, icon: Eye, label: 'Cockpit', hotkey: '2' },
  { mode: CAMERA_MODES.DRONE, icon: Navigation, label: 'Drone', hotkey: '3' },
  { mode: CAMERA_MODES.FREE_ORBIT, icon: Rotate3d, label: 'Orbit', hotkey: '4' }
];

export default function BottomTelemetryBar({
  className = '',
  cameraMode: controlledCameraMode,
  onSelectCameraMode
}) {
  const {
    cameraMode: workspaceCameraMode,
    setCameraMode: setWorkspaceCameraMode,
    simState,
    setSimState,
    activeVehicleId
  } = useWorkspace() || {};

  const activeMode = controlledCameraMode || workspaceCameraMode || CAMERA_MODES.CHASE;

  const handleCameraChange = (mode) => {
    if (onSelectCameraMode) {
      onSelectCameraMode(mode);
    } else if (setWorkspaceCameraMode) {
      setWorkspaceCameraMode(mode);
    }
  };

  // Telemetry stream state
  const [telemetryData, setTelemetryData] = useState({
    speedKmh: 64,
    batterySoc: 94.2,
    cargoTempC: 4.2,
    distanceKm: 42.8,
    isRerouted: false
  });

  const isNight = Boolean(simState?.is_night);
  const isRunning = Boolean(simState?.is_running);
  const currentSpeedMult = simState?.speed_multiplier || 1.0;

  // Listen to WebSocket telemetry ticks
  useEffect(() => {
    telemetryWS.connect();
    const unsubscribe = telemetryWS.subscribe('tick', (tickMsg) => {
      if (!tickMsg) return;
      const vId = activeVehicleId || 'TRK-MH-01';
      const vehicle = tickMsg.vehicles?.[vId] || (tickMsg.vehicles && Object.values(tickMsg.vehicles)[0]);

      if (vehicle) {
        setTelemetryData((prev) => ({
          speedKmh: typeof vehicle.speed_kmh === 'number' ? Math.round(vehicle.speed_kmh * 10) / 10 : prev.speedKmh,
          batterySoc: typeof vehicle.battery_fuel_soc_pct === 'number' ? Math.round(vehicle.battery_fuel_soc_pct * 10) / 10 : prev.batterySoc,
          cargoTempC: typeof vehicle.cargo_temp_c === 'number' ? Math.round(vehicle.cargo_temp_c * 10) / 10 : prev.cargoTempC,
          distanceKm: typeof vehicle.progress === 'number' ? Math.round(vehicle.progress * 168.4 * 10) / 10 : prev.distanceKm,
          isRerouted: Boolean(vehicle.is_rerouted)
        }));
      }

      if (tickMsg.simulation && setSimState) {
        setSimState((prev) => ({
          ...prev,
          ...tickMsg.simulation
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeVehicleId, setSimState]);

  // Day/Night toggle
  const handleToggleNight = () => {
    if (setSimState) {
      setSimState((prev) => ({
        ...prev,
        is_night: !prev?.is_night
      }));
    }
  };

  // Play/Pause toggle
  const handleTogglePlayPause = () => {
    if (isRunning) {
      telemetryWS.pause();
      if (setSimState) setSimState((prev) => ({ ...prev, is_running: false }));
    } else {
      telemetryWS.play();
      if (setSimState) setSimState((prev) => ({ ...prev, is_running: true }));
    }
  };

  // Speed multiplier toggle: 1x -> 2x -> 5x -> 1x
  const handleCycleSpeed = () => {
    const nextSpeed = currentSpeedMult === 1.0 ? 2.0 : currentSpeedMult === 2.0 ? 5.0 : 1.0;
    telemetryWS.setSpeed(nextSpeed);
    if (setSimState) {
      setSimState((prev) => ({ ...prev, speed_multiplier: nextSpeed }));
    }
  };

  return (
    <nav
      aria-label="Telematics and Camera Controls"
      className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-full flex items-center pointer-events-auto transition-all duration-200 ${className}`}
    >
      <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-800 rounded-2xl px-3 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center gap-2 sm:gap-3 text-slate-100">
        {/* Camera Perspective Mode Switcher */}
        <div className="flex items-center gap-1">
          {CAMERA_BUTTONS.map(({ mode, icon: Icon, label, hotkey }) => {
            const isSelected = activeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleCameraChange(mode)}
                aria-pressed={isSelected}
                aria-label={`Switch camera to ${label} mode`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
                title={`${label} [${hotkey}]`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">[{hotkey}]</span>
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-800" />

        {/* Day/Night & Simulation Controls */}
        <div className="flex items-center gap-1.5">
          {/* Day / Night Toggle */}
          <button
            type="button"
            onClick={handleToggleNight}
            aria-label={isNight ? 'Switch to Day Illumination' : 'Switch to Cyber Night'}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer ${
              isNight
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                : 'bg-amber-950/60 text-amber-300 border border-amber-700/50 hover:bg-amber-900/40'
            }`}
            title="Toggle Day / Night Simulation"
          >
            {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isNight ? 'NIGHT' : 'DAY'}</span>
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            aria-label={isRunning ? 'Pause Simulation' : 'Play Simulation'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
              isRunning
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
            title={isRunning ? 'Pause Simulation [Space]' : 'Resume Simulation [Space]'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Speed Multiplier */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            aria-label={`Simulation speed ${currentSpeedMult}x`}
            className="px-2 py-1.5 rounded-xl text-[11px] font-mono font-bold bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
            title="Cycle Simulation Speed (1x, 2x, 5x)"
          >
            {currentSpeedMult}x
          </button>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-slate-800" />

        {/* Real-Time Vehicle Telematics Indicators */}
        <div className="flex items-center gap-3">
          {/* Target Vehicle Tag */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-slate-200">
              {activeVehicleId || 'TRK-MH-01'}
            </span>
          </div>

          {/* Speed Metric */}
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <TabularMetric
              value={telemetryData.speedKmh}
              unit="km/h"
              size="xs"
              className="text-white"
            />
          </div>

          {/* Battery State of Charge (Hidden on mobile/compact) */}
          <div className="hidden lg:flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-300 tabular-nums font-semibold">
              {telemetryData.batterySoc}%
            </span>
          </div>

          {/* Cold-Chain Temp (Hidden on mobile/compact) */}
          <div className="hidden xl:flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-mono text-cyan-300 tabular-nums font-semibold">
              {telemetryData.cargoTempC > 0 ? `+${telemetryData.cargoTempC}` : telemetryData.cargoTempC}°C
            </span>
          </div>

          {/* Corridor Progress */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>Km</span>
            <span className="text-white font-semibold tabular-nums">{telemetryData.distanceKm}</span>
            <span>/ 168.4</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
