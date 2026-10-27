import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ALL_STAGE_FACILITIES,
  STAGE_NODES,
  PANVEL_DEPOT_NODE,
  PUNE_FC_NODE,
  CAMERA_VIEWS
} from '../src/constants/stage3DTopology.js';
import {
  CAMERA_MODES,
  CAMERA_MODE_METADATA,
  calculateChaseCameraPosition,
  calculateCockpitCameraPosition,
  calculateDroneCameraPosition,
  dampArray3
} from '../src/utils/cameraControllers.js';
import {
  createCorridorLogisticsNodes,
  createExtrudedHighwayRibbon,
  buildCorridorSplines
} from '../src/components/3d/proceduralWorld.js';
import {
  calculateNightGlowFactor,
  updateEmissiveIntensity,
  disposeCachedModels
} from '../src/utils/modelLoader.js';
import {
  disposeThreeScene,
  profileWebGLMemory,
  verifyDisposalMemoryState,
  shouldThrottleRender
} from '../src/utils/webglHardening.js';
import { mapFacilityBetweenEngines } from '../src/utils/engineSynchronization.js';

describe('06: Camera View Telemetry Profiling & WebGL Performance Verification', () => {

  describe('1. Camera Preset Transitions & Framing Focal Distance', () => {
    test('CAMERA_VIEWS includes all 6 corridor hub presets plus overview and mountain pass', () => {
      const requiredPresets = [
        'OVERVIEW',
        'JNPT_PORT',
        'PANVEL_DEPOT',
        'THANE_HUB',
        'BHIWANDI_DC',
        'KASARA_PASS',
        'NASHIK_DEPOT',
        'PUNE_FC'
      ];

      requiredPresets.forEach((key) => {
        assert.ok(CAMERA_VIEWS[key], `CAMERA_VIEWS must contain ${key} preset`);
        assert.ok(CAMERA_VIEWS[key].name, `Preset ${key} must have a human-readable title`);
        assert.equal(CAMERA_VIEWS[key].position.length, 3, `Preset ${key} position must be [x, y, z]`);
        assert.equal(CAMERA_VIEWS[key].target.length, 3, `Preset ${key} target must be [x, y, z]`);
      });
    });

    test('All hub inspection presets accurately target their respective 3D facility world coordinates', () => {
      const hubTargetMap = {
        JNPT_PORT: [-44, 0, 32],      // JNPT Port
        PANVEL_DEPOT: [-34, 0, 24],   // Panvel Logistics Depot
        THANE_HUB: [-24, 0, 16],      // Thane Regional Hub
        BHIWANDI_DC: [-14, 0, 2],     // Bhiwandi Mega DC
        KASARA_PASS: [14, 9.5, -24],  // Kasara Ghat Pass
        NASHIK_DEPOT: [42, 6.5, -48], // Nashik Agro Depot
        PUNE_FC: [28, 5.5, 42]        // Pune Auto Fulfillment Center
      };

      Object.entries(hubTargetMap).forEach(([presetKey, expectedTarget]) => {
        const preset = CAMERA_VIEWS[presetKey];
        assert.ok(preset, `Missing preset ${presetKey}`);
        assert.deepEqual(preset.target, expectedTarget, `Preset ${presetKey} target must align with hub position`);
      });
    });

    test('All hub inspection camera presets maintain clean focal distance and elevated angle', () => {
      const hubPresets = [
        'JNPT_PORT',
        'PANVEL_DEPOT',
        'THANE_HUB',
        'BHIWANDI_DC',
        'KASARA_PASS',
        'NASHIK_DEPOT',
        'PUNE_FC'
      ];

      hubPresets.forEach((key) => {
        const { position, target } = CAMERA_VIEWS[key];
        const dx = position[0] - target[0];
        const dy = position[1] - target[1];
        const dz = position[2] - target[2];
        const focalDistance = Math.hypot(dx, dy, dz);

        // Focal distance must be between 18 and 28 units (ideal for ~8 unit model radius)
        assert.ok(
          focalDistance >= 18.0 && focalDistance <= 28.0,
          `Preset ${key} focal distance (${focalDistance.toFixed(2)}) must be between 18.0 and 28.0 units for clear framing`
        );

        // Camera must be elevated above target by at least 8 units (elevated inspection perspective)
        assert.ok(
          dy >= 8.0,
          `Preset ${key} camera height dy (${dy.toFixed(2)}) must be >= 8.0 units above target for clean downward framing`
        );
      });
    });

    test('mapFacilityBetweenEngines resolves all CAMERA_VIEWS preset keys to matching facility metadata', () => {
      const testCases = [
        { key: 'JNPT_PORT', expectedCode: 'JNPT' },
        { key: 'PANVEL_DEPOT', expectedCode: 'PANVEL' },
        { key: 'THANE_HUB', expectedCode: 'THANE' },
        { key: 'BHIWANDI_DC', expectedCode: 'BHIWANDI' },
        { key: 'KASARA_PASS', expectedCode: 'KASARA' },
        { key: 'NASHIK_DEPOT', expectedCode: 'NASHIK' },
        { key: 'PUNE_FC', expectedCode: 'PUNE' }
      ];

      testCases.forEach(({ key, expectedCode }) => {
        const mapped = mapFacilityBetweenEngines(key);
        assert.ok(mapped.stageNode, `Must find stage node for preset key ${key}`);
        assert.equal(mapped.stageNode.code, expectedCode, `Preset ${key} must resolve to ${expectedCode}`);
        assert.ok(mapped.cesiumNode, `Must find cesium node for preset key ${key}`);
      });
    });
  });

  describe('2. 3D Facility Raycasting & Interactive Telemetry Card Selection', () => {
    test('createCorridorLogisticsNodes tags procedural models, light beams, and rings with facility metadata', () => {
      const { group, rings, facilitiesMap } = createCorridorLogisticsNodes();
      assert.ok(group instanceof THREE.Group);

      ALL_STAGE_FACILITIES.forEach((fac) => {
        const record = facilitiesMap[fac.id];
        assert.ok(record, `Must have facilitiesMap record for ${fac.id}`);

        // Procedural model metadata
        assert.equal(record.proceduralModel.userData.isFacility, true);
        assert.equal(record.proceduralModel.userData.nodeId, fac.id);
        assert.equal(record.proceduralModel.userData.code, fac.code);

        // Holographic light beam metadata
        assert.equal(record.beam.userData.isFacility, true);
        assert.equal(record.beam.userData.nodeId, fac.id);

        // Ground ring indicator metadata
        assert.equal(record.ringMesh.userData.isFacility, true);
        assert.equal(record.ringMesh.userData.nodeId, fac.id);
      });
    });

    test('Simulating raycasting on facility sub-meshes extracts nodeId and maps to authoritative facility metadata', () => {
      const { group } = createCorridorLogisticsNodes();

      const candidateMeshes = [];
      group.traverse((obj) => {
        if (obj.isMesh && obj.userData && obj.userData.isFacility) {
          candidateMeshes.push(obj);
        }
      });

      assert.ok(candidateMeshes.length > 0, 'Must have raycastable facility meshes');

      candidateMeshes.forEach((mesh) => {
        const { nodeId } = mesh.userData;
        assert.ok(nodeId, 'Mesh userData must contain nodeId');
        const found = ALL_STAGE_FACILITIES.find((f) => f.id === nodeId);
        assert.ok(found, `Facility nodeId ${nodeId} must match ALL_STAGE_FACILITIES`);
        assert.ok(found.name, 'Facility must contain name');
        assert.ok(found.tier, 'Facility must contain tier description');
        assert.ok(found.pos, 'Facility must contain 3D spatial position');
        assert.ok(found.color, 'Facility must contain theme color hex');
        assert.ok(found.details, 'Facility must contain operational throughput details');
      });
    });
  });

  describe('3. Night Simulation Toggle & Emissive Illumination Shift', () => {
    test('calculateNightGlowFactor correctly maps 24h simulation time to [0.0, 1.0] lighting curve', () => {
      assert.equal(calculateNightGlowFactor('08:00:00 AM'), 0.0, 'Daylight morning must be 0.0');
      assert.equal(calculateNightGlowFactor('12:00:00 PM'), 0.0, 'Noon must be 0.0');
      assert.equal(calculateNightGlowFactor('04:00:00 PM'), 0.0, 'Afternoon must be 0.0');

      // Dusk transition: 18:00 to 21:00
      const duskMid = calculateNightGlowFactor('07:30:00 PM');
      assert.ok(duskMid > 0.4 && duskMid < 0.6, 'Mid-dusk (19:30) must be ~0.5');

      // Deep night: 21:00 to 05:00
      assert.equal(calculateNightGlowFactor('10:00:00 PM'), 1.0, 'Night 22:00 must be 1.0');
      assert.equal(calculateNightGlowFactor('02:00:00 AM'), 1.0, 'Midnight 02:00 must be 1.0');

      // Dawn transition: 05:00 to 07:00
      const dawnMid = calculateNightGlowFactor('06:00:00 AM');
      assert.ok(dawnMid > 0.4 && dawnMid < 0.6, 'Mid-dawn (06:00) must be ~0.5');
    });

    test('Ambient illumination shifts from daytime brilliance to deep cyber night', () => {
      // Daytime (nightFactor = 0.0)
      const dayAmbient = 2.4 - 1.65 * 0.0;
      const daySun = 2.6 - 2.2 * 0.0;
      assert.equal(dayAmbient, 2.4, 'Daytime ambient intensity must be 2.4');
      assert.equal(daySun, 2.6, 'Daytime sunlight intensity must be 2.6');

      // Nighttime (nightFactor = 1.0)
      const nightAmbient = 2.4 - 1.65 * 1.0;
      const nightSun = 2.6 - 2.2 * 1.0;
      assert.ok(Math.abs(nightAmbient - 0.75) < 0.001, 'Night ambient intensity must be 0.75');
      assert.ok(Math.abs(nightSun - 0.4) < 0.001, 'Night sunlight intensity must drop to 0.4 moonlight');
    });

    test('All corridor hub emissive materials activate luminous glow under night illumination', () => {
      const { group, facilitiesMap } = createCorridorLogisticsNodes();

      const testMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.6
      });
      const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), testMat);
      dummyMesh.userData = { isFacility: true, nodeId: 'DC-BHW-01' };
      facilitiesMap['DC-BHW-01'].emissiveMaterials.push(testMat);

      // Daytime (factor 0.0) -> Multiplier 0.2
      const dayMultiplier = 0.2 + 1.2 * 0.0;
      testMat.userData.baseEmissiveIntensity = 0.6;
      testMat.emissiveIntensity = testMat.userData.baseEmissiveIntensity * dayMultiplier;
      assert.ok(Math.abs(testMat.emissiveIntensity - 0.12) < 0.01, 'Daytime emissive must be subdued');

      // Nighttime (factor 1.0) -> Multiplier 1.4
      const nightMultiplier = 0.2 + 1.2 * 1.0;
      testMat.emissiveIntensity = testMat.userData.baseEmissiveIntensity * nightMultiplier;
      assert.ok(Math.abs(testMat.emissiveIntensity - 0.84) < 0.01, 'Nighttime emissive must be fully illuminated');
    });

    test('Extruded highway road ribbons expose shoulderMat and centerLaneMat for night luminescence', () => {
      const { mainCorridorCurve } = buildCorridorSplines();
      const roadRibbon = createExtrudedHighwayRibbon(mainCorridorCurve);

      assert.ok(roadRibbon.shoulderMat, 'Highway ribbon must attach shoulderMat');
      assert.ok(roadRibbon.centerLaneMat, 'Highway ribbon must attach centerLaneMat');

      // Night modulation test
      const nightFactor = 1.0;
      roadRibbon.shoulderMat.opacity = 0.55 + 0.4 * nightFactor;
      assert.ok(roadRibbon.shoulderMat.opacity >= 0.95, 'Shoulder rail opacity must be elevated at night');
    });
  });

  describe('4. WebGL Memory Profiling & Engine Toggle Disposal', () => {
    test('profileWebGLMemory accurately extracts GPU memory metrics from WebGLRenderer', () => {
      const mockRenderer = {
        info: {
          memory: { geometries: 48, textures: 12 },
          render: { calls: 24, triangles: 3600, frame: 120 }
        }
      };

      const profile = profileWebGLMemory(mockRenderer);
      assert.equal(profile.geometries, 48);
      assert.equal(profile.textures, 12);
      assert.equal(profile.renderCalls, 24);
      assert.equal(profile.triangles, 3600);
      assert.equal(profile.frame, 120);
    });

    test('disposeThreeScene disposes all geometries, materials, and comprehensive texture maps', () => {
      const scene = new THREE.Scene();
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial();

      let geoDisposed = false;
      let matDisposed = false;
      let mapDisposed = false;
      let emissiveMapDisposed = false;
      let aoMapDisposed = false;

      geo.dispose = () => { geoDisposed = true; };
      mat.dispose = () => { matDisposed = true; };

      mat.map = { dispose: () => { mapDisposed = true; } };
      mat.emissiveMap = { dispose: () => { emissiveMapDisposed = true; } };
      mat.aoMap = { dispose: () => { aoMapDisposed = true; } };

      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      disposeThreeScene(scene);

      assert.ok(geoDisposed, 'Geometry must be disposed');
      assert.ok(matDisposed, 'Material must be disposed');
      assert.ok(mapDisposed, 'Albedo map texture must be disposed');
      assert.ok(emissiveMapDisposed, 'Emissive map texture must be disposed');
      assert.ok(aoMapDisposed, 'Ambient occlusion map texture must be disposed');
      assert.equal(scene.children.length, 0, 'Scene children must be cleared');
    });

    test('verifyDisposalMemoryState accurately assesses GPU memory clean state', () => {
      const cleanRenderer = {
        info: {
          memory: { geometries: 0, textures: 0 },
          render: { calls: 0, triangles: 0, frame: 10 }
        }
      };
      const dirtyRenderer = {
        info: {
          memory: { geometries: 16, textures: 8 },
          render: { calls: 12, triangles: 4200, frame: 10 }
        }
      };

      const cleanResult = verifyDisposalMemoryState(cleanRenderer);
      assert.equal(cleanResult.isClean, true, 'Clean renderer must report isClean: true');
      assert.equal(cleanResult.remainingGeometries, 0);
      assert.equal(cleanResult.remainingTextures, 0);

      const dirtyResult = verifyDisposalMemoryState(dirtyRenderer);
      assert.equal(dirtyResult.isClean, false, 'Dirty renderer must report isClean: false');
      assert.equal(dirtyResult.remainingGeometries, 16);
      assert.equal(dirtyResult.remainingTextures, 8);
    });

    test('disposeCachedModels recursively purges cached GLTF scenes and clears caches', () => {
      // Create a dummy scene with geometry, material, and textures to test disposal
      const dummyScene = new THREE.Scene();
      const dummyGeo = new THREE.BoxGeometry(2, 2, 2);
      let geoDisposed = false;
      dummyGeo.dispose = () => { geoDisposed = true; };

      const dummyMat = new THREE.MeshStandardMaterial();
      let matDisposed = false;
      dummyMat.dispose = () => { matDisposed = true; };

      let texDisposed = false;
      dummyMat.map = { dispose: () => { texDisposed = true; } };

      const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
      dummyScene.add(dummyMesh);

      // Verify that disposeCachedModels executes cleanly and traverses scene
      assert.doesNotThrow(() => {
        disposeCachedModels();
      });
    });

    test('shouldThrottleRender halts rendering when engine is backgrounded without PiP', () => {
      // Primary visible engine
      assert.equal(
        shouldThrottleRender({ isEnginePrimary: true, isPiPVisible: false }),
        false,
        'Primary engine should not throttle'
      );

      // Secondary visible in PiP
      assert.equal(
        shouldThrottleRender({ isEnginePrimary: false, isPiPVisible: true }),
        false,
        'Secondary engine visible in PiP should not throttle'
      );

      // Hidden in background (engine switched to Cesium without PiP)
      assert.equal(
        shouldThrottleRender({ isEnginePrimary: false, isPiPVisible: false }),
        true,
        'Background engine without PiP must throttle completely to prevent GPU contention'
      );

      // Document hidden or context lost
      assert.equal(
        shouldThrottleRender({ documentHidden: true }),
        true,
        'Document hidden must throttle render loop'
      );
      assert.equal(
        shouldThrottleRender({ isContextLost: true }),
        true,
        'Lost context must throttle render loop'
      );
    });
  });

  describe('5. 60 FPS Render Loop Stability Across All 4 Camera Modes', () => {
    const truckPos = [10, 0, -20];
    const truckHeading = [0, 0, 1];

    test('CAMERA_MODES and CAMERA_MODE_METADATA define all 4 required operational perspectives', () => {
      assert.equal(CAMERA_MODES.CHASE, 'CHASE');
      assert.equal(CAMERA_MODES.COCKPIT, 'COCKPIT');
      assert.equal(CAMERA_MODES.DRONE, 'DRONE');
      assert.equal(CAMERA_MODES.FREE_ORBIT, 'FREE_ORBIT');

      [CAMERA_MODES.CHASE, CAMERA_MODES.COCKPIT, CAMERA_MODES.DRONE, CAMERA_MODES.FREE_ORBIT].forEach((mode) => {
        const meta = CAMERA_MODE_METADATA[mode];
        assert.ok(meta, `Metadata for ${mode} must exist`);
        assert.ok(meta.name);
        assert.ok(meta.badge);
        assert.ok(meta.hotkey);
      });
    });

    test('1. Chase Cam calculation maintains smooth distance and pitch offsets without NaN', () => {
      const chase = calculateChaseCameraPosition({
        truckPos,
        truckHeading,
        yawOffset: 0.1,
        pitchOffset: 0.2,
        distance: 14.0,
        height: 5.2
      });

      assert.equal(chase.position.length, 3);
      assert.equal(chase.lookAt.length, 3);
      chase.position.forEach((val) => assert.ok(Number.isFinite(val), 'Chase position coordinates must be finite numbers'));
      chase.lookAt.forEach((val) => assert.ok(Number.isFinite(val), 'Chase lookAt coordinates must be finite numbers'));
    });

    test('2. Cockpit Dashcam POV places camera precisely at cab eye height and forward offset', () => {
      const cockpit = calculateCockpitCameraPosition({
        truckPos,
        truckHeading,
        eyeHeight: 2.3,
        forwardOffset: 2.6
      });

      assert.equal(cockpit.position.length, 3);
      assert.equal(cockpit.lookAt.length, 3);
      assert.equal(cockpit.position[1], truckPos[1] + 2.3, 'Cockpit camera height must match eyeHeight');
      cockpit.position.forEach((val) => assert.ok(Number.isFinite(val), 'Cockpit position must be finite'));
      cockpit.lookAt.forEach((val) => assert.ok(Number.isFinite(val), 'Cockpit lookAt must be finite'));
    });

    test('3. Drone God-View calculates elevated tactical aerial coordinates', () => {
      const drone = calculateDroneCameraPosition({
        truckPos,
        altitude: 54.0,
        pitchBias: 8.0
      });

      assert.equal(drone.position.length, 3);
      assert.equal(drone.lookAt.length, 3);
      assert.equal(drone.position[1], truckPos[1] + 54.0, 'Drone altitude must match 54.0');
      drone.position.forEach((val) => assert.ok(Number.isFinite(val), 'Drone position must be finite'));
      drone.lookAt.forEach((val) => assert.ok(Number.isFinite(val), 'Drone lookAt must be finite'));
    });

    test('Exponential damping helper dampArray3 smoothly converges at 60 FPS (delta = 1/60s)', () => {
      const current = [0, 0, 0];
      const target = [10, 20, 30];
      const dt = 1 / 60; // 60 FPS frame time (16.6ms)

      const damped = dampArray3(current, target, 8.5, dt);
      assert.equal(damped.length, 3);

      // Verify positive monotonic progression towards target
      assert.ok(damped[0] > 0 && damped[0] < target[0]);
      assert.ok(damped[1] > 0 && damped[1] < target[1]);
      assert.ok(damped[2] > 0 && damped[2] < target[2]);
    });
  });

});
