/**
 * logisticsTopology.js
 * 
 * Authoritative WGS84 geospatial topology definitions for the Western India Logistics Corridor.
 * Includes nodes (JNPT, Bhiwandi, Thane, Nashik, Pune), camera presets, and stock capacity threshold logic.
 */

export const CORRIDOR_BOUNDS = {
  minLat: 18.0,
  maxLat: 20.5,
  minLon: 72.5,
  maxLon: 74.2
};

export const FACILITY_NODES = [
  {
    node_id: 'PORT-JNPT-01',
    name: 'JNPT Port Container Terminal',
    shortName: 'JNPT Port',
    city: 'Navi Mumbai',
    echelon_tier: 1,
    tier_label: 'Tier 1 Maritime Gateway',
    node_type: 'port',
    latitude: 18.9496,
    longitude: 72.9515,
    capacity_units: 500000,
    nominal_stock: 42000,
    daily_inflow_nominal: 6500,
    daily_demand_nominal: 5800,
    holding_cost_rate: 18.5,
    lead_time_days: 8.0,
    dock_doors: 14,
    description: 'Primary maritime import gateway with multi-berth container handling and automated rail siding.',
    cameraPreset: {
      longitude: 72.9515,
      latitude: 18.9496,
      height: 3800,
      heading: 25,
      pitch: -35,
      roll: 0
    }
  },
  {
    node_id: 'DC-BHW-01',
    name: 'Bhiwandi Central DC',
    shortName: 'Bhiwandi DC',
    city: 'Bhiwandi',
    echelon_tier: 2,
    tier_label: 'Tier 2 Mega DC',
    node_type: 'central_dc',
    latitude: 19.2967,
    longitude: 73.0631,
    capacity_units: 250000,
    nominal_stock: 28500,
    daily_inflow_nominal: 5200,
    daily_demand_nominal: 4900,
    holding_cost_rate: 8.2,
    lead_time_days: 1.5,
    dock_doors: 28,
    description: 'Mega distribution hub consolidating port freight for Maharashtra corridors and cross-docking.',
    cameraPreset: {
      longitude: 73.0631,
      latitude: 19.2967,
      height: 4200,
      heading: 345,
      pitch: -38,
      roll: 0
    }
  },
  {
    node_id: 'HUB-THN-01',
    name: 'Thane Regional Hub',
    shortName: 'Thane Hub',
    city: 'Thane',
    echelon_tier: 3,
    tier_label: 'Tier 3 Regional Hub',
    node_type: 'regional_hub',
    latitude: 19.2183,
    longitude: 72.9781,
    capacity_units: 85000,
    nominal_stock: 11200,
    daily_inflow_nominal: 1450,
    daily_demand_nominal: 1400,
    holding_cost_rate: 6.5,
    lead_time_days: 0.8,
    dock_doors: 12,
    description: 'Suburban micro-hub serving Mumbai Metropolitan Region retail, dark stores, and FMCG clients.',
    cameraPreset: {
      longitude: 72.9781,
      latitude: 19.2183,
      height: 3200,
      heading: 15,
      pitch: -35,
      roll: 0
    }
  },
  {
    node_id: 'DEP-NSK-01',
    name: 'Nashik Agro Depot',
    shortName: 'Nashik Depot',
    city: 'Nashik',
    echelon_tier: 3,
    tier_label: 'Tier 3 Regional Depot',
    node_type: 'regional_depot',
    latitude: 19.9975,
    longitude: 73.7898,
    capacity_units: 95000,
    nominal_stock: 12800,
    daily_inflow_nominal: 1300,
    daily_demand_nominal: 1250,
    holding_cost_rate: 5.0,
    lead_time_days: 1.2,
    dock_doors: 10,
    description: 'Northern agricultural and industrial transit depot accessed via the steep Kasara Ghat NH-160 corridor.',
    cameraPreset: {
      longitude: 73.7898,
      latitude: 19.9975,
      height: 4500,
      heading: 45,
      pitch: -38,
      roll: 0
    }
  },
  {
    node_id: 'FC-PUN-01',
    name: 'Pune Auto Fulfillment Center',
    shortName: 'Pune Center',
    city: 'Pune',
    echelon_tier: 3,
    tier_label: 'Tier 3 Auto FC',
    node_type: 'fulfillment_center',
    latitude: 18.5204,
    longitude: 73.8567,
    capacity_units: 150000,
    nominal_stock: 21500,
    daily_inflow_nominal: 2350,
    daily_demand_nominal: 2250,
    holding_cost_rate: 7.5,
    lead_time_days: 1.0,
    dock_doors: 20,
    description: 'High-velocity automotive assembly and industrial components center fed via Mumbai-Pune Expressway.',
    cameraPreset: {
      longitude: 73.8567,
      latitude: 18.5204,
      height: 4800,
      heading: 190,
      pitch: -40,
      roll: 0
    }
  }
];

