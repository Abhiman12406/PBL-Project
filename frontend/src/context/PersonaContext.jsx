import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredPersona, setStoredPersona } from '../services/api';

const PersonaContext = createContext(null);

// Built-in fallback profiles for instant zero-latency UI hydration
export const FALLBACK_PROFILES = {
  director: {
    role: 'director',
    title: 'Supply Chain Director',
    description: 'Strategic network KPI oversight, demand forecasting, risk stress-testing, and executive analytics.',
    badge_color: 'indigo',
    permissions: {
      views: ['dashboard', 'forecasting', 'twin', 'kpis'],
      actions: ['view_kpis', 'run_forecast', 'run_twin_simulation', 'export_reports']
    }
  },
  dispatcher: {
    role: 'dispatcher',
    title: 'Fleet Dispatcher',
    description: 'Real-time fleet tracking, dynamic route optimization, freight matching, and live telematics.',
    badge_color: 'emerald',
    permissions: {
      views: ['dashboard', 'routing', 'telemetry'],
      actions: ['view_fleet', 'optimize_routes', 'inject_roadblock', 'match_freight', 'telemetry_control']
    }
  },
  customs: {
    role: 'customs',
    title: 'Customs Officer',
    description: 'Automated trade document ingestion, HS code classification, and discrepancy compliance checks.',
    badge_color: 'amber',
    permissions: {
      views: ['dashboard', 'compliance'],
      actions: ['view_documents', 'parse_documents', 'classify_hs', 'review_flags']
    }
  },
  admin: {
    role: 'admin',
    title: 'Enterprise IT Administrator',
    description: 'System health monitoring, model fine-tuning orchestration, data pipeline connectivity, and RBAC control.',
    badge_color: 'cyan',
    permissions: {
      views: ['dashboard', 'forecasting', 'routing', 'compliance', 'twin', 'telemetry', 'system'],
      actions: ['*']
    }
  }
};

export function PersonaProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(getStoredPersona());
  const [profile, setProfile] = useState(FALLBACK_PROFILES[getStoredPersona()] || FALLBACK_PROFILES.director);
  const [rolesMap, setRolesMap] = useState(FALLBACK_PROFILES);
  const [loading, setLoading] = useState(false);

  // Load roles & profile from backend
  const loadProfile = useCallback(async (role) => {
    setLoading(true);
    try {
      const data = await api.getPersonaProfile(role);
      setProfile(data);
    } catch {
      // Fallback gracefully
      if (FALLBACK_PROFILES[role]) {
        setProfile(FALLBACK_PROFILES[role]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllRoles = useCallback(async () => {
    try {
      const data = await api.getPersonaRoles();
      if (data && data.profiles) {
        setRolesMap(data.profiles);
      }
    } catch {
      // Use fallback map
      setRolesMap(FALLBACK_PROFILES);
    }
  }, []);

  useEffect(() => {
    loadAllRoles();
    loadProfile(currentRole);
  }, [loadAllRoles, loadProfile, currentRole]);

  const switchPersona = (newRole) => {
    if (!newRole || newRole === currentRole) return;
    setStoredPersona(newRole);
    setCurrentRole(newRole);
    if (rolesMap[newRole]) {
      setProfile(rolesMap[newRole]);
    } else if (FALLBACK_PROFILES[newRole]) {
      setProfile(FALLBACK_PROFILES[newRole]);
    }
    loadProfile(newRole);
  };

  const canView = (viewName) => {
    if (currentRole === 'admin') return true;
    const views = profile?.permissions?.views || [];
    return views.includes('*') || views.includes(viewName);
  };

  const canPerform = (actionName) => {
    if (currentRole === 'admin') return true;
    const actions = profile?.permissions?.actions || [];
    return actions.includes('*') || actions.includes(actionName);
  };

  return (
    <PersonaContext.Provider value={{
      currentRole,
      profile,
      rolesMap,
      switchPersona,
      canView,
      canPerform,
      loading
    }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}
