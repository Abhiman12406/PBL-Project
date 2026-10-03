import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  Truck,
  MapPin,
  Clock,
  Gauge,
  Leaf,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Navigation,
  Compass,
  Package,
  Zap,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

// Fix Leaflet standard marker icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Leaflet DivIcon helpers for modern daylight aesthetic
function createCustomMarkerIcon(type, number) {
  let bgColor = '#0F172A';
  let borderColor = '#334155';
  let textColor = '#FFFFFF';
  let text = number || '';

  if (type === 'DEPOT') {
    bgColor = '#FF5400';
    borderColor = '#FFFFFF';
    textColor = '#FFFFFF';
    text = '★';
  } else if (type === 'BACKHAUL_PICKUP') {
    bgColor = '#00C853';
    borderColor = '#FFFFFF';
    textColor = '#FFFFFF';
    text = '⤓';
  } else if (type === 'BACKHAUL_DROPOFF') {
    bgColor = '#00897B';
    borderColor = '#FFFFFF';
    textColor = '#FFFFFF';
    text = '⤒';
  }

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        border: 2px solid ${borderColor};
        border-radius: 9999px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
      ">
        ${text}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

export default function RoutingTab() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineRef = useRef(null);
  const markersGroupRef = useRef(null);

  // Fixtures and control states
  const [fixtures, setFixtures] = useState(null);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState('TRK-MH-01');
  const [selectedDepotId, setSelectedDepotId] = useState('PORT-JNPT-01');
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState(['DEL-THN-01', 'DEL-NSK-01', 'DEL-NSK-02']);
  const [trafficMode, setTrafficMode] = useState('STANDARD');

  // Optimization output states
  const [optimizing, setOptimizing] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Backhaul assignment states
  const [assigningBackhaulId, setAssigningBackhaulId] = useState(null);
  const [backhaulSuccessMessage, setBackhaulSuccessMessage] = useState(null);

  // 1. Fetch initial routing fixtures
  const fetchFixtures = useCallback(async () => {
    setLoadingFixtures(true);
    setErrorMessage(null);
    try {
      const data = await api.getRoutingFixtures();
      setFixtures(data);
      if (data.fleet_vehicles?.length) {
        setSelectedVehicleId(prev => (data.fleet_vehicles.some(v => v.vehicle_id === prev) ? prev : data.fleet_vehicles[0].vehicle_id));
      }
      if (data.depots?.length) {
        setSelectedDepotId(prev => (data.depots.some(d => d.node_id === prev) ? prev : data.depots[0].node_id));
      }
    } catch (err) {
      console.error('Failed to load routing fixtures:', err);
      setErrorMessage(err.message || 'Failed to load Western India corridor data.');
    } finally {
      setLoadingFixtures(false);
    }
  }, []);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Center on Western India Corridor (approx between Mumbai and Nashik)
    const map = L.map(mapContainerRef.current, {
      center: [19.45, 73.30],
      zoom: 8,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // High clarity CartoDB Positron / OSM light tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Trigger Route Optimization
  const handleOptimizeRoute = useCallback(async () => {
    if (!fixtures) return;
    setOptimizing(true);
    setErrorMessage(null);
    setBackhaulSuccessMessage(null);

    try {
      const activeDepot = fixtures.depots?.find(d => d.node_id === selectedDepotId) || {
        latitude: 18.9496,
        longitude: 72.9515,
        name: 'JNPT Port Depot',
        city: 'Navi Mumbai'
      };

      const activeVehicle = fixtures.fleet_vehicles?.find(v => v.vehicle_id === selectedVehicleId) || {
        vehicle_id: selectedVehicleId,
        max_capacity_kg: 24000.0,
        current_fuel_pct: 90.0
      };

      const deliveriesToOptimize = (fixtures.delivery_candidates || [])
        .filter(d => selectedDeliveryIds.includes(d.delivery_id))
        .map(d => ({
          delivery_id: d.delivery_id,
          customer_name: d.customer_name,
          city: d.city,
          latitude: d.latitude,
          longitude: d.longitude,
          weight_kg: d.weight_kg,
          time_window: {
            start: d.time_window_start,
            end: d.time_window_end
          }
        }));

      if (deliveriesToOptimize.length === 0) {
        throw new Error('Please select at least one delivery stop to optimize.');
      }

      const payload = {
        depot_location: {
          latitude: activeDepot.latitude,
          longitude: activeDepot.longitude,
          name: activeDepot.name,
          city: activeDepot.city
        },
        fleet_units: [
          {
            vehicle_id: activeVehicle.vehicle_id,
            max_capacity_kg: activeVehicle.max_payload_kg || activeVehicle.max_capacity_kg || 24000.0,
            current_fuel_pct: activeVehicle.battery_fuel_soc_pct || 90.0
          }
        ],
        deliveries: deliveriesToOptimize,
        traffic_mode: trafficMode
      };

      const result = await api.optimizeRoute(payload);
      setRouteResult(result);
    } catch (err) {
      console.error('Optimization error:', err);
      setErrorMessage(err.message || 'Route optimization failed.');
    } finally {
      setOptimizing(false);
    }
  }, [fixtures, selectedDepotId, selectedVehicleId, selectedDeliveryIds, trafficMode]);

  // Initial optimization run when fixtures finish loading
  useEffect(() => {
    if (fixtures && !routeResult && !optimizing) {
      handleOptimizeRoute();
    }
  }, [fixtures]);

  // 4. Update Leaflet Map with Polyline and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup || !routeResult) return;

    // Clear previous markers and polyline
    markersGroup.clearLayers();
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    const { waypoints_sequence, route_geometry, traffic_mode } = routeResult;

    // Draw Route Polyline
    if (route_geometry && route_geometry.length > 0) {
      const isCongested = traffic_mode === 'CONGESTED';
      const polyline = L.polyline(route_geometry, {
        color: isCongested ? '#FF1744' : '#FF5400',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        dashArray: isCongested ? '8, 6' : undefined
      }).addTo(map);

      routePolylineRef.current = polyline;
    }

    // Add Stop Markers
    if (waypoints_sequence && waypoints_sequence.length > 0) {
      waypoints_sequence.forEach((wp) => {
        const icon = createCustomMarkerIcon(wp.type, wp.stop_order);
        const marker = L.marker([wp.latitude, wp.longitude], { icon });

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #0F172A; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 2px;">
              #${wp.stop_order}: ${wp.name || wp.type}
            </div>
            <div style="color: #64748B; font-weight: 600; margin-bottom: 6px;">
              ${wp.city || ''} &bull; <span style="text-transform: uppercase;">${wp.type}</span>
            </div>
            <div style="background: #F1F5F9; padding: 6px; border-radius: 6px; margin-bottom: 4px;">
              <div><strong>ETA:</strong> ${new Date(wp.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Leg Dist:</strong> ${wp.distance_from_prev_km} km (${wp.duration_from_prev_mins} mins)</div>
              ${wp.demand_kg > 0 ? `<div><strong>Payload:</strong> ${wp.demand_kg.toLocaleString()} kg</div>` : ''}
              <div><strong>Remaining Cap:</strong> ${wp.remaining_capacity_kg.toLocaleString()} kg</div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroup.addLayer(marker);
      });

      // Fit map bounds to show full route
      try {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
      } catch (e) {
        console.warn('Map bounds fit warning:', e);
      }
    }
  }, [routeResult]);

  // 5. One-Click Backhaul Assignment Handler
  const handleAssignBackhaul = async (backhaulId) => {
    if (!routeResult) return;
    setAssigningBackhaulId(backhaulId);
    setErrorMessage(null);
    setBackhaulSuccessMessage(null);

    try {
      const payload = {
        route_id: routeResult.route_id,
        backhaul_id: backhaulId,
        current_route: routeResult
      };

      const updated = await api.assignBackhaul(payload);
      setRouteResult(updated);
      setBackhaulSuccessMessage(`Successfully assigned return backhaul ${backhaulId}! Eliminated ${updated.empty_km_eliminated} unladen empty kilometers.`);
    } catch (err) {
      console.error('Failed to assign backhaul:', err);
      setErrorMessage(err.message || 'Failed to assign backhaul.');
    } finally {
      setAssigningBackhaulId(null);
    }
  };

  // Toggle delivery checkbox
  const toggleDeliverySelection = (delId) => {
    setSelectedDeliveryIds(prev => {
      if (prev.includes(delId)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(id => id !== delId);
      } else {
        return [...prev, delId];
      }
    });
  };

  const selectedVehicle = fixtures?.fleet_vehicles?.find(v => v.vehicle_id === selectedVehicleId);
  const maxCap = selectedVehicle?.max_payload_kg || 24000.0;
  const currentTotalWeight = (fixtures?.delivery_candidates || [])
    .filter(d => selectedDeliveryIds.includes(d.delivery_id))
    .reduce((sum, d) => sum + (d.weight_kg || 0), 0);
  const capacityPct = Math.min(100, Math.round((currentTotalWeight / maxCap) * 100));
  const isOverCapacity = currentTotalWeight > maxCap;

  if (loadingFixtures && !fixtures) {
    return (
      <div className="bright-card p-12 rounded-2xl bg-white border-2 border-slate-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center mx-auto text-orange-600 animate-pulse">
          <Truck className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">Loading Western India Corridor GIS & Fleet Network...</h3>
        <p className="text-xs text-slate-500 font-medium">Connecting to JNPT / Mumbai / Thane / Nashik / Pune telemetry fixtures</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Tab Header Banner */}
      <div className="bright-card rounded-2xl p-6 bg-white border-2 border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                DRL Fleet Dispatcher Console
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-600">
                PyTorch Neural VRP & Freight Matching Engine
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Route & Fleet Optimizer
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                Western India Corridor
              </span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-3xl mt-1.5 leading-relaxed">
              Dynamically solve optimal multi-stop vehicle schedules across Mumbai, JNPT, Thane, Kasara Ghat, Nashik, and Pune. 
              Eliminate costly unladen "empty kilometers" through AI-matched return hauls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || isOverCapacity}
              className="px-5 py-2.5 rounded-xl bg-[#FF5400] hover:bg-[#e04a00] text-white text-xs sm:text-sm font-extrabold transition-all duration-150 flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
              <span>{optimizing ? 'Solving Neural VRP...' : 'Re-Optimize Route'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs font-bold text-rose-800 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Backhaul Success Banner */}
        {backhaulSuccessMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs font-bold text-emerald-800 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>{backhaulSuccessMessage}</span>
            </div>
            <button 
              onClick={() => setBackhaulSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Control Panel Grid: Vehicle, Traffic, Depot, Capacity Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fleet Vehicle Selector */}
        <div className="bright-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              Active Fleet Unit
            </span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono-num font-bold">
              {selectedVehicle?.plate_number || 'TRUCK'}
            </span>
          </div>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-orange-500"
          >
            {fixtures?.fleet_vehicles?.map(v => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_id} &bull; {v.vehicle_type} ({(v.max_payload_kg / 1000).toFixed(0)}T)
              </option>
            ))}
          </select>
          <div className="text-[11px] font-semibold text-slate-500 flex justify-between">
            <span>Payload Limit:</span>
            <span className="font-mono-num text-slate-800 font-bold">{maxCap.toLocaleString()} kg</span>
          </div>
        </div>

        {/* 2. Starting Depot Hub */}
        <div className="bright-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              Departure Depot
            </span>
            <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">
              ORIGIN
            </span>
          </div>
          <select
            value={selectedDepotId}
            onChange={(e) => setSelectedDepotId(e.target.value)}
            className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-orange-500"
          >
            {fixtures?.depots?.map(d => (
              <option key={d.node_id} value={d.node_id}>
                {d.name} ({d.city})
              </option>
            ))}
          </select>
          <div className="text-[11px] font-semibold text-slate-500 flex justify-between">
            <span>Corridor Gateway:</span>
            <span className="font-semibold text-slate-800">
              {fixtures?.depots?.find(d => d.node_id === selectedDepotId)?.city || 'Navi Mumbai'}
            </span>
          </div>
        </div>

        {/* 3. Traffic Mode Toggle */}
        <div className="bright-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-orange-600" />
              Traffic Conditions
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              trafficMode === 'CONGESTED' 
                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {trafficMode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTrafficMode('STANDARD')}
              className={`py-1.5 text-xs font-bold rounded-md transition ${
                trafficMode === 'STANDARD' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setTrafficMode('CONGESTED')}
              className={`py-1.5 text-xs font-bold rounded-md transition ${
                trafficMode === 'CONGESTED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Congested
            </button>
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            {trafficMode === 'CONGESTED' ? 'Kasara Ghat & Thane toll delays active (+65% duration)' : 'Clear highway flow along NH-48 / NH-160'}
          </div>
        </div>

        {/* 4. Vehicle Payload Utilization Bar */}
        <div className="bright-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-orange-600" />
              Payload Capacity
            </span>
            <span className={`text-xs font-mono-num font-extrabold ${isOverCapacity ? 'text-rose-600' : 'text-slate-800'}`}>
              {capacityPct}%
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverCapacity
                  ? 'bg-rose-600'
                  : capacityPct > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Loaded: <strong className="text-slate-800 font-mono-num">{currentTotalWeight.toLocaleString()} kg</strong></span>
            <span>Rem: <strong className="text-slate-800 font-mono-num">{Math.max(0, maxCap - currentTotalWeight).toLocaleString()} kg</strong></span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Route Telematics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Leaflet.js Interactive Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bright-card rounded-2xl bg-white border-2 border-slate-200 overflow-hidden flex flex-col">
            {/* Map Header Bar */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Western India Corridor Dynamic GIS Map
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {routeResult?.waypoints_sequence?.length || 0} Scheduled Waypoints
                </span>
              </div>
            </div>

            {/* Leaflet Map Canvas Container */}
            <div
              ref={mapContainerRef}
              className="w-full h-[460px] bg-slate-100 relative z-0"
              style={{ minHeight: '460px' }}
            />

            {/* Map Legend Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5400] inline-block" />
                  <span>Depot / Hub</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-900 inline-block" />
                  <span>Delivery Stop</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Backhaul Cargo</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono-num">
                  Route ID: {routeResult?.route_id || 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Order Candidates Selection Matrix */}
          <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Available Corridor Delivery Orders (Select to Re-Route)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {selectedDeliveryIds.length} of {fixtures?.delivery_candidates?.length || 0} active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {fixtures?.delivery_candidates?.map(del => {
                const isSelected = selectedDeliveryIds.includes(del.delivery_id);
                return (
                  <div
                    key={del.delivery_id}
                    onClick={() => toggleDeliverySelection(del.delivery_id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-orange-50/70 border-orange-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-extrabold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-600' : 'bg-slate-300'}`} />
                        <span>{del.city}</span>
                        <span className="text-[10px] text-slate-400 font-mono-num font-normal">({del.delivery_id})</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 truncate max-w-[200px]">
                        {del.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono-num">
                        Payload: <strong className="text-slate-800">{del.weight_kg.toLocaleString()} kg</strong>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by div click
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Route KPIs, Turn-by-Turn Waypoints & Backhaul Matching (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Key Route Metrics Card */}
          <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                DRL Optimization Metrics
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Neural Policy Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-orange-600" />
                  Distance
                </span>
                <div className="text-lg font-extrabold text-slate-900 font-mono-num mt-1">
                  {routeResult?.total_distance_km || 0} <span className="text-xs font-semibold text-slate-500">km</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Duration
                </span>
                <div className="text-lg font-extrabold text-slate-900 font-mono-num mt-1">
                  {Math.floor((routeResult?.estimated_duration_minutes || 0) / 60)}h {(routeResult?.estimated_duration_minutes || 0) % 60}m
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  Fuel Burn
                </span>
                <div className="text-lg font-extrabold text-slate-900 font-mono-num mt-1">
                  {routeResult?.fuel_consumption_liters || 0} <span className="text-xs font-semibold text-slate-500">L</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  CO2 Footprint
                </span>
                <div className="text-lg font-extrabold text-emerald-700 font-mono-num mt-1">
                  {routeResult?.co2_emissions_kg || 0} <span className="text-xs font-semibold text-slate-500">kg</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    Unladen "Empty" Kilometers
                  </span>
                  {routeResult?.assigned_backhaul_id && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      ELIMINATED!
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className={`text-lg font-extrabold font-mono-num ${routeResult?.empty_distance_km < 30 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {routeResult?.empty_distance_km || 0} <span className="text-xs font-semibold text-slate-500">km</span>
                  </div>
                  {routeResult?.empty_km_eliminated > 0 && (
                    <span className="text-xs font-bold text-emerald-600">
                      (-{routeResult.empty_km_eliminated} km avoided)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Backhaul Freight Matching Section */}
          <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Return-Haul Freight Matching (Backhauls)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {routeResult?.matched_backhauls?.length || 0} Compatible
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Eliminate deadheading by picking up high-value return loads compatible with truck capacity and return geometry.
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {routeResult?.matched_backhauls?.map(bhl => {
                const isAssigned = bhl.assigned || routeResult?.assigned_backhaul_id === bhl.backhaul_id;
                return (
                  <div
                    key={bhl.backhaul_id}
                    className={`p-3.5 rounded-xl border transition-all duration-150 space-y-2 ${
                      isAssigned
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900">{bhl.origin_city} ➔ {bhl.destination_city}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.2 rounded font-mono-num">
                            Match: {(bhl.compatibility_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          {bhl.shipper_name}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-extrabold text-emerald-700 font-mono-num">
                          ₹{bhl.payout_inr.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">Guaranteed Payout</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium bg-white p-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-1">
                      <span>Cargo: <strong className="text-slate-800">{bhl.cargo_type}</strong></span>
                      <span>Weight: <strong className="text-slate-800 font-mono-num">{bhl.cargo_weight_kg.toLocaleString()} kg</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-emerald-600" />
                        <span>Saves {bhl.co2_savings_kg} kg CO2 & {bhl.empty_km_eliminated} empty km</span>
                      </div>

                      <button
                        onClick={() => handleAssignBackhaul(bhl.backhaul_id)}
                        disabled={isAssigned || assigningBackhaulId === bhl.backhaul_id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          isAssigned
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98]'
                        }`}
                      >
                        {isAssigned ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Assigned</span>
                          </>
                        ) : assigningBackhaulId === bhl.backhaul_id ? (
                          <span>Assigning...</span>
                        ) : (
                          <>
                            <span>1-Click Assign</span>
                            <ArrowRight className="w-3 h-3 text-orange-400" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {(!routeResult?.matched_backhauls || routeResult.matched_backhauls.length === 0) && (
                <div className="p-4 text-center text-xs text-slate-500 font-semibold bg-slate-50 rounded-xl">
                  No return backhauls matching current route endpoints.
                </div>
              )}
            </div>
          </div>

          {/* Turn-by-Turn Waypoint Sequence Table */}
          <div className="bright-card p-5 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Turn-by-Turn Waypoint Sequence
                </h3>
              </div>
              <span className="text-[11px] font-mono-num text-slate-500">
                Chronological Order
              </span>
            </div>

            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2">Stop</th>
                    <th className="pb-2">Destination / Type</th>
                    <th className="pb-2 text-right">ETA</th>
                    <th className="pb-2 text-right">Leg Dist</th>
                    <th className="pb-2 text-right">Capacity Rem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeResult?.waypoints_sequence?.map((wp) => (
                    <tr key={wp.stop_order} className="hover:bg-slate-50 transition">
                      <td className="py-2 font-mono-num font-bold text-slate-800">
                        #{wp.stop_order}
                      </td>
                      <td className="py-2">
                        <div className="font-bold text-slate-900 truncate max-w-[130px]">
                          {wp.name || wp.type}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          wp.type === 'DEPOT' 
                            ? 'bg-orange-100 text-orange-800' 
                            : wp.type.startsWith('BACKHAUL')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {wp.type}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono-num font-semibold text-slate-800">
                        {new Date(wp.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 text-right font-mono-num text-slate-600">
                        {wp.distance_from_prev_km} km
                      </td>
                      <td className="py-2 text-right font-mono-num font-semibold text-slate-800">
                        {wp.remaining_capacity_kg?.toLocaleString()} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