export const CAMERA_PRESETS = {
  CORRIDOR_OVERVIEW: {
    id: 'CORRIDOR_OVERVIEW',
    label: 'Corridor Overview',
    icon: 'Globe',
    longitude: 73.35,
    latitude: 19.25,
    height: 175000,
    heading: 355,
    pitch: -48,
    roll: 0,
    description: 'Strategic macro bird-eye view of the entire Western India logistics corridor.'
  },
  KASARA_GHAT: {
    id: 'KASARA_GHAT',
    label: 'Kasara Ghat Pass',
    icon: 'Mountain',
    longitude: 73.4912,
    latitude: 19.6975,
    height: 6500,
    heading: 40,
    pitch: -32,
    roll: 0,
    description: 'Mountain pass elevation on NH-160 subject to monsoon landslide shocks.'
  }
};

/**
 * Calculates stock capacity fill percentage and returns color and status.
 * Green >= 60%, Amber 30-59%, Red < 30%.
 */
export function getStockCapacityStatus(currentStock, capacityUnits) {
  const stock = Number(currentStock) || 0;
  const cap = Number(capacityUnits) || 1;
  const fillPct = Math.max(0, Math.min(100, Math.round((stock / cap) * 100)));

  if (fillPct >= 60) {
    return {
      fillPct,
      status: 'healthy',
      label: 'Optimal',
      hexColor: '#10b981', // Emerald
      cesiumColor: { red: 0.06, green: 0.72, blue: 0.51, alpha: 1.0 },
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    };
  } else if (fillPct >= 30) {
    return {
      fillPct,
      status: 'stressed',
      label: 'Stressed',
      hexColor: '#f59e0b', // Amber
      cesiumColor: { red: 0.96, green: 0.62, blue: 0.04, alpha: 1.0 },
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300'
    };
  } else {
    return {
      fillPct,
      status: 'critical',
      label: 'Critical',
      hexColor: '#ef4444', // Red
      cesiumColor: { red: 0.94, green: 0.27, blue: 0.27, alpha: 1.0 },
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300'
    };
  }
}

/**
 * Validates facility node schema compliance.
 */
export function validateNodeSchema(node) {
  const errors = [];
  if (!node.node_id || typeof node.node_id !== 'string') errors.push('Missing or invalid node_id');
  if (!node.name || typeof node.name !== 'string') errors.push('Missing or invalid name');
  if (typeof node.latitude !== 'number' || node.latitude < -90 || node.latitude > 90) {
    errors.push('Latitude out of WGS84 range (-90 to 90)');
  }
  if (typeof node.longitude !== 'number' || node.longitude < -180 || node.longitude > 180) {
    errors.push('Longitude out of WGS84 range (-180 to 180)');
  }
  if (typeof node.capacity_units !== 'number' || node.capacity_units <= 0) {
    errors.push('Capacity units must be a positive number');
  }
  if (!node.cameraPreset || typeof node.cameraPreset.height !== 'number') {
    errors.push('Missing camera preset');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
