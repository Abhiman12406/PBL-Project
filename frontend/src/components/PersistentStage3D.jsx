import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  Activity,
  RotateCcw,
  Eye,
  Truck,
  Mountain,
  Anchor,
  Warehouse,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { FACILITY_NODES } from '../constants/logisticsTopology';
import { useWorkspace } from '../context/WorkspaceContext';
import { STAGE_NODES, CAMERA_VIEWS } from '../constants/stage3DTopology.js';

export { STAGE_NODES, CAMERA_VIEWS };

const ICON_MAP = {
  Anchor,
  Warehouse,
  Mountain
};


export default function PersistentStage3D({ onSelectNode }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { activeStageEngine, setActiveStageEngine } = useWorkspace();

  const [fps, setFps] = useState(60);
  const [activeCamView, setActiveCamView] = useState('OVERVIEW');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [cameraCoords, setCameraCoords] = useState({ x: 0, y: 52, z: 65 });
  const [hudMinimized, setHudMinimized] = useState(false);

  // References to Three.js internal objects for animation and raycasting
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsStateRef = useRef({
    isDragging: false,
    dragButton: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    target: new THREE.Vector3(0, 4, -8),
    spherical: { radius: 85, theta: 0.1, phi: Math.PI / 4 }
  });
  const truckDataRef = useRef({ progress: 0, speed: 0.0012 });
  const pulsesRef = useRef([]);
  const ringsRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const truckMeshRef = useRef(null);

  // Initialize Three.js 3D Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Scene with Cyber-Physical Dark Obsidian Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.0075);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 500);
    camera.position.set(0, 52, 65);
    camera.lookAt(0, 4, -8);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting Suite
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe2e8f0, 2.5);
    sunLight.position.set(40, 60, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Neon Cyber Ground Bounce Lights
    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 1.8);
    cyanRim.position.set(-50, -10, -50);
    scene.add(cyanRim);

    const orangeRim = new THREE.DirectionalLight(0xff5400, 1.4);
    orangeRim.position.set(50, -5, 50);
    scene.add(orangeRim);

    // 5. Ground Coordinate Spatial Grid
    const gridHelper = new THREE.GridHelper(260, 52, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // 6. Floating Cyber Dust Motes / Ambient Particles
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 220;
      particlePositions[i + 1] = Math.random() * 45;
      particlePositions[i + 2] = (Math.random() - 0.5) * 220;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.7,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Mountain Pass Topography Mesh (Kasara Ghat Elevation Peak)
    const mountainGeo = new THREE.ConeGeometry(18, 12, 8, 3, true);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.2,
      wireframe: true,
      emissive: 0x1e293b,
      emissiveIntensity: 0.4
    });
    const mountainMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mountainMesh.position.set(14, 5, -24);
    scene.add(mountainMesh);

    // Secondary Ridge
    const ridgeGeo = new THREE.ConeGeometry(14, 9, 6, 2, true);
    const ridgeMesh = new THREE.Mesh(ridgeGeo, mountainMat);
    ridgeMesh.position.set(22, 3.8, -32);
    scene.add(ridgeMesh);

    // 8. Spline Highway Corridor Curve & Ribbon Geometry
    const splinePoints = STAGE_NODES.map((n) => new THREE.Vector3(...n.pos));
    const highwayCurve = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.15);

    // Highway Roadbed Tube / Ribbon
    const tubeGeo = new THREE.TubeGeometry(highwayCurve, 180, 0.9, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.3
    });
    const highwayMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(highwayMesh);

    // Glowing Lane Conduit (Neon Cyan & Safety Orange edges)
    const lineGeo = new THREE.TubeGeometry(highwayCurve, 180, 0.18, 6, false);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: false
    });
    const centerLine = new THREE.Mesh(lineGeo, lineMat);
    centerLine.position.y += 0.85;
    scene.add(centerLine);

    // 9. Highway Flow Light Pulses
    const pulseCount = 7;
    const pulses = [];
    for (let i = 0; i < pulseCount; i++) {
      const pulseGeo = new THREE.SphereGeometry(0.55, 12, 12);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00e5ff : 0xff5400,
        transparent: true,
        opacity: 0.9
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      scene.add(pulseMesh);
      pulses.push({
        mesh: pulseMesh,
        offset: i / pulseCount
      });
    }
    pulsesRef.current = pulses;

    // 10. Holographic Facility Beacons at Each Logistics Node
    const rings = [];
    STAGE_NODES.forEach((node) => {
      // Beacon base pillar
      const pillarGeo = new THREE.CylinderGeometry(1.8, 2.2, 0.4, 16);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.4,
        emissive: new THREE.Color(node.color),
        emissiveIntensity: 0.2
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(node.pos[0], node.pos[1] + 0.2, node.pos[2]);
      pillar.userData = { nodeId: node.id, isFacility: true };
      scene.add(pillar);

      // Vertical Light Beam
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.35, 14, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(node.pos[0], node.pos[1] + 7, node.pos[2]);
      scene.add(beam);

      // Pulsing Ground Ring
      const ringGeo = new THREE.RingGeometry(2.4, 2.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(node.pos[0], node.pos[1] + 0.05, node.pos[2]);
      scene.add(ringMesh);
      rings.push({ mesh: ringMesh, scale: 1 });
    });
    ringsRef.current = rings;

    // 11. Animated 3D Freight Transport Unit (Truck)
    const truckGroup = new THREE.Group();

    // Trailer Box
    const trailerGeo = new THREE.BoxGeometry(2.2, 2.6, 5.2);
    const trailerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.4
    });
    const trailerMesh = new THREE.Mesh(trailerGeo, trailerMat);
    trailerMesh.position.set(0, 1.8, -0.6);
    trailerMesh.castShadow = true;
    truckGroup.add(trailerMesh);

    // Cab
    const cabGeo = new THREE.BoxGeometry(2.1, 2.2, 2.2);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xff5400,
      roughness: 0.2,
      metalness: 0.5
    });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(0, 1.4, 2.7);
    cabMesh.castShadow = true;
    truckGroup.add(cabMesh);

    // Headlight Beams (Forward Light Cones)
    const headlightConeGeo = new THREE.ConeGeometry(1.6, 8, 16, 1, true);
    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const headlightL = new THREE.Mesh(headlightConeGeo, headlightMat);
    headlightL.rotation.x = Math.PI / 2;
    headlightL.position.set(-0.7, 0.9, 7.5);
    truckGroup.add(headlightL);

    const headlightR = headlightL.clone();
    headlightR.position.x = 0.7;
    truckGroup.add(headlightR);

    // Cold-Chain Cargo Beacon (Flashing Green Status Sphere)
    const beaconSphereGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00c853 });
    const beaconSphere = new THREE.Mesh(beaconSphereGeo, beaconMat);
    beaconSphere.position.set(0, 3.4, 0);
    truckGroup.add(beaconSphere);

    scene.add(truckGroup);
    truckMeshRef.current = truckGroup;

    // 12. Animation Loop & Performance Monitor (60 FPS target)
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsAccumulator = 0;

    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // FPS tracking
      frameCount++;
      fpsAccumulator += delta;
      if (fpsAccumulator >= 0.5) {
        setFps(Math.round(frameCount / fpsAccumulator));
        frameCount = 0;
        fpsAccumulator = 0;
      }

      // Rotate particle cloud gently
      particleSystem.rotation.y += 0.0004;

      // Animate highway pulses
      pulsesRef.current.forEach((pulse) => {
        pulse.offset = (pulse.offset + delta * 0.12) % 1.0;
        const pt = highwayCurve.getPointAt(pulse.offset);
        pulse.mesh.position.copy(pt);
        pulse.mesh.position.y += 0.9;
      });

      // Animate pulsing facility rings
      ringsRef.current.forEach((r) => {
        r.scale += delta * 0.8;
        if (r.scale > 2.6) r.scale = 1;
        r.mesh.scale.set(r.scale, r.scale, r.scale);
        r.mesh.material.opacity = Math.max(0, 1 - (r.scale - 1) / 1.6);
      });

      // Animate Truck along trajectory
      truckDataRef.current.progress = (truckDataRef.current.progress + truckDataRef.current.speed) % 1.0;
      const truckPos = highwayCurve.getPointAt(truckDataRef.current.progress);
      const truckLook = highwayCurve.getPointAt((truckDataRef.current.progress + 0.01) % 1.0);

      truckGroup.position.copy(truckPos);
      truckGroup.position.y += 0.8;
      truckGroup.lookAt(truckLook.x, truckPos.y + 0.8, truckLook.z);

      // Render Scene
      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Smooth Camera Gliding to Viewpoint
  const glideCameraTo = useCallback((targetPos, lookAtTarget) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...targetPos);
    const startTime = performance.now();
    const duration = 1200; // ms

    const animateGlide = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // EaseInOutCubic
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(startPos, endPos, t);
      camera.lookAt(new THREE.Vector3(...lookAtTarget));
      setCameraCoords({
        x: Math.round(camera.position.x),
        y: Math.round(camera.position.y),
        z: Math.round(camera.position.z)
      });

      if (progress < 1) {
        requestAnimationFrame(animateGlide);
      }
    };

    requestAnimationFrame(animateGlide);
  }, []);

  // Switch camera view presets
  const handleSelectView = (presetKey) => {
    const preset = CAMERA_VIEWS[presetKey];
    if (!preset) return;
    setActiveCamView(presetKey);
    glideCameraTo(preset.position, preset.target);
  };

  // Mouse drag Orbit Controls
  const handleMouseDown = (e) => {
    // Only drag when interacting with canvas directly, not overlying UI cards
    if (e.target !== canvasRef.current) return;
    controlsStateRef.current.isDragging = true;
    controlsStateRef.current.dragButton = e.button;
    controlsStateRef.current.prevMouseX = e.clientX;
    controlsStateRef.current.prevMouseY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!controlsStateRef.current.isDragging || !cameraRef.current) return;

    const dx = e.clientX - controlsStateRef.current.prevMouseX;
    const dy = e.clientY - controlsStateRef.current.prevMouseY;
    controlsStateRef.current.prevMouseX = e.clientX;
    controlsStateRef.current.prevMouseY = e.clientY;

    const camera = cameraRef.current;

    if (controlsStateRef.current.dragButton === 0) {
      // Orbit rotation around center
      const rotSpeed = 0.005;
      const x = camera.position.x;
      const z = camera.position.z;
      const cos = Math.cos(-dx * rotSpeed);
      const sin = Math.sin(-dx * rotSpeed);

      camera.position.x = x * cos - z * sin;
      camera.position.z = x * sin + z * cos;
      camera.position.y = Math.max(8, Math.min(120, camera.position.y + dy * 0.12));
      camera.lookAt(controlsStateRef.current.target);

      setCameraCoords({
        x: Math.round(camera.position.x),
        y: Math.round(camera.position.y),
        z: Math.round(camera.position.z)
      });
    } else if (controlsStateRef.current.dragButton === 2) {
      // Pan
      const panSpeed = 0.08;
      camera.position.x -= dx * panSpeed;
      camera.position.z += dy * panSpeed;
      controlsStateRef.current.target.x -= dx * panSpeed;
      controlsStateRef.current.target.z += dy * panSpeed;
      camera.lookAt(controlsStateRef.current.target);
    }
  };

  const handleMouseUp = () => {
    controlsStateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const zoomFactor = e.deltaY * 0.05;
    const dir = new THREE.Vector3().subVectors(controlsStateRef.current.target, camera.position).normalize();
    const newPos = camera.position.clone().addScaledVector(dir, zoomFactor);

    if (newPos.distanceTo(controlsStateRef.current.target) > 12 && newPos.y > 6 && newPos.y < 150) {
      camera.position.copy(newPos);
      setCameraCoords({
        x: Math.round(camera.position.x),
        y: Math.round(camera.position.y),
        z: Math.round(camera.position.z)
      });
    }
  };

  // Click on facility beacon node in 3D
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    const hit = intersects.find((i) => i.object.userData && i.object.userData.isFacility);
    if (hit) {
      const nodeId = hit.object.userData.nodeId;
      const foundNode = STAGE_NODES.find((n) => n.id === nodeId);
      if (foundNode) {
        setSelectedNode(foundNode);
        glideCameraTo([foundNode.pos[0] + 16, foundNode.pos[1] + 14, foundNode.pos[2] + 20], foundNode.pos);
        if (onSelectNode) onSelectNode(nodeId);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 w-full h-full pointer-events-auto z-0 overflow-hidden bg-[#020617] select-none"
    >
      {/* Three.js Canvas Element */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* 3D Stage Atmospheric Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#020617]/20 to-[#020617]/70" />

      {/* Top-Left Floating Stage Telemetry & Camera Preset HUD */}
      <div className="absolute top-18 left-6 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto cyber-glass rounded-xl p-3 border border-slate-700/60 text-slate-100 flex items-center gap-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-emerald-400">STAGE 3D</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono font-semibold text-slate-300">
            {fps} FPS
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono text-slate-400">
            [{cameraCoords.x}, {cameraCoords.y}, {cameraCoords.z}]
          </span>
          <button
            onClick={() => setHudMinimized(!hudMinimized)}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            title={hudMinimized ? 'Expand Presets' : 'Minimize Presets'}
          >
            {hudMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!hudMinimized && (
          <div className="pointer-events-auto cyber-glass rounded-xl p-2.5 border border-slate-700/60 shadow-xl flex flex-col gap-1 backdrop-blur-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
              <span>Camera Presets</span>
              <Compass className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(CAMERA_VIEWS).map((key) => {
                const view = CAMERA_VIEWS[key];
                const isActive = activeCamView === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectView(key)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span>{view.name}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Telemetry Badge (Bottom-Left) */}
      {selectedNode && (() => {
        const NodeIcon = ICON_MAP[selectedNode.iconName] || Anchor;
        return (
          <div className="absolute bottom-24 left-6 z-20 pointer-events-auto cyber-glass rounded-2xl p-4 border border-slate-700/80 max-w-sm shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-900 font-extrabold shadow-md"
                  style={{ backgroundColor: selectedNode.color }}
                >
                  <NodeIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-tight">{selectedNode.name}</h4>
                  <span className="text-[11px] font-semibold text-cyan-400 font-mono">{selectedNode.tier}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{selectedNode.details}</p>
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">CORRIDOR WAYPOINT</span>
              <span className="text-emerald-400 font-bold">STATUS NOMINAL</span>
            </div>
          </div>
        );
      })()}

      {/* Bottom Center Hint: Viewport interaction instructions */}
      <div className="absolute bottom-2 left-6 z-10 text-[11px] font-mono text-slate-500 pointer-events-none select-none">
        <span>Left Drag: Orbit • Right Drag: Pan • Wheel: Zoom • Click Beacons: Inspect</span>
      </div>
    </div>
  );
}
