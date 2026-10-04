import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACILITY_NODES,
  CAMERA_PRESETS,
  CORRIDOR_BOUNDS,
  getStockCapacityStatus,
  validateNodeSchema
} from '../src/constants/logisticsTopology.js';

describe('Cesium 3D Geospatial Topology & WGS84 Facility Beacons', () => {
  test('Contains exactly 5 multi-echelon facility nodes for the Western India corridor', () => {
    assert.equal(FACILITY_NODES.length, 5, 'Should define exactly 5 logistics nodes');

    const expectedNodeIds = [
      'PORT-JNPT-01',
      'DC-BHW-01',
      'HUB-THN-01',
      'DEP-NSK-01',
      'FC-PUN-01'
    ];

    const actualNodeIds = FACILITY_NODES.map((n) => n.node_id);
    for (const expectedId of expectedNodeIds) {
      assert.ok(
        actualNodeIds.includes(expectedId),
        `Missing expected facility node: ${expectedId}`
      );
    }
  });

  test('All facility coordinates are valid WGS84 geographic coordinates within Western India corridor', () => {
    for (const node of FACILITY_NODES) {
      const validation = validateNodeSchema(node);
      assert.ok(
        validation.valid,
        `Node ${node.node_id} failed schema validation: ${validation.errors.join(', ')}`
      );

      assert.ok(
        node.latitude >= CORRIDOR_BOUNDS.minLat && node.latitude <= CORRIDOR_BOUNDS.maxLat,
        `Node ${node.name} latitude ${node.latitude} outside corridor bounds [${CORRIDOR_BOUNDS.minLat}, ${CORRIDOR_BOUNDS.maxLat}]`
      );

      assert.ok(
        node.longitude >= CORRIDOR_BOUNDS.minLon && node.longitude <= CORRIDOR_BOUNDS.maxLon,
        `Node ${node.name} longitude ${node.longitude} outside corridor bounds [${CORRIDOR_BOUNDS.minLon}, ${CORRIDOR_BOUNDS.maxLon}]`
      );

      assert.ok(node.capacity_units > 0, `Node ${node.name} must have positive capacity units`);
      assert.ok(node.nominal_stock > 0, `Node ${node.name} must have positive nominal stock`);
    }
  });

  test('Camera presets exist for full corridor overview and all 5 facility hubs', () => {
    // Corridor overview preset
    const overview = CAMERA_PRESETS.CORRIDOR_OVERVIEW;
    assert.ok(overview, 'CORRIDOR_OVERVIEW preset must be defined');
    assert.ok(overview.height >= 100000, 'Overview altitude should be macro bird-eye view (>= 100km)');
    assert.ok(overview.pitch < 0, 'Overview pitch should be angled downward');

    // Mountain pass preset
    const kasara = CAMERA_PRESETS.KASARA_GHAT;
    assert.ok(kasara, 'KASARA_GHAT pass preset must be defined');
    assert.equal(typeof kasara.latitude, 'number');
    assert.equal(typeof kasara.longitude, 'number');

    // Individual node camera presets
    for (const node of FACILITY_NODES) {
      assert.ok(node.cameraPreset, `Node ${node.name} must have cameraPreset`);
      assert.equal(typeof node.cameraPreset.height, 'number');
      assert.ok(node.cameraPreset.height > 1000 && node.cameraPreset.height < 15000);
      assert.equal(typeof node.cameraPreset.heading, 'number');
      assert.equal(typeof node.cameraPreset.pitch, 'number');
    }
  });

  test('Stock ring capacity thresholds match specification: Green >= 60%, Amber 30-59%, Red < 30%', () => {
    // Green >= 60%
    const greenResult1 = getStockCapacityStatus(600, 1000); // 60%
    assert.equal(greenResult1.status, 'healthy');
    assert.equal(greenResult1.hexColor, '#10b981');
    assert.equal(greenResult1.fillPct, 60);

    const greenResult2 = getStockCapacityStatus(950, 1000); // 95%
    assert.equal(greenResult2.status, 'healthy');
    assert.equal(greenResult2.hexColor, '#10b981');

    // Amber 30-59%
    const amberResult1 = getStockCapacityStatus(590, 1000); // 59%
    assert.equal(amberResult1.status, 'stressed');
    assert.equal(amberResult1.hexColor, '#f59e0b');

    const amberResult2 = getStockCapacityStatus(300, 1000); // 30%
    assert.equal(amberResult2.status, 'stressed');
    assert.equal(amberResult2.hexColor, '#f59e0b');

    // Red < 30%
    const redResult1 = getStockCapacityStatus(290, 1000); // 29%
    assert.equal(redResult1.status, 'critical');
    assert.equal(redResult1.hexColor, '#ef4444');

    const redResult2 = getStockCapacityStatus(50, 1000); // 5%
    assert.equal(redResult2.status, 'critical');
    assert.equal(redResult2.hexColor, '#ef4444');
  });
});
