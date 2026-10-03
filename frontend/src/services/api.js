const STORAGE_KEY = 'smart_logistics_persona';
const BASE_URL = '/api/v1';

export function getStoredPersona() {
  return localStorage.getItem(STORAGE_KEY) || 'director';
}

export function setStoredPersona(role) {
  if (role) {
    localStorage.setItem(STORAGE_KEY, role);
  }
}

/**
 * Perform fetch with automatic X-Persona-Role header injection
 */
async function fetchWithPersona(url, options = {}) {
  const currentRole = getStoredPersona();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    'X-Persona-Role': currentRole,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchWithPersona('/health'),
  getPersonaProfile: (role) => fetchWithPersona('/persona/profile', {
    headers: role ? { 'X-Persona-Role': role } : {}
  }),
  getPersonaRoles: () => fetchWithPersona('/persona/roles'),
  getAdminSystemStatus: () => fetchWithPersona('/admin/system-status'),
  getForecastingSKUs: () => fetchWithPersona('/forecasting/skus'),
  getHistoricalDemand: (skuId, days = 30) => fetchWithPersona(`/forecasting/historical/${skuId}?days=${days}`),
  predictDemand: (payload) => fetchWithPersona('/forecasting/predict', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getRoutingFixtures: () => fetchWithPersona('/routing/fixtures'),
  optimizeRoute: (payload) => fetchWithPersona('/routing/optimize', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  assignBackhaul: (payload) => fetchWithPersona('/routing/assign-backhaul', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getTelemetryState: () => fetchWithPersona('/telemetry/state'),
  controlTelemetry: (action, speedMultiplier = 1.0, stepSeconds = 15) => fetchWithPersona('/telemetry/control', {
    method: 'POST',
    body: JSON.stringify({ action, speed_multiplier: speedMultiplier, step_seconds: stepSeconds })
  }),
  injectDisruption: (payload) => fetchWithPersona('/telemetry/inject-disruption', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  clearDisruptions: () => fetchWithPersona('/telemetry/clear-disruptions', {
    method: 'POST'
  }),
  // Trade Compliance & IDP Orchestrator API
  getComplianceSamples: () => fetchWithPersona('/compliance/samples'),
  getComplianceSampleDetail: (sampleId) => fetchWithPersona(`/compliance/samples/${encodeURIComponent(sampleId)}`),
  getHSCatalogue: (query = '') => fetchWithPersona(`/compliance/hs-catalogue${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  getCustomsRules: () => fetchWithPersona('/compliance/rules'),
  classifyHSCode: (payload) => fetchWithPersona('/compliance/hs-classify', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  parseTradeDocument: (payload) => {
    if (typeof FormData !== 'undefined' && payload instanceof FormData) {
      return fetchWithPersona('/compliance/parse-doc', {
        method: 'POST',
        body: payload
      });
    }
    return fetchWithPersona('/compliance/parse-doc', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

