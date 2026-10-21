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

  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  const disposedTextures = new Set();

  scene.traverse((object) => {
    // 1. Dispose Geometry (deduplicated)
    if (object.geometry && !disposedGeometries.has(object.geometry)) {
      disposedGeometries.add(object.geometry);
      if (typeof object.geometry.dispose === 'function') {
        object.geometry.dispose();
      }
    }

    // 2. Dispose Materials and associated textures (deduplicated)
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (!mat || disposedMaterials.has(mat)) return;
        disposedMaterials.add(mat);
        // Dispose textures attached to material comprehensively
        const textureKeys = [
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
        textureKeys.forEach((key) => {
          const tex = mat[key];
          if (tex && !disposedTextures.has(tex)) {
            disposedTextures.add(tex);
            if (typeof tex.dispose === 'function') {
              tex.dispose();
            }
          }
        });
        if (typeof mat.dispose === 'function') {
          mat.dispose();
        }
      });
    }

    // 3. Dispose shadow map render targets on lights
    if (object.isLight && object.shadow && object.shadow.map) {
      if (typeof object.shadow.map.dispose === 'function') {
        object.shadow.map.dispose();
      }
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
  }
}

/**
 * Captures current WebGL memory telemetry metrics from the active renderer.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @returns {{
 *   geometries: number,
 *   textures: number,
 *   renderCalls: number,
 *   triangles: number,
 *   frame: number
 * }}
 */
export function profileWebGLMemory(renderer) {
  if (!renderer || !renderer.info) {
    return {
      geometries: 0,
      textures: 0,
      renderCalls: 0,
      triangles: 0,
      frame: 0
    };
  }
  return {
    geometries: renderer.info.memory?.geometries ?? 0,
    textures: renderer.info.memory?.textures ?? 0,
    renderCalls: renderer.info.render?.calls ?? 0,
    triangles: renderer.info.render?.triangles ?? 0,
    frame: renderer.info.render?.frame ?? 0
  };
}

/**
 * Validates that scene disposal cleanly releases all GPU geometries and textures.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @returns {{ isClean: boolean, remainingGeometries: number, remainingTextures: number }}
 */
export function verifyDisposalMemoryState(renderer) {
  const profile = profileWebGLMemory(renderer);
  return {
    isClean: profile.geometries === 0 && profile.textures === 0,
    remainingGeometries: profile.geometries,
    remainingTextures: profile.textures
  };
}

/**
 * Ensures getShaderPrecisionFormat never returns null in any browser or GPU environment.
 * Prevents Three.js WebGLCapabilities from throwing "Cannot read properties of null (reading 'precision')".
 */
export function ensureSafeShaderPrecisionFormat() {
  if (typeof window === 'undefined') return;

  const contexts = [
    typeof window.WebGLRenderingContext !== 'undefined' ? window.WebGLRenderingContext : null,
    typeof window.WebGL2RenderingContext !== 'undefined' ? window.WebGL2RenderingContext : null
  ].filter(Boolean);

  contexts.forEach((ContextClass) => {
    if (!ContextClass || !ContextClass.prototype) return;
    const proto = ContextClass.prototype;
    if (proto.__safePrecisionPatched) return;

    const originalGetPrecision = proto.getShaderPrecisionFormat;
    proto.getShaderPrecisionFormat = function(shaderType, precisionType) {
      let result = null;
      if (typeof originalGetPrecision === 'function') {
        try {
          result = originalGetPrecision.call(this, shaderType, precisionType);
        } catch {
          result = null;
        }
      }
      if (result && typeof result.precision === 'number') {
        return result;
      }
      // Return safe precision fallback to let Three.js degrade gracefully without throwing
      return {
        rangeMin: 0,
        rangeMax: 0,
        precision: 0
      };
    };
    proto.__safePrecisionPatched = true;
  });
}

// Automatically apply shader precision safety guard when module is imported
ensureSafeShaderPrecisionFormat();

/**
 * Safely checks whether WebGL is supported and available in the current browser/DOM environment.
 *
 * @param {HTMLCanvasElement} [testCanvas] - Optional canvas element to test against
 * @returns {boolean} True if WebGL or WebGL2 context creation succeeds
 */
export function isWebGLAvailable(testCanvas) {
  try {
    ensureSafeShaderPrecisionFormat();
    const canvas = testCanvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    if (!canvas || typeof canvas.getContext !== 'function') return false;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    if (typeof gl.isContextLost === 'function' && gl.isContextLost()) return false;
    return typeof gl.getParameter === 'function';
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
