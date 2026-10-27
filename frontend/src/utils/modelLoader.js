/**
 * modelLoader.js
 *
 * Singleton GLTF/GLB Model Loader with in-memory caching, scene cloning,
 * procedural fallback resilience, and dynamic day/night emissive shader modulation.
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Singleton GLTFLoader instance
let loaderInstance = null;

// Memory Cache: url -> { gltf, scene }
const modelCache = new Map();

// In-Flight Promise Cache: url -> Promise<{ gltf, scene }>
const loadingPromises = new Map();

/**
 * Authoritative mapping of Corridor Hub Node IDs and Codes to static GLB asset paths.
 */
export const FACILITY_MODEL_MAP = {
  'PORT-JNPT-01': '/models/facilities/facility_jnpt.glb',
  'JNPT': '/models/facilities/facility_jnpt.glb',
  'DEP-PNV-01': '/models/facilities/facility_panvel.glb',
  'PANVEL': '/models/facilities/facility_panvel.glb',
  'HUB-THN-01': '/models/facilities/facility_thane.glb',
  'THANE': '/models/facilities/facility_thane.glb',
  'DC-BHW-01': '/models/facilities/facility_bhiwandi.glb',
  'BHIWANDI': '/models/facilities/facility_bhiwandi.glb',
  'DEP-NSK-01': '/models/facilities/facility_nashik.glb',
  'NASHIK': '/models/facilities/facility_nashik.glb',
  'FC-PUN-01': '/models/facilities/facility_pune.glb',
  'PUNE': '/models/facilities/facility_pune.glb'
};

/**
 * Returns the cached singleton GLTFLoader instance.
 *
 * @returns {GLTFLoader}
 */
export function getGLTFLoader() {
  if (!loaderInstance) {
    loaderInstance = new GLTFLoader();
  }
  return loaderInstance;
}

/**
 * Clears the in-memory cache and in-flight promise table.
 */
export function clearModelCache() {
  modelCache.clear();
  loadingPromises.clear();
}

/**
 * Disposes all cached GLTF scenes, geometries, materials, and textures,
 * then clears the memory cache.
 */
export function disposeCachedModels() {
  modelCache.forEach((entry) => {
    const scene = entry?.scene;
    if (scene) {
      scene.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') {
          obj.geometry.dispose();
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (!m) return;
            const texKeys = [
              'map',
              'emissiveMap',
              'lightMap',
              'aoMap',
              'bumpMap',
              'normalMap',
              'displacementMap',
              'roughnessMap',
              'metalnessMap',
              'alphaMap',
              'specularMap',
              'envMap',
              'clearcoatMap',
              'transmissionMap'
            ];
            texKeys.forEach((k) => {
              if (m[k] && typeof m[k].dispose === 'function') {
                m[k].dispose();
              }
            });
            if (typeof m.dispose === 'function') {
              m.dispose();
            }
          });
        }
      });
    }
  });
  modelCache.clear();
  loadingPromises.clear();
}

/**
 * Checks whether a model URL is currently cached in memory.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isModelCached(url) {
  return modelCache.has(url);
}

/**
 * Deep-clones a Three.js scene hierarchy, including independent material clones
 * and preserved base emissive metadata.
 *
 * @param {THREE.Object3D} scene
 * @param {boolean} [cloneMaterials=true]
 * @returns {THREE.Object3D}
 */
export function cloneScene(scene, cloneMaterials = true) {
  if (!scene) return null;
  const clone = scene.clone(true);

  if (cloneMaterials) {
    const clonedMaterials = new Map();

    const cloneMaterialInstance = (mat) => {
      if (clonedMaterials.has(mat)) {
        return clonedMaterials.get(mat);
      }
      const mClone = mat.clone();
      const hasEmissiveColor = mClone.emissive && (mClone.emissive.r > 0 || mClone.emissive.g > 0 || mClone.emissive.b > 0);
      if (hasEmissiveColor && mClone.userData.baseEmissiveIntensity === undefined) {
        mClone.userData.baseEmissiveIntensity = mClone.emissiveIntensity !== undefined && mClone.emissiveIntensity > 0
          ? mClone.emissiveIntensity
          : 0.6;
      }
      clonedMaterials.set(mat, mClone);
      return mClone;
    };

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(cloneMaterialInstance);
        } else {
          child.material = cloneMaterialInstance(child.material);
        }
      }
    });
  }

  return clone;
}

/**
 * Asynchronously loads, parses, and caches a GLTF/GLB model from URL or local path.
 * Deduplicates in-flight network requests and returns an independent cloned scene.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {boolean} [options.cloneMaterials=true]
 * @returns {Promise<{ gltf: Object, scene: THREE.Object3D }>}
 */
