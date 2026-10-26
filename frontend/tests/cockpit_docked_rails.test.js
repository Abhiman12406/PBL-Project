import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAMERA_MODES, CAMERA_MODE_METADATA } from '../src/utils/cameraControllers.js';
import { isServiceAllowed, DOCK_SERVICES } from '../src/constants/dockConfig.js';
import { FALLBACK_PROFILES } from '../src/constants/personaProfiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const layoutDir = path.resolve(__dirname, '../src/ui/layout');

describe('07: Docked Cockpit Rails & Telematics Bar (Phase 2)', () => {
  describe('1. Component File Existence & Layout Index Exports', () => {
    test('LeftSituationalRail.jsx file exists and defines default export', () => {
      const filePath = path.join(layoutDir, 'LeftSituationalRail.jsx');
      assert.ok(fs.existsSync(filePath), 'LeftSituationalRail.jsx must exist');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('export default function LeftSituationalRail'), 'Must export LeftSituationalRail as default');
      assert.ok(content.includes('Situational Radar'), 'Must render Situational Radar header');
      assert.ok(content.includes('kpis'), 'Must include kpis tab');
      assert.ok(content.includes('sentinel'), 'Must include sentinel tab');
      assert.ok(content.includes('KpisContent'), 'Must render KpisContent component');
      assert.ok(content.includes('AutonomousSentinelHUD'), 'Must render AutonomousSentinelHUD component');
    });

    test('RightInspectorRail.jsx file exists and defines default export', () => {
      const filePath = path.join(layoutDir, 'RightInspectorRail.jsx');
      assert.ok(fs.existsSync(filePath), 'RightInspectorRail.jsx must exist');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('export default function RightInspectorRail'), 'Must export RightInspectorRail as default');
      assert.ok(content.includes('routing'), 'Must include routing tab');
      assert.ok(content.includes('forecasting'), 'Must include forecasting tab');
      assert.ok(content.includes('compliance'), 'Must include compliance tab');
      assert.ok(content.includes('system'), 'Must include system tab');
      assert.ok(content.includes('RoutingTab'), 'Must render RoutingTab component');
      assert.ok(content.includes('ForecastingTab'), 'Must render ForecastingTab component');
      assert.ok(content.includes('ComplianceTab'), 'Must render ComplianceTab component');
      assert.ok(content.includes('AdminRetrainContent'), 'Must render AdminRetrainContent component');
    });

    test('BottomTelemetryBar.jsx file exists and defines default export', () => {
      const filePath = path.join(layoutDir, 'BottomTelemetryBar.jsx');
      assert.ok(fs.existsSync(filePath), 'BottomTelemetryBar.jsx must exist');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('export default function BottomTelemetryBar'), 'Must export BottomTelemetryBar as default');
      assert.ok(content.includes('CAMERA_MODES.CHASE'), 'Must support CHASE mode');
      assert.ok(content.includes('CAMERA_MODES.COCKPIT'), 'Must support COCKPIT mode');
      assert.ok(content.includes('CAMERA_MODES.DRONE'), 'Must support DRONE mode');
      assert.ok(content.includes('CAMERA_MODES.FREE_ORBIT'), 'Must support FREE_ORBIT mode');
      assert.ok(content.includes('TabularMetric'), 'Must use TabularMetric for speed indicator');
    });

    test('Layout index exports all three docked cockpit components', () => {
      const indexPath = path.join(layoutDir, 'index.js');
      assert.ok(fs.existsSync(indexPath), 'layout/index.js must exist');
      const content = fs.readFileSync(indexPath, 'utf8');
      assert.ok(content.includes("export { default as LeftSituationalRail } from './LeftSituationalRail'"), 'Must export LeftSituationalRail');
      assert.ok(content.includes("export { default as RightInspectorRail } from './RightInspectorRail'"), 'Must export RightInspectorRail');
      assert.ok(content.includes("export { default as BottomTelemetryBar } from './BottomTelemetryBar'"), 'Must export BottomTelemetryBar');
    });
  });

  describe('2. Right Analytical Inspector RBAC Clearance Matrix', () => {
    test('Inspector tabs map strictly to RBAC clearance matrix in dockConfig', () => {
      const inspectorServices = ['routing', 'forecasting', 'compliance', 'system'];

      for (const serviceId of inspectorServices) {
        const serviceDef = DOCK_SERVICES.find((s) => s.id === serviceId);
        assert.ok(serviceDef, `Service ${serviceId} must exist in authoritative DOCK_SERVICES`);
        assert.ok(serviceDef.viewRequired, `Service ${serviceId} must declare viewRequired`);

        // Test with admin persona (always allowed)
        assert.strictEqual(
          isServiceAllowed('admin', FALLBACK_PROFILES.admin.permissions, serviceDef.viewRequired),
          true,
          'Admin must have full access to inspector services'
        );
      }
    });

    test('Dispatcher persona is restricted from Compliance, Forecasting, and System in right rail', () => {
      const dispatcherPerms = FALLBACK_PROFILES.dispatcher.permissions;
      assert.strictEqual(isServiceAllowed('dispatcher', dispatcherPerms, 'routing'), true);
      assert.strictEqual(isServiceAllowed('dispatcher', dispatcherPerms, 'compliance'), false);
      assert.strictEqual(isServiceAllowed('dispatcher', dispatcherPerms, 'forecasting'), false);
      assert.strictEqual(isServiceAllowed('dispatcher', dispatcherPerms, 'system'), false);
    });

    test('Customs persona is restricted from Routing, Forecasting, and System in right rail', () => {
      const customsPerms = FALLBACK_PROFILES.customs.permissions;
      assert.strictEqual(isServiceAllowed('customs', customsPerms, 'compliance'), true);
      assert.strictEqual(isServiceAllowed('customs', customsPerms, 'routing'), false);
      assert.strictEqual(isServiceAllowed('customs', customsPerms, 'forecasting'), false);
      assert.strictEqual(isServiceAllowed('customs', customsPerms, 'system'), false);
    });
  });

  describe('3. Camera Mode Metadata & Telematics Standards', () => {
    test('All 4 operational camera modes are defined with metadata and hotkeys', () => {
      const modes = [
        CAMERA_MODES.CHASE,
        CAMERA_MODES.COCKPIT,
        CAMERA_MODES.DRONE,
        CAMERA_MODES.FREE_ORBIT
      ];

      for (const mode of modes) {
        const meta = CAMERA_MODE_METADATA[mode];
        assert.ok(meta, `Metadata for ${mode} must exist`);
        assert.ok(meta.name, `${mode} must have a name`);
        assert.ok(meta.shortName, `${mode} must have a shortName`);
        assert.ok(meta.hotkey, `${mode} must declare hotkey`);
      }
    });
  });
});
