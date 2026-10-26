import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const layoutDir = path.resolve(__dirname, '../src/ui/layout');

describe('08: Unified Command Cockpit Integration & Layout Shell (Phase 3)', () => {
  describe('1. UnifiedCockpitLayout Architecture & Composition', () => {
    test('UnifiedCockpitLayout.jsx exists and defines default export', () => {
      const filePath = path.join(layoutDir, 'UnifiedCockpitLayout.jsx');
      assert.ok(fs.existsSync(filePath), 'UnifiedCockpitLayout.jsx must exist');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('export default function UnifiedCockpitLayout'),
        'Must export UnifiedCockpitLayout as default'
      );
    });

    test('UnifiedCockpitLayout composes LeftSituationalRail, RightInspectorRail, and BottomTelemetryBar', () => {
      const filePath = path.join(layoutDir, 'UnifiedCockpitLayout.jsx');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('LeftSituationalRail'), 'Must render LeftSituationalRail');
      assert.ok(content.includes('RightInspectorRail'), 'Must render RightInspectorRail');
      assert.ok(content.includes('BottomTelemetryBar'), 'Must render BottomTelemetryBar');
    });

    test('UnifiedCockpitLayout preserves pointer-events transparency for central 3D canvas', () => {
      const filePath = path.join(layoutDir, 'UnifiedCockpitLayout.jsx');
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('pointer-events-none'),
        'Outer container must be pointer-events-none so central 3D scene receives mouse/drag events'
      );
      assert.ok(
        content.includes('Panorama 3D') || content.includes('toggleBothRails'),
        'Must support panoramic view toggle to collapse rails'
      );
    });

    test('Layout index exports UnifiedCockpitLayout cleanly', () => {
      const indexPath = path.join(layoutDir, 'index.js');
      assert.ok(fs.existsSync(indexPath), 'layout/index.js must exist');
      const content = fs.readFileSync(indexPath, 'utf8');
      assert.ok(
        content.includes("export { default as UnifiedCockpitLayout } from './UnifiedCockpitLayout'"),
        'Must export UnifiedCockpitLayout from layout index'
      );
    });
  });

  describe('2. WindowManager Cockpit Default Routing', () => {
    test('WindowManager imports and renders UnifiedCockpitLayout for docked/cockpit mode', () => {
      const winManagerPath = path.join(layoutDir, 'WindowManager.jsx');
      assert.ok(fs.existsSync(winManagerPath), 'WindowManager.jsx must exist');
      const content = fs.readFileSync(winManagerPath, 'utf8');
      assert.ok(
        content.includes("import UnifiedCockpitLayout from './UnifiedCockpitLayout'"),
        'Must import UnifiedCockpitLayout'
      );
      assert.ok(
        content.includes('<UnifiedCockpitLayout') || content.includes('UnifiedCockpitLayout />'),
        'Must render UnifiedCockpitLayout'
      );
      assert.ok(
        content.includes("workspaceMode === 'docked'"),
        'Must route docked mode to UnifiedCockpitLayout'
      );
    });

    test('WindowManager preserves floating window manager for legacy/floating mode', () => {
      const winManagerPath = path.join(layoutDir, 'WindowManager.jsx');
      const content = fs.readFileSync(winManagerPath, 'utf8');
      assert.ok(
        content.includes("workspaceMode === 'floating'"),
        'Must preserve floating multi-window mode'
      );
      assert.ok(content.includes('GlassPanel'), 'Must preserve GlassPanel for floating mode');
    });
  });

  describe('3. Top CyberStatusBar Refinement & Alignment', () => {
    test('CyberStatusBar is fixed at 56px height with dark obsidian micro-border', () => {
      const statusPath = path.join(layoutDir, 'CyberStatusBar.jsx');
      assert.ok(fs.existsSync(statusPath), 'CyberStatusBar.jsx must exist');
      const content = fs.readFileSync(statusPath, 'utf8');
      assert.ok(content.includes('h-14'), 'CyberStatusBar must be fixed at h-14 (56px)');
      assert.ok(
        content.includes('border-b') && content.includes('border-slate-800'),
        'Must have crisp 1px border-slate-800 bottom border'
      );
    });

    test('CyberStatusBar renders all 5 corridor stops (JNPT, BHW, THN, KASARA, NSK)', () => {
      const statusPath = path.join(layoutDir, 'CyberStatusBar.jsx');
      const content = fs.readFileSync(statusPath, 'utf8');
      assert.ok(content.includes('JNPT'), 'Must show JNPT stop');
      assert.ok(content.includes('BHW'), 'Must show BHW stop');
      assert.ok(content.includes('THN'), 'Must show THN stop');
      assert.ok(content.includes('KASARA'), 'Must show KASARA stop');
      assert.ok(content.includes('NSK'), 'Must show NSK stop');
    });

    test('CyberStatusBar includes Cockpit mode switcher and live clocks', () => {
      const statusPath = path.join(layoutDir, 'CyberStatusBar.jsx');
      const content = fs.readFileSync(statusPath, 'utf8');
      assert.ok(content.includes('Cockpit'), 'Mode switcher must include Cockpit label');
      assert.ok(content.includes('Floating'), 'Mode switcher must include Floating label');
      assert.ok(content.includes('3D Full'), 'Mode switcher must include 3D Full label');
      assert.ok(content.includes('IST'), 'Must display IST clock');
    });
  });

  describe('4. Zero Overlap Guarantee', () => {
    test('GlassDock only renders in floating mode to eliminate bottom bar collision', () => {
      const dockPath = path.join(layoutDir, 'GlassDock.jsx');
      assert.ok(fs.existsSync(dockPath), 'GlassDock.jsx must exist');
      const content = fs.readFileSync(dockPath, 'utf8');
      assert.ok(
        content.includes("workspaceMode !== 'floating'"),
        'GlassDock must guard against rendering in cockpit mode'
      );
    });
  });
});