export async function loadGLTF(url, options = {}) {
  const cloneMats = options.cloneMaterials !== false;

  // 1. In-memory cache hit
  if (modelCache.has(url)) {
    const cached = modelCache.get(url);
    return {
      gltf: cached.gltf,
      scene: cloneScene(cached.scene, cloneMats)
    };
  }

  // 2. In-flight request deduplication
  if (loadingPromises.has(url)) {
    const cached = await loadingPromises.get(url);
    return {
      gltf: cached.gltf,
      scene: cloneScene(cached.scene, cloneMats)
    };
  }

  // 3. Initiate new load operation
  const loadPromise = (async () => {
    const loader = getGLTFLoader();

    // Check if running in Node.js test environment without active HTTP server
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node && url.startsWith('/')) {
      try {
        const fsMod = 'node:fs';
        const urlMod = 'node:url';
        const fs = await import(/* @vite-ignore */ fsMod);
        const { fileURLToPath } = await import(/* @vite-ignore */ urlMod);
        const resolvedPath = fileURLToPath(new URL('../../public' + url, import.meta.url));

        if (fs.existsSync(resolvedPath)) {
          const rawBuf = fs.readFileSync(resolvedPath);
          const buffer = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
          return new Promise((resolve, reject) => {
            loader.parse(
              buffer,
              '',
              (gltf) => {
                modelCache.set(url, { gltf, scene: gltf.scene });
                loadingPromises.delete(url);
                resolve({ gltf, scene: gltf.scene });
              },
              (err) => {
                loadingPromises.delete(url);
                reject(err);
              }
            );
          });
        }
      } catch {
        // Fall back to standard loader.load below
      }
    }

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          modelCache.set(url, { gltf, scene: gltf.scene });
          loadingPromises.delete(url);
          resolve({ gltf, scene: gltf.scene });
        },
        undefined,
        (err) => {
          loadingPromises.delete(url);
          reject(err);
        }
      );
    });
  })();

  loadingPromises.set(url, loadPromise);
  const result = await loadPromise;

  return {
    gltf: result.gltf,
    scene: cloneScene(result.scene, cloneMats)
  };
}

/**
 * Calculates dynamic night glow factor [0.0, 1.0] from simulation time string or seconds.
 * 0.0 = bright daylight (08:00 to 17:00)
 * 1.0 = deep night illumination (21:00 to 05:00)
 * [0.0..1.0] = dusk and dawn transitions
 *
 * @param {string|number|Date} timeInput - e.g. "08:00:00 AM", "10:30:00 PM", "22:15:00"
 * @returns {number} Normalized night factor between 0.0 and 1.0
 */
export function calculateNightGlowFactor(timeInput) {
  if (timeInput === null || timeInput === undefined) return 0.0;

  let hours = 12;

  if (typeof timeInput === 'number') {
    // Treat as elapsed seconds or seconds of the day
    const daySeconds = ((timeInput % 86400) + 86400) % 86400;
    hours = daySeconds / 3600;
  } else if (timeInput instanceof Date) {
    hours = timeInput.getHours() + timeInput.getMinutes() / 60;
  } else if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    // Check 12-hour AM/PM format: e.g. "08:00:00 AM" or "10:30 PM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = h + m / 60;
    } else {
      // Check 24-hour format: e.g. "14:30:00" or "22:00"
      const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (match24) {
        hours = parseInt(match24[1], 10) + parseInt(match24[2], 10) / 60;
      } else {
        return 0.0;
      }
    }
  } else {
    return 0.0;
  }

  // Normalize hour to [0, 24)
  hours = ((hours % 24) + 24) % 24;

  // Day: 07:00 to 18:00 (0.0)
  // Dusk transition: 18:00 to 21:00 (0.0 -> 1.0)
  // Night: 21:00 to 05:00 (1.0)
  // Dawn transition: 05:00 to 07:00 (1.0 -> 0.0)
  if (hours >= 7 && hours <= 18) {
    return 0.0;
  } else if (hours > 18 && hours < 21) {
    return (hours - 18) / 3.0; // 0.0 to 1.0
  } else if (hours >= 21 || hours <= 5) {
    return 1.0;
  } else if (hours > 5 && hours < 7) {
    return 1.0 - (hours - 5) / 2.0; // 1.0 to 0.0
  }

  return 0.0;
}

/**
 * Dynamically modulates emissiveIntensity across all materials in a scene or hierarchy.
 * Only modulates materials that have non-zero emissive color channels (e.g. windows, conduits, lane markers).
 *
 * @param {THREE.Object3D} sceneOrGroup
 * @param {number} nightFactor - 0.0 (daylight) to 1.0 (night)
 */
export function updateEmissiveIntensity(sceneOrGroup, nightFactor = 0.0) {
  if (!sceneOrGroup) return;
  const factor = Math.max(0.0, Math.min(1.0, nightFactor));
  // Multiplier: 0.2 at full day, 1.4 at full night
  const multiplier = 0.2 + 1.2 * factor;

  sceneOrGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        const hasEmissiveColor = mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0);
        if (hasEmissiveColor) {
          if (mat.userData.baseEmissiveIntensity === undefined) {
            mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined && mat.emissiveIntensity > 0)
              ? mat.emissiveIntensity
              : 0.6;
          }
          mat.emissiveIntensity = mat.userData.baseEmissiveIntensity * multiplier;
        }
      });
    }
  });
}
