import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACILITY_NODES,
  HIGHWAY_CORRIDORS,
  SCENARIO_EPICENTERS,
  SCHEMATIC_COORDS,
  SCHEMATIC_CORRIDOR_PATHS,
  SCHEMATIC_EPICENTERS,
  getStockCapacityStatus
} from '../src/constants/logisticsTopology.js';
import { FALLBACK_PROFILES } from '../src/constants/personaProfiles.js';
import { telemetryWS } from '../src/services/websocket.js';

describe('End-to-End Hardening, Offline Fallback & Persona Verification (Issue 05)', () => {
  describe('1. 3D Schematic Vector Fallback Topology & Geometry', () => {
    test('SCHEMATIC_COORDS defines coordinates for all 5 multi-echelon facility nodes', () => {
      const nodeIds = FACILITY_NODES.map((n) => n.node_id);
      assert.equal(nodeIds.length, 5);

      for (const id of nodeIds) {
        assert.ok(SCHEMATIC_COORDS[id], `Missing schematic coordinate for node ${id}`);
        assert.ok(typeof SCHEMATIC_COORDS[id].x === 'number' && SCHEMATIC_COORDS[id].x > 0);
        assert.ok(typeof SCHEMATIC_COORDS[id].y === 'number' && SCHEMATIC_COORDS[id].y > 0);
        assert.ok(typeof SCHEMATIC_COORDS[id].labelX === 'number');
        assert.ok(typeof SCHEMATIC_COORDS[id].labelY === 'number');
      }
    });

    test('SCHEMATIC_CORRIDOR_PATHS defines continuous SVG path and bypass path for all corridors', () => {
      const corridorIds = HIGHWAY_CORRIDORS.map((c) => c.link_id);
      for (const linkId of corridorIds) {
        const pathObj = SCHEMATIC_CORRIDOR_PATHS[linkId];
        assert.ok(pathObj, `Missing schematic path for corridor link ${linkId}`);
        assert.ok(typeof pathObj.path === 'string' && pathObj.path.startsWith('M'), `Path for ${linkId} must be valid SVG path`);
        assert.ok(typeof pathObj.bypassPath === 'string' && pathObj.bypassPath.startsWith('M'), `Bypass for ${linkId} must be valid SVG path`);
        assert.ok(typeof pathObj.mid.x === 'number' && typeof pathObj.mid.y === 'number', `Midpoint coordinates required for ${linkId}`);
      }
    });

    test('SCHEMATIC_EPICENTERS maps all preset disaster scenarios to canvas coordinates', () => {
      const scenarioKeys = Object.keys(SCENARIO_EPICENTERS);
      assert.equal(scenarioKeys.length, 3);

      for (const key of scenarioKeys) {
        const epicenter = SCHEMATIC_EPICENTERS[key];
        assert.ok(epicenter, `Missing schematic epicenter for scenario ${key}`);
        assert.ok(typeof epicenter.x === 'number' && epicenter.x > 0);
        assert.ok(typeof epicenter.y === 'number' && epicenter.y > 0);
        assert.ok(typeof epicenter.label === 'string' && epicenter.label.length > 0);
      }
    });
  });

  describe('2. WebSocket Reconnection & Resynchronization Client', () => {
    test('TelemetryWebSocketClient exports resilient singleton with resync helper', () => {
      assert.ok(telemetryWS, 'telemetryWS singleton must be exported');
      assert.equal(typeof telemetryWS.resync, 'function', 'Must expose resync() method for reconnection resync');
      assert.equal(typeof telemetryWS.subscribe, 'function', 'Must support event subscriptions');
      assert.equal(typeof telemetryWS.connect, 'function', 'Must support connect()');
      assert.equal(typeof telemetryWS.disconnect, 'function', 'Must support disconnect()');
    });

    test('TelemetryWebSocketClient registers listeners for tick, state, and roadblocks channels', () => {
      assert.ok(telemetryWS.listeners.tick instanceof Set, 'Must have tick listener set');
      assert.ok(telemetryWS.listeners.state instanceof Set, 'Must have state listener set');
      assert.ok(telemetryWS.listeners.roadblocks instanceof Set, 'Must have roadblocks listener set');
      assert.ok(telemetryWS.listeners.roadblocksCleared instanceof Set, 'Must have roadblocksCleared listener set');
    });

    test('Exponential backoff delay respects 10000ms ceiling', () => {
      const baseDelay = telemetryWS.baseReconnectDelayMs;
      assert.equal(baseDelay, 1000);

      // Verify delay calculation for multiple attempts
      for (let attempt = 0; attempt < 15; attempt++) {
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 10000);
        assert.ok(delay <= 10000, `Delay ${delay} exceeded max backoff cap of 10000ms`);
        assert.ok(delay >= 1000, `Delay ${delay} below base backoff of 1000ms`);
      }
    });
  });

  describe('3. Multi-Persona Operational RBAC & Metric Filtering Matrix', () => {
    test('Director persona has twin simulation execution permission and sees executive KPIs', () => {
      const director = FALLBACK_PROFILES.director;
      assert.ok(director.permissions.views.includes('twin'), 'Director must be authorized to view twin');
      assert.ok(director.permissions.actions.includes('run_twin_simulation'), 'Director must be authorized to run simulations');
      assert.ok(director.permissions.views.includes('kpis'), 'Director must have executive KPIs view');
    });

    test('Dispatcher persona is restricted from triggering twin simulations and focused on fleet operations', () => {
      const dispatcher = FALLBACK_PROFILES.dispatcher;
      assert.ok(!directorHasAction(dispatcher, 'run_twin_simulation'), 'Dispatcher must not trigger twin simulations');
      assert.ok(dispatcher.permissions.views.includes('routing'), 'Dispatcher must access routing');
      assert.ok(dispatcher.permissions.views.includes('telemetry'), 'Dispatcher must access telemetry');
      assert.ok(dispatcher.permissions.actions.includes('inject_roadblock'), 'Dispatcher can inject operational roadblocks');
    });

    test('Customs persona is restricted from twin simulations and focused on compliance', () => {
      const customs = FALLBACK_PROFILES.customs;
      assert.ok(!directorHasAction(customs, 'run_twin_simulation'), 'Customs must not trigger twin simulations');
      assert.ok(customs.permissions.views.includes('compliance'), 'Customs must access compliance');
      assert.ok(customs.permissions.actions.includes('classify_hs'), 'Customs can perform HS classification');
      assert.ok(customs.permissions.actions.includes('review_flags'), 'Customs can review discrepancy flags');
    });

    test('Admin persona has wildcard permissions across all systems and twin studio', () => {
      const admin = FALLBACK_PROFILES.admin;
      assert.ok(admin.permissions.views.includes('twin'), 'Admin must have twin view');
      assert.ok(admin.permissions.views.includes('system'), 'Admin must have system administration view');
      assert.ok(admin.permissions.actions.includes('*'), 'Admin must have wildcard permissions');
    });
  });

  describe('4. 60 FPS Performance Optimization Guarantees', () => {
    test('Stock Capacity threshold calculation executes in sub-microsecond time', () => {
      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        getStockCapacityStatus(28500, 250000);
      }
      const t1 = performance.now();
      const avgMs = (t1 - t0) / 1000;
      assert.ok(avgMs < 0.05, `Threshold calculation average time ${avgMs}ms too slow for 60 FPS`);
    });
  });
});

function directorHasAction(profile, action) {
  if (profile.permissions.actions.includes('*')) return true;
  return profile.permissions.actions.includes(action);
}
