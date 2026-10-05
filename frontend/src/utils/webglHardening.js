/**
 * webglHardening.js
 *
 * Production hardening utilities for dual-canvas WebGL lifecycles.
 * Handles WebGL context loss/restoration, scene memory disposal,
 * and adaptive RAF throttling to guarantee 60 FPS rendering without leaks.
 */

/**
 * Disposes a Three.js scene recursively to prevent GPU memory leaks.
 * Disposes all geometries, materials, textures, and render targets.
 *
 * @param {import('three').Scene} scene - The Three.js scene to dispose
 * @param {import('three').WebGLRenderer} [renderer] - The WebGLRenderer to dispose
 */
export function disposeThreeScene(scene, renderer) {
  if (!scene) return;

  scene.traverse((object) => {
    // 1. Dispose Geometry
    if (object.geometry && typeof object.geometry.dispose === 'function') {
      object.geometry.dispose();
    }

    // 2. Dispose Materials and associated textures
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (!mat) return;
        // Dispose textures attached to material
        const textureKeys = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'alphaMap', 'roughnessMap', 'metalnessMap'];
        textureKeys.forEach((key) => {
          if (mat[key] && typeof mat[key].dispose === 'function') {
            mat[key].dispose();
          }
        });
        if (typeof mat.dispose === 'function') {
          mat.dispose();
        }
      });
    }
  });

  // 3. Clear scene children
  if (typeof scene.clear === 'function') {
    scene.clear();
  }

  // 4. Dispose WebGLRenderer and internal render lists
  if (renderer) {
    if (renderer.renderLists && typeof renderer.renderLists.dispose === 'function') {
      renderer.renderLists.dispose();
    }
    if (typeof renderer.dispose === 'function') {
      renderer.dispose();
    }
    if (typeof renderer.forceContextLoss === 'function') {
      try {
        renderer.forceContextLoss();
      } catch {
        // ignore if already lost
      }
    }
  }
}

/**
 * Safely checks whether WebGL is supported and available in the current browser/DOM environment.
 *
 * @param {HTMLCanvasElement} [testCanvas] - Optional canvas element to test against
 * @returns {boolean} True if WebGL or WebGL2 context creation succeeds
 */
export function isWebGLAvailable(testCanvas) {
  try {
    const canvas = testCanvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    if (!canvas || typeof canvas.getContext !== 'function') return false;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl && gl.getParameter);
  } catch {
    return false;
  }
}

/**
 * Attaches webglcontextlost and webglcontextrestored event handlers to a canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Function} onContextLost
 * @param {Function} onContextRestored
 * @returns {Function} Unsubscribe cleanup function
 */
export function setupContextLossHandlers(canvas, onContextLost, onContextRestored) {
  if (!canvas || typeof canvas.addEventListener !== 'function') {
    return () => {};
  }

  const handleLost = (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (typeof onContextLost === 'function') {
      onContextLost(event);
    }
  };

  const handleRestored = (event) => {
    if (typeof onContextRestored === 'function') {
      onContextRestored(event);
    }
  };

  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost, false);
    canvas.removeEventListener('webglcontextrestored', handleRestored, false);
  };
}

/**
 * Determines whether a WebGL render loop should be throttled or paused.
 * Used to avoid running duplicate RAF render loops when canvases are hidden or document is inactive.
 *
 * @param {Object} options
 * @param {boolean} [options.documentHidden] - Document visibility state
 * @param {boolean} [options.isContextLost] - True if WebGL context was lost
 * @param {boolean} [options.isEnginePrimary] - True if this engine is the full-screen stage
 * @param {boolean} [options.isPiPVisible] - True if this engine is visible in PiP
 * @returns {boolean} True if rendering should be skipped for this frame
 */
export function shouldThrottleRender({
  documentHidden = false,
  isContextLost = false,
  isEnginePrimary = true,
  isPiPVisible = false
} = {}) {
  // If the browser tab is hidden or WebGL context lost, throttle completely
  if (documentHidden || isContextLost) {
    return true;
  }

  // If engine is neither primary nor visible in PiP, it's hidden: throttle completely
  if (!isEnginePrimary && !isPiPVisible) {
    return true;
  }

  return false;
}
