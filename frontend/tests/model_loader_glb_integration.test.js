import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  getGLTFLoader,
  loadGLTF,
  cloneScene,
  clearModelCache,
  isModelCached,
  FACILITY_MODEL_MAP,
  calculateNightGlowFactor,
  updateEmissiveIntensity
} from '../src/utils/modelLoader.js';
import {
  STAGE_FACILITIES,
  ALL_STAGE_FACILITIES,
  PANVEL_DEPOT_NODE,
  CAMERA_VIEWS
} from '../src/constants/stage3DTopology.js';
import { createCorridorLogisticsNodes } from '../src/components/3d/proceduralWorld.js';
import { createFacilityNodeModel } from '../src/components/3d/proceduralModels.js';
import { mapFacilityBetweenEngines } from '../src/utils/engineSynchronization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_FACILITIES_DIR = path.resolve(__dirname, '../public/models/facilities');

describe('05: PersistentStage3D In-Place GLB Integration with Procedural Fallback & Night Glow Sync', () => {

  beforeEach(() => {
    clearModelCache();
  });

  describe('1. Cached Singleton GLTF Loader & Memory Cache', () => {
    test('getGLTFLoader returns a singleton GLTFLoader instance', () => {
      const loader1 = getGLTFLoader();
      const loader2 = getGLTFLoader();
      assert.ok(loader1, 'Loader must be instantiated');
      assert.equal(loader1, loader2, 'Repeated calls must return the identical singleton instance');
    });

    test('FACILITY_MODEL_MAP defines static asset paths for all 6 corridor facilities', () => {
      const expectedHubs = ['JNPT', 'PANVEL', 'THANE', 'BHIWANDI', 'NASHIK', 'PUNE'];
      expectedHubs.forEach((hub) => {
        const mappedByCode = FACILITY_MODEL_MAP[hub];
        assert.ok(mappedByCode, `Hub ${hub} must have a mapped GLB path`);
        assert.ok(mappedByCode.endsWith('.glb'), `Path for ${hub} must end with .glb`);
      });

      assert.equal(FACILITY_MODEL_MAP['PORT-JNPT-01'], '/models/facilities/facility_jnpt.glb');
      assert.equal(FACILITY_MODEL_MAP['DEP-PNV-01'], '/models/facilities/facility_panvel.glb');
      assert.equal(FACILITY_MODEL_MAP['HUB-THN-01'], '/models/facilities/facility_thane.glb');
      assert.equal(FACILITY_MODEL_MAP['DC-BHW-01'], '/models/facilities/facility_bhiwandi.glb');
      assert.equal(FACILITY_MODEL_MAP['DEP-NSK-01'], '/models/facilities/facility_nashik.glb');
      assert.equal(FACILITY_MODEL_MAP['FC-PUN-01'], '/models/facilities/facility_pune.glb');
    });

    test('Parses and verifies real delivered GLB assets from public static directory', async () => {
      const loader = getGLTFLoader();
      const files = [
        'facility_jnpt.glb',
        'facility_panvel.glb',
        'facility_thane.glb',
        'facility_bhiwandi.glb',
        'facility_nashik.glb',
        'facility_pune.glb'
      ];

      for (const filename of files) {
        const filePath = path.join(PUBLIC_FACILITIES_DIR, filename);
        assert.ok(fs.existsSync(filePath), `Static file ${filename} must exist on disk`);
        const buffer = fs.readFileSync(filePath).buffer;

        const parsedGLTF = await loader.parseAsync(buffer, '');

        assert.ok(parsedGLTF, `${filename} must parse from ArrayBuffer`);
        assert.ok(parsedGLTF.scene instanceof THREE.Group || parsedGLTF.scene instanceof THREE.Object3D);
        
        let meshCount = 0;
        parsedGLTF.scene.traverse((child) => {
          if (child.isMesh) meshCount++;
        });
        assert.ok(meshCount > 100, `${filename} must contain detailed architectural meshes (found ${meshCount})`);
      }
    });

    test('cloneScene creates independent scene clones preserving materials and geometry', () => {
      const parent = new THREE.Group();
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.6
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'TestBuilding';
      parent.add(mesh);

      const clone = cloneScene(parent, true);
      assert.ok(clone instanceof THREE.Group);
      assert.notEqual(clone, parent, 'Cloned group must have distinct reference');
      assert.equal(clone.children.length, 1);

      const clonedMesh = clone.children[0];
      assert.equal(clonedMesh.name, 'TestBuilding');
      assert.notEqual(clonedMesh, mesh, 'Cloned child mesh must have distinct reference');
      assert.notEqual(clonedMesh.material, mesh.material, 'Cloned material must be distinct when cloneMaterials=true');
      assert.equal(clonedMesh.material.emissiveIntensity, 0.6);

      // Mutate clone without affecting parent
      clonedMesh.material.emissiveIntensity = 1.2;
      assert.equal(mesh.material.emissiveIntensity, 0.6, 'Original material must remain untouched');
    });

    test('loadGLTF loads, caches, and returns cloned scene for mapped facility', async () => {
      const result1 = await loadGLTF(FACILITY_MODEL_MAP['JNPT']);
      assert.ok(result1.scene instanceof THREE.Group || result1.scene instanceof THREE.Object3D);
      assert.equal(isModelCached(FACILITY_MODEL_MAP['JNPT']), true);

      // Duplicate request returns cached scene without refetching
      const result2 = await loadGLTF(FACILITY_MODEL_MAP['JNPT']);
      assert.notEqual(result1.scene, result2.scene, 'loadGLTF returns distinct clones');
      assert.equal(result1.gltf, result2.gltf, 'Underlying gltf instance is cached');
    });

    test('cloneScene preserves shared material instances across sibling meshes', () => {
      const parent = new THREE.Group();
      const sharedMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.6
      });
      const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
      const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
      parent.add(mesh1);
      parent.add(mesh2);

      const clone = cloneScene(parent, true);
      assert.notEqual(clone.children[0].material, sharedMat, 'Cloned mesh must not use original material');
      assert.equal(
        clone.children[0].material,
        clone.children[1].material,
        'Sibling meshes sharing a material must continue sharing the cloned material'
      );
    });

    test('loadGLTF deduplicates concurrent in-flight requests for the same asset', async () => {
      clearModelCache();
      const [resA, resB] = await Promise.all([
        loadGLTF(FACILITY_MODEL_MAP['THANE']),
        loadGLTF(FACILITY_MODEL_MAP['THANE'])
      ]);
      assert.ok(resA.scene && resB.scene);
      assert.equal(resA.gltf, resB.gltf, 'Concurrent calls must resolve to the identical underlying GLTF data');
      assert.notEqual(resA.scene, resB.scene, 'Each caller must receive an independent scene clone');
    });

    test('clearModelCache and isModelCached properly manage in-memory cache lifecycle', () => {
      assert.equal(isModelCached('/models/facilities/facility_jnpt.glb'), false);
      clearModelCache();
      assert.equal(isModelCached('/models/facilities/facility_jnpt.glb'), false);
    });
  });

  describe('2. Dynamic Simulation Clock Emissive Night Glow Synchronization', () => {
    test('calculateNightGlowFactor resolves correct normalized night factor for 12h and 24h formats', () => {
      // Midnight / Late night -> maximum glow (1.0)
      assert.equal(calculateNightGlowFactor('12:00:00 AM'), 1.0);
      assert.equal(calculateNightGlowFactor('00:00:00'), 1.0);
      assert.equal(calculateNightGlowFactor('02:30:00 AM'), 1.0);
      assert.equal(calculateNightGlowFactor('23:00:00'), 1.0);
      assert.equal(calculateNightGlowFactor('11:00:00 PM'), 1.0);

      // Midday / Noon -> zero / daytime base glow (0.0)
      assert.equal(calculateNightGlowFactor('12:00:00 PM'), 0.0);
      assert.equal(calculateNightGlowFactor('12:00:00'), 0.0);
      assert.equal(calculateNightGlowFactor('01:30:00 PM'), 0.0);
      assert.equal(calculateNightGlowFactor('14:00:00'), 0.0);

      // Dawn / Dusk transitions -> smooth interpolation (between 0.0 and 1.0)
      const dusk = calculateNightGlowFactor('07:00:00 PM');
      assert.ok(dusk > 0.0 && dusk < 1.0, `Dusk 7 PM glow factor (${dusk}) must be between 0 and 1`);

      const dawn = calculateNightGlowFactor('06:00:00 AM');
      assert.ok(dawn > 0.0 && dawn < 1.0, `Dawn 6 AM glow factor (${dawn}) must be between 0 and 1`);

      // Fallback for null or unknown string returns daylight factor 0.0
      assert.equal(calculateNightGlowFactor(null), 0.0);
      assert.equal(calculateNightGlowFactor('invalid'), 0.0);
    });

    test('updateEmissiveIntensity modulates emissive materials without mutating non-emissive surfaces', () => {
      const group = new THREE.Group();

      // Mesh with cyan emissive window material
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.6
      });
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), windowMat);
      group.add(windowMesh);

      // Mesh with non-emissive asphalt concrete material (emissive: 0x000000)
      const asphaltMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0.0
      });
      const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), asphaltMat);
      group.add(groundMesh);

      // Night mode (factor = 1.0) -> window illuminates, asphalt stays unlit
      updateEmissiveIntensity(group, 1.0);
      assert.ok(windowMat.emissiveIntensity > 0.6, 'Window emissive intensity must increase at night');
      assert.equal(asphaltMat.emissiveIntensity, 0.0, 'Non-emissive surface must remain unlit');

      // Daytime mode (factor = 0.0) -> window dims to subtle daylight baseline
      updateEmissiveIntensity(group, 0.0);
      assert.ok(windowMat.emissiveIntensity <= 0.3, 'Window emissive intensity must dim during day');
      assert.equal(asphaltMat.emissiveIntensity, 0.0);
    });
  });

  describe('3. Panvel Logistics Depot & Corridor Topology Upgrade', () => {
    test('Defines PANVEL_DEPOT_NODE with correct spatial coordinates matching manifest', () => {
      assert.ok(PANVEL_DEPOT_NODE, 'PANVEL_DEPOT_NODE must be exported');
      assert.equal(PANVEL_DEPOT_NODE.id, 'DEP-PNV-01');
      assert.equal(PANVEL_DEPOT_NODE.code, 'PANVEL');
      assert.deepEqual(PANVEL_DEPOT_NODE.pos, [-34, 0, 24]);
    });

    test('ALL_STAGE_FACILITIES includes all 7 corridor hubs while STAGE_FACILITIES retains backward compatibility', () => {
      assert.equal(STAGE_FACILITIES.length, 6, 'STAGE_FACILITIES maintains backward compatibility with 6 nodes');
      assert.equal(ALL_STAGE_FACILITIES.length, 7, 'ALL_STAGE_FACILITIES includes Panvel and all corridor hubs');

      const allCodes = ALL_STAGE_FACILITIES.map((f) => f.code);
      const expectedCodes = ['JNPT', 'PANVEL', 'THANE', 'BHIWANDI', 'KASARA', 'NASHIK', 'PUNE'];
      expectedCodes.forEach((code) => {
        assert.ok(allCodes.includes(code), `ALL_STAGE_FACILITIES must contain ${code}`);
      });
    });

    test('CAMERA_VIEWS includes dedicated inspection preset for PANVEL_DEPOT', () => {
      assert.ok(CAMERA_VIEWS.PANVEL_DEPOT, 'Must export PANVEL_DEPOT camera view preset');
      assert.equal(CAMERA_VIEWS.PANVEL_DEPOT.position.length, 3);
      assert.deepEqual(CAMERA_VIEWS.PANVEL_DEPOT.target, [-34, 0, 24]);
    });

    test('createFacilityNodeModel generates procedural fallback for PANVEL depot', () => {
      const model = createFacilityNodeModel(PANVEL_DEPOT_NODE);
      assert.ok(model instanceof THREE.Group);
      assert.equal(model.userData.isFacility, true);
      assert.equal(model.userData.nodeId, 'DEP-PNV-01');
      assert.equal(model.userData.code, 'PANVEL');
      assert.ok(model.children.length > 0, 'Panvel procedural model must contain geometry');
    });

    test('mapFacilityBetweenEngines correctly resolves aliases and preset keys for Panvel and Pune', () => {
      // Panvel Depot resolution
      const panvelByCode = mapFacilityBetweenEngines('PANVEL');
      assert.equal(panvelByCode.stageNode?.id, 'DEP-PNV-01');
      assert.equal(panvelByCode.presetKey, 'PANVEL_DEPOT');

      const panvelById = mapFacilityBetweenEngines('DEP-PNV-01');
      assert.equal(panvelById.stageNode?.id, 'DEP-PNV-01');
      assert.equal(panvelById.presetKey, 'PANVEL_DEPOT');

      const panvelByPreset = mapFacilityBetweenEngines('PANVEL_DEPOT');
      assert.equal(panvelByPreset.stageNode?.id, 'DEP-PNV-01');
      assert.equal(panvelByPreset.presetKey, 'PANVEL_DEPOT');

      // Pune FC resolution
      const puneByCode = mapFacilityBetweenEngines('PUNE');
      assert.equal(puneByCode.stageNode?.id, 'FC-PUN-01');
      assert.equal(puneByCode.presetKey, 'PUNE_FC');

      const puneByPreset = mapFacilityBetweenEngines('PUNE_FC');
      assert.equal(puneByPreset.stageNode?.id, 'FC-PUN-01');
      assert.equal(puneByPreset.presetKey, 'PUNE_FC');
    });
  });

  describe('4. In-Place GLB Model Loading, Procedural Fallback & Raycasting Beacons', () => {
    test('createCorridorLogisticsNodes mounts instant procedural models and returns facilitiesMap', () => {
      const { group, rings, facilitiesMap } = createCorridorLogisticsNodes();

      assert.ok(group instanceof THREE.Group);
      assert.equal(group.name, 'CorridorLogisticsFacilities');
      assert.ok(rings.length >= 6, 'Must generate pulsing ground rings for all corridor nodes');

      // Verify each corridor facility is registered in facilitiesMap
      const requiredNodes = ['PORT-JNPT-01', 'DEP-PNV-01', 'HUB-THN-01', 'DC-BHW-01', 'PASS-KASARA-01', 'DEP-NSK-01', 'FC-PUN-01'];
      requiredNodes.forEach((nodeId) => {
        const item = facilitiesMap[nodeId];
        assert.ok(item, `facilitiesMap must register ${nodeId}`);
        assert.ok(item.model instanceof THREE.Group || item.model instanceof THREE.Object3D);
        assert.ok(item.beam instanceof THREE.Mesh, `${nodeId} must have vertical light beam`);
        assert.ok(item.ringMesh instanceof THREE.Mesh, `${nodeId} must have ground ring mesh`);
        assert.equal(item.node.id, nodeId);

        // Verify raycasting metadata tags
        assert.equal(item.model.userData.isFacility, true, `${nodeId} model must be tagged isFacility`);
        assert.equal(item.model.userData.nodeId, nodeId);
      });
    });

    test('Holographic light beams use CylinderGeometry with AdditiveBlending', () => {
      const { facilitiesMap } = createCorridorLogisticsNodes();
      const jnpt = facilitiesMap['PORT-JNPT-01'];
      assert.ok(jnpt.beam.geometry instanceof THREE.CylinderGeometry);
      assert.equal(jnpt.beam.material.blending, THREE.AdditiveBlending);
      assert.equal(jnpt.beam.material.transparent, true);
    });

    test('Pulsing ground rings use RingGeometry positioned flat above ground surface', () => {
      const { rings } = createCorridorLogisticsNodes();
      rings.forEach((r) => {
        assert.ok(r.mesh.geometry instanceof THREE.RingGeometry);
        assert.ok(r.nodeId, 'Ring record must track nodeId');
        assert.equal(r.scale, 1);
      });
    });

    test('Kasara Ghat retains dedicated procedural mountain elevation pass without attempting GLB load', () => {
      const { facilitiesMap } = createCorridorLogisticsNodes();
      const kasara = facilitiesMap['PASS-KASARA-01'];
      assert.ok(kasara, 'Kasara must be in facilitiesMap');
      assert.equal(kasara.node.code, 'KASARA');
      // Kasara does not have a mapped GLB in FACILITY_MODEL_MAP
      assert.equal(FACILITY_MODEL_MAP['PASS-KASARA-01'], undefined);
      assert.equal(FACILITY_MODEL_MAP['KASARA'], undefined);
    });
  });
});
