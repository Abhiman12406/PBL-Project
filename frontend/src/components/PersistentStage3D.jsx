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
  Info,
  Video,
  Navigation,
  Gauge,
  Thermometer,
  BatteryCharging,
  Play,
  Pause,
  FastForward,
  Rotate3d,
  Crosshair,
  Globe,
  ArrowLeftRight
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import CesiumTwinViewport from './CesiumTwinViewport';
import ViewportEngineSelector from './ViewportEngineSelector';
import {
  STAGE_ENGINES,
  ENGINE_METADATA,
  mapFacilityBetweenEngines,
  calculateSynchronizedVehicleState
} from '../utils/engineSynchronization';
import { worldToWgs84Coordinates } from '../utils/coordinateTransforms';
import {
  STAGE_NODES,
  STAGE_FACILITIES,
  CAMERA_VIEWS,
  PUNE_FC_NODE
} from '../constants/stage3DTopology.js';
import {
  CAMERA_MODES,
  CAMERA_MODE_METADATA,
  calculateChaseCameraPosition,
  calculateCockpitCameraPosition,
  calculateDroneCameraPosition,
  dampArray3
} from '../utils/cameraControllers.js';
import {
  buildCorridorSplines,
  createExtrudedHighwayRibbon,
  createTrafficPulses,
  createKasaraElevationTerrain,
  createCorridorLogisticsNodes
} from './3d/proceduralWorld.js';
import { createProceduralTruck } from './3d/proceduralModels.js';

export {
  STAGE_NODES,
  STAGE_FACILITIES,
  CAMERA_VIEWS,
  CAMERA_MODES,
  CAMERA_MODE_METADATA
};

const ICON_MAP = {
  Anchor,
  Warehouse,
  Mountain
};

export default function PersistentStage3D({ onSelectNode }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cesiumContainerRef = useRef(null);
  const {
    activeStageEngine,
    setActiveStageEngine,
    toggleStageEngine,
    pipMinimized,
    setPipMinimized,
    selectedFacilityId,
    setSelectedFacilityId
  } = useWorkspace();

  // Reactive UI State
  const [fps, setFps] = useState(60);
  const [cameraMode, setCameraMode] = useState(CAMERA_MODES.CHASE);
  const [activeCamView, setActiveCamView] = useState('CHASE');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [cameraCoords, setCameraCoords] = useState({ x: 0, y: 15, z: 20 });
  const [hudMinimized, setHudMinimized] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 0 = paused, 1 = 1x, 2 = 2x, 4 = 4x
  const [isPaused, setIsPaused] = useState(false);

  // Synchronized Vehicle WGS84 GPS State
  const [vehicleGps, setVehicleGps] = useState({
    id: 'TRK-MH-01',
    model: 'Volvo FH Electric (Cold-Chain)',
    progress: 0.08,
    speedKmh: 64,
    latitude: 18.9496,
    longitude: 72.9515,
    altitudeM: 5,
    headingDeg: 38
  });

  // Live Vehicle Telematics state
  const [vehicleTelematics, setVehicleTelematics] = useState({
    id: 'TRK-MH-01',
    model: 'Volvo FH Electric (Cold-Chain)',
    speedKmh: 64,
    socPercent: 82,
    cargoTempC: -18.4,
    altitudeM: 120,
    headingDeg: 38,
    corridorLeg: 'NH-160 Northbound'
  });

  // Three.js internal references for 60 FPS animation loop
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraModeRef = useRef(CAMERA_MODES.CHASE);
  const simSpeedRef = useRef(1);
  const isPausedRef = useRef(false);

  // Vehicle trajectory and mesh references
  const truckGroupRef = useRef(null);
  const corridorCurveRef = useRef(null);
  const truckStateRef = useRef({
    progress: 0.08, // Start along JNPT-Bhiwandi corridor
    speed: 0.00065,
    pos: [0, 0, 0],
    look: [0, 0, 0],
    heading: [0, 0, 1]
  });

  // Free-look orbit parameters when in Chase Cam mode
  const freeLookRef = useRef({
    isDragging: false,
    yaw: 0, // Horizontal rotation offset around vehicle
    pitch: 0.15, // Vertical angle offset
    distance: 14.0, // Camera follow distance
    prevX: 0,
    prevY: 0
  });

  // Free Orbit parameters when in Orbit Inspection mode
  const orbitStateRef = useRef({
    isDragging: false,
    dragButton: 0,
    prevX: 0,
    prevY: 0,
    target: new THREE.Vector3(0, 4, -8)
  });

  // Damped camera interpolation vectors
  const dampedCamPosRef = useRef([0, 20, 30]);
  const dampedLookTargetRef = useRef([0, 4, -8]);

  const pulsesRef = useRef([]);
  const ringsRef = useRef([]);
  const animFrameIdRef = useRef(null);

  // Keep refs synchronized with state
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Initialize Three.js 3D Procedural Logistics World
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Cyber-Physical Dark Obsidian Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.0065);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.4, 600);
    camera.position.set(-20, 18, 38);
    camera.lookAt(0, 4, -8);
    cameraRef.current = camera;
    dampedCamPosRef.current = [-20, 18, 38];
    dampedLookTargetRef.current = [0, 4, -8];

    // 3. WebGL Renderer with High-Performance Config
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

    // 4. Lighting Suite: Steady Ambient + Cyber Ground Rims + Sun
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe2e8f0, 2.6);
    sunLight.position.set(50, 75, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -70;
    sunLight.shadow.camera.right = 70;
    sunLight.shadow.camera.top = 70;
    sunLight.shadow.camera.bottom = -70;
    scene.add(sunLight);

    // Neon Cyber Ground Bounce Lights
    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 1.8);
    cyanRim.position.set(-60, -10, -60);
    scene.add(cyanRim);

    const orangeRim = new THREE.DirectionalLight(0xff5400, 1.5);
    orangeRim.position.set(60, -5, 60);
    scene.add(orangeRim);

    // 5. Ground Coordinate Spatial Grid
    const gridHelper = new THREE.GridHelper(300, 60, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.15;
    scene.add(gridHelper);

    // 6. Floating Cyber Dust Motes / Ambient Particles
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 260;
      particlePositions[i + 1] = Math.random() * 55;
      particlePositions[i + 2] = (Math.random() - 0.5) * 260;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.65,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Kasara Ghat 3D Elevation Gradient Mountain Topography
    const kasaraElevationGroup = createKasaraElevationTerrain();
    scene.add(kasaraElevationGroup);

    // 8. Procedural Extruded Highway Ribbons from real WGS84 GPS corridor waypoints
    const { mainCorridorCurve, southernCurve, bypassCurve } = buildCorridorSplines();
    corridorCurveRef.current = mainCorridorCurve;

    // Main Corridor Ribbon (JNPT -> Bhiwandi -> Kasara -> Nashik)
    const mainRoadRibbon = createExtrudedHighwayRibbon(mainCorridorCurve, {
      roadWidth: 1.8,
      roadSegments: 260,
      glowColor: 0x00e5ff,
      shoulderColor: 0xff5400
    });
    scene.add(mainRoadRibbon);

    // Southern Spur Road Ribbon (Bhiwandi -> Pune)
    if (southernCurve) {
      const southRoadRibbon = createExtrudedHighwayRibbon(southernCurve, {
        roadWidth: 1.6,
        roadSegments: 180,
        glowColor: 0x3b82f6,
        shoulderColor: 0x06b6d4
      });
      scene.add(southRoadRibbon);
    }

    // 9. Animated Traffic Flow Light Pulses along highway lanes
    const { group: pulsesGroup, pulses } = createTrafficPulses(mainCorridorCurve, 10);
    scene.add(pulsesGroup);
    pulsesRef.current = pulses;

    // 10. Procedural 3D Logistics Structures at all Key Nodes
    const { group: facilitiesGroup, rings } = createCorridorLogisticsNodes();
    scene.add(facilitiesGroup);
    ringsRef.current = rings;

    // 11. Commercial Freight Vehicle (Truck) Model
    const truckGroup = createProceduralTruck({
      cabColor: 0xff5400,
      trailerColor: 0xf8fafc,
      beaconColor: 0x10b981
    });
    scene.add(truckGroup);
    truckGroupRef.current = truckGroup;

    // 12. 60 FPS Render & Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsAccumulator = 0;
    let telematicsThrottle = 0;

    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // FPS tracking
      frameCount++;
      fpsAccumulator += delta;
      if (fpsAccumulator >= 0.5) {
        setFps(Math.round(frameCount / fpsAccumulator));
        frameCount = 0;
        fpsAccumulator = 0;
      }

      // Rotate ambient cyber particles
      particleSystem.rotation.y += 0.0003;

      // Animate highway traffic flow pulses
      pulsesRef.current.forEach((pulse) => {
        pulse.offset = (pulse.offset + delta * pulse.speed) % 1.0;
        const pt = mainCorridorCurve.getPointAt(pulse.offset);
        pulse.mesh.position.copy(pt);
        pulse.mesh.position.y += 1.2;
      });

      // Animate pulsing facility ground beacon rings
      ringsRef.current.forEach((r) => {
        r.scale += delta * 0.9;
        if (r.scale > 2.8) r.scale = 1;
        r.mesh.scale.set(r.scale, r.scale, r.scale);
        r.mesh.material.opacity = Math.max(0, 1 - (r.scale - 1) / 1.8);
      });

      // Advance Truck along trajectory if not paused
      const effectiveSpeedMult = isPausedRef.current ? 0 : simSpeedRef.current;
      if (effectiveSpeedMult > 0) {
        truckStateRef.current.progress =
          (truckStateRef.current.progress + truckStateRef.current.speed * effectiveSpeedMult) % 1.0;
      }

      const curve = corridorCurveRef.current || mainCorridorCurve;
      const tPos = curve.getPointAt(truckStateRef.current.progress);
      const tNext = curve.getPointAt((truckStateRef.current.progress + 0.006) % 1.0);

      // Compute heading vector
      const headingVec = new THREE.Vector3().subVectors(tNext, tPos).normalize();
      truckStateRef.current.pos = [tPos.x, tPos.y, tPos.z];
      truckStateRef.current.look = [tNext.x, tNext.y, tNext.z];
      truckStateRef.current.heading = [headingVec.x, headingVec.y, headingVec.z];

      // Update Truck Mesh position & orientation
      truckGroup.position.copy(tPos);
      truckGroup.position.y += 0.85;
      truckGroup.lookAt(tNext.x, tPos.y + 0.85, tNext.z);

      // Spin Wheels proportional to speed
      if (effectiveSpeedMult > 0 && truckGroup.wheelMeshes) {
        truckGroup.wheelMeshes.forEach((w) => {
          w.children.forEach((child) => {
            child.rotation.x += delta * effectiveSpeedMult * 26.0;
          });
        });
      }

      // Animate Cold-Chain Telemetry Beacon pulse
      if (truckGroup.beaconGroup) {
        const beaconPulse = 1.0 + Math.sin(time * 0.006) * 0.15;
        truckGroup.beaconGroup.scale.set(beaconPulse, beaconPulse, beaconPulse);
      }

      // Throttled telemetry state update for HUD
      telematicsThrottle += delta;
      if (telematicsThrottle >= 0.25) {
        telematicsThrottle = 0;
        const speedKmh = Math.round(55 + Math.sin(truckStateRef.current.progress * Math.PI * 4) * 14 * (effectiveSpeedMult > 0 ? 1 : 0));
        const headingDeg = Math.round(((Math.atan2(headingVec.x, -headingVec.z) * 180) / Math.PI + 360) % 360);
        const altitudeM = Math.round(15 + (tPos.y / 9.5) * 565);
        let corridorLeg = 'NH-160 / JNPT Expressway';
        if (tPos.y > 6.0) corridorLeg = 'Kasara Ghat Mountain Ascent (+580m)';
        else if (truckStateRef.current.progress > 0.6) corridorLeg = 'Nashik Agro Corridor NH-160';

        setVehicleTelematics((prev) => ({
          ...prev,
          speedKmh: effectiveSpeedMult === 0 ? 0 : speedKmh,
          altitudeM,
          headingDeg,
          corridorLeg
        }));

        // Update synchronized WGS84 GPS coordinate for Cesium Twin & HUD
        const syncVehicle = calculateSynchronizedVehicleState({
          progress: truckStateRef.current.progress,
          worldPos: [tPos.x, tPos.y, tPos.z],
          headingVec: [headingVec.x, headingVec.y, headingVec.z],
          speedKmh: effectiveSpeedMult === 0 ? 0 : speedKmh,
          baseTelematics: {
            id: 'TRK-MH-01',
            model: 'Volvo FH Electric (Cold-Chain)',
            socPercent: 82,
            cargoTempC: -18.4
          }
        });
        setVehicleGps(syncVehicle);
      }

      // Update Camera based on current Active Camera Mode
      const mode = cameraModeRef.current;
      const truckPosArr = [tPos.x, tPos.y + 0.85, tPos.z];
      const truckHeadingArr = [headingVec.x, headingVec.y, headingVec.z];

      if (mode === CAMERA_MODES.CHASE) {
        // 3rd-Person Dynamic Chase Cam
        const chase = calculateChaseCameraPosition({
          truckPos: truckPosArr,
          truckHeading: truckHeadingArr,
          yawOffset: freeLookRef.current.yaw,
          pitchOffset: freeLookRef.current.pitch,
          distance: freeLookRef.current.distance,
          height: 5.2
        });

        // Smooth damping
        dampedCamPosRef.current = dampArray3(dampedCamPosRef.current, chase.position, 8.5, delta);
        dampedLookTargetRef.current = dampArray3(dampedLookTargetRef.current, chase.lookAt, 12.0, delta);

        camera.position.set(...dampedCamPosRef.current);
        camera.lookAt(new THREE.Vector3(...dampedLookTargetRef.current));
      } else if (mode === CAMERA_MODES.COCKPIT) {
        // Driver Cockpit Dashcam POV
        const cockpit = calculateCockpitCameraPosition({
          truckPos: truckPosArr,
          truckHeading: truckHeadingArr,
          eyeHeight: 2.3,
          forwardOffset: 2.6
        });

        dampedCamPosRef.current = dampArray3(dampedCamPosRef.current, cockpit.position, 22.0, delta);
        dampedLookTargetRef.current = dampArray3(dampedLookTargetRef.current, cockpit.lookAt, 22.0, delta);

        camera.position.set(...dampedCamPosRef.current);
        camera.lookAt(new THREE.Vector3(...dampedLookTargetRef.current));
      } else if (mode === CAMERA_MODES.DRONE) {
        // Tactical Drone God-View
        const drone = calculateDroneCameraPosition({
          truckPos: truckPosArr,
          altitude: 54.0,
          pitchBias: 8.0
        });

        dampedCamPosRef.current = dampArray3(dampedCamPosRef.current, drone.position, 6.0, delta);
        dampedLookTargetRef.current = dampArray3(dampedLookTargetRef.current, drone.lookAt, 10.0, delta);

        camera.position.set(...dampedCamPosRef.current);
        camera.lookAt(new THREE.Vector3(...dampedLookTargetRef.current));
      } else if (mode === CAMERA_MODES.FREE_ORBIT) {
        // Free Orbit Mode: Camera position controlled via mouse handlers
        // Look at current orbit target
        camera.lookAt(orbitStateRef.current.target);
      }

      setCameraCoords({
        x: Math.round(camera.position.x),
        y: Math.round(camera.position.y),
        z: Math.round(camera.position.z)
      });

      // Render Scene
      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 13. Window & Container Resize Handler with ResizeObserver
    const updateSize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      ro.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Keyboard shortcut listener for camera perspective & engine switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '1') setCameraMode(CAMERA_MODES.CHASE);
      else if (e.key === '2') setCameraMode(CAMERA_MODES.COCKPIT);
      else if (e.key === '3') setCameraMode(CAMERA_MODES.DRONE);
      else if (e.key === '4') setCameraMode(CAMERA_MODES.FREE_ORBIT);
      else if (e.key === 't' || e.key === 'T') {
        if (setActiveStageEngine) setActiveStageEngine(STAGE_ENGINES.TACTICAL_3D);
      } else if (e.key === 'm' || e.key === 'M') {
        if (setActiveStageEngine) setActiveStageEngine(STAGE_ENGINES.CESIUM_GIS);
      } else if (e.key === 'Tab' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (toggleStageEngine) toggleStageEngine();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        // Reset Chase Free-Look
        freeLookRef.current.yaw = 0;
        freeLookRef.current.pitch = 0.15;
        freeLookRef.current.distance = 14.0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveStageEngine, toggleStageEngine]);

  // Glides camera smoothly to preset target in Free Orbit mode
  const glideCameraTo = useCallback((targetPos, lookAtTarget) => {
    if (!cameraRef.current) return;
    setCameraMode(CAMERA_MODES.FREE_ORBIT);
    const camera = cameraRef.current;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...targetPos);
    orbitStateRef.current.target.set(...lookAtTarget);

    const startTime = performance.now();
    const duration = 1200;

    const animateGlide = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(startPos, endPos, t);
      camera.lookAt(orbitStateRef.current.target);

      if (progress < 1) {
        requestAnimationFrame(animateGlide);
      }
    };

    requestAnimationFrame(animateGlide);
  }, []);

  // Facility selection synchronized from Macro Cesium GIS
  const handleSelectFacilityFromCesium = useCallback((nodeId) => {
    if (!nodeId) return;
    if (setSelectedFacilityId) setSelectedFacilityId(nodeId);
    const mapped = mapFacilityBetweenEngines(nodeId);
    if (mapped.stageNode) {
      setSelectedNode(mapped.stageNode);
      glideCameraTo(
        [mapped.stageNode.pos[0] + 18, mapped.stageNode.pos[1] + 15, mapped.stageNode.pos[2] + 22],
        mapped.stageNode.pos
      );
    }
    if (onSelectNode) onSelectNode(nodeId);
  }, [glideCameraTo, onSelectNode, setSelectedFacilityId]);

  // Select camera view preset
  const handleSelectView = (presetKey) => {
    const preset = CAMERA_VIEWS[presetKey];
    if (!preset) return;
    setActiveCamView(presetKey);
    glideCameraTo(preset.position, preset.target);
    const mapped = mapFacilityBetweenEngines(presetKey);
    if (mapped.cesiumNode && setSelectedFacilityId) {
      setSelectedFacilityId(mapped.cesiumNode.node_id);
    }
  };

  // Mouse Drag Handlers: supports Free-Look in Chase mode, Orbit/Pan in Free Orbit mode
  const handleMouseDown = (e) => {
    if (e.target !== canvasRef.current) return;

    if (cameraMode === CAMERA_MODES.CHASE) {
      freeLookRef.current.isDragging = true;
      freeLookRef.current.prevX = e.clientX;
      freeLookRef.current.prevY = e.clientY;
    } else {
      orbitStateRef.current.isDragging = true;
      orbitStateRef.current.dragButton = e.button;
      orbitStateRef.current.prevX = e.clientX;
      orbitStateRef.current.prevY = e.clientY;
    }
  };

  const handleMouseMove = (e) => {
    if (cameraMode === CAMERA_MODES.CHASE) {
      if (!freeLookRef.current.isDragging) return;
      const dx = e.clientX - freeLookRef.current.prevX;
      const dy = e.clientY - freeLookRef.current.prevY;
      freeLookRef.current.prevX = e.clientX;
      freeLookRef.current.prevY = e.clientY;

      // Mouse horizontal drag adjusts yaw around moving truck
      freeLookRef.current.yaw += dx * 0.008;
      // Mouse vertical drag adjusts pitch
      freeLookRef.current.pitch = Math.max(
        -0.35,
        Math.min(0.65, freeLookRef.current.pitch - dy * 0.006)
      );
    } else if (cameraMode === CAMERA_MODES.FREE_ORBIT) {
      if (!orbitStateRef.current.isDragging || !cameraRef.current) return;
      const dx = e.clientX - orbitStateRef.current.prevX;
      const dy = e.clientY - orbitStateRef.current.prevY;
      orbitStateRef.current.prevX = e.clientX;
      orbitStateRef.current.prevY = e.clientY;

      const camera = cameraRef.current;

      if (orbitStateRef.current.dragButton === 0) {
        // Orbit rotation
        const rotSpeed = 0.005;
        const x = camera.position.x;
        const z = camera.position.z;
        const cos = Math.cos(-dx * rotSpeed);
        const sin = Math.sin(-dx * rotSpeed);

        camera.position.x = x * cos - z * sin;
        camera.position.z = x * sin + z * cos;
        camera.position.y = Math.max(6, Math.min(130, camera.position.y + dy * 0.12));
        camera.lookAt(orbitStateRef.current.target);
      } else if (orbitStateRef.current.dragButton === 2) {
        // Pan
        const panSpeed = 0.08;
        camera.position.x -= dx * panSpeed;
        camera.position.z += dy * panSpeed;
        orbitStateRef.current.target.x -= dx * panSpeed;
        orbitStateRef.current.target.z += dy * panSpeed;
        camera.lookAt(orbitStateRef.current.target);
      }
    }
  };

  const handleMouseUp = () => {
    freeLookRef.current.isDragging = false;
    orbitStateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    if (cameraMode === CAMERA_MODES.CHASE) {
      // Zoom follow distance in chase mode
      freeLookRef.current.distance = Math.max(
        6.0,
        Math.min(32.0, freeLookRef.current.distance + e.deltaY * 0.02)
      );
    } else if (cameraMode === CAMERA_MODES.FREE_ORBIT) {
      if (!cameraRef.current) return;
      const camera = cameraRef.current;
      const zoomFactor = e.deltaY * 0.05;
      const dir = new THREE.Vector3().subVectors(orbitStateRef.current.target, camera.position).normalize();
      const newPos = camera.position.clone().addScaledVector(dir, zoomFactor);

      if (newPos.distanceTo(orbitStateRef.current.target) > 10 && newPos.y > 5 && newPos.y < 160) {
        camera.position.copy(newPos);
      }
    }
  };

  // Raycasting click to inspect 3D logistics node beacons
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
      const foundNode = STAGE_FACILITIES.find((n) => n.id === nodeId);
      if (foundNode) {
        setSelectedNode(foundNode);
        if (setSelectedFacilityId) setSelectedFacilityId(foundNode.id);
        glideCameraTo(
          [foundNode.pos[0] + 18, foundNode.pos[1] + 15, foundNode.pos[2] + 22],
          foundNode.pos
        );
        if (onSelectNode) onSelectNode(nodeId);
      }
    }
  };

  const resetFreeLook = () => {
    freeLookRef.current.yaw = 0;
    freeLookRef.current.pitch = 0.15;
    freeLookRef.current.distance = 14.0;
  };

  const isTacticalPrimary = activeStageEngine === STAGE_ENGINES.TACTICAL_3D;
  const isCesiumPrimary = activeStageEngine === STAGE_ENGINES.CESIUM_GIS;

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-auto z-0 overflow-hidden bg-[#020617] select-none">
      {/* 1. Floating Glassmorphic Viewport Engine Selector (Top Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
        <ViewportEngineSelector
          activeEngine={activeStageEngine}
          onSelectEngine={(engine) => setActiveStageEngine && setActiveStageEngine(engine)}
          isPiPVisible={!pipMinimized}
          onTogglePiP={() => setPipMinimized && setPipMinimized(!pipMinimized)}
        />
      </div>

      {/* 2. Tactical 3D World Container (Full-screen when Primary, PiP when Secondary) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={
          isTacticalPrimary
            ? 'absolute inset-0 w-full h-full z-0 pointer-events-auto'
            : pipMinimized
            ? 'hidden'
            : 'fixed bottom-22 right-6 w-96 h-60 z-30 rounded-2xl overflow-hidden border border-cyan-500/60 shadow-[0_10px_35px_rgba(0,0,0,0.75)] cyber-glass pointer-events-auto transition-all duration-300 group'
        }
      >
        {/* If in PiP mode, show mini top bar */}
        {!isTacticalPrimary && !pipMinimized && (
          <div className="absolute top-0 inset-x-0 h-8 px-3 bg-slate-950/85 border-b border-slate-800/80 flex items-center justify-between z-20 text-slate-200 select-none">
            <div
              onClick={() => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.TACTICAL_3D)}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition"
              title="Click to promote Tactical 3D to Full-Screen Stage"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-wide">Tactical 3D</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold">
                CHASE PiP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.TACTICAL_3D)}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                title="Promote Tactical 3D to Full Screen"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPipMinimized && setPipMinimized(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Minimize PiP Window"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 3D WebGL Canvas */}
        <canvas
          ref={canvasRef}
          onClick={isTacticalPrimary ? handleCanvasClick : () => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.TACTICAL_3D)}
          className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Atmospheric Vignette Overlay (Full-screen only) */}
        {isTacticalPrimary && (
          <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#020617]/20 to-[#020617]/70" />
        )}

        {/* Top-Left Camera Suite Toolbar (only when Tactical is Primary) */}
        {isTacticalPrimary && (
          <div className="absolute top-18 left-6 z-20 flex flex-col gap-2 pointer-events-none">
            {/* Stage Status & FPS Badge */}
            <div className="pointer-events-auto cyber-glass rounded-xl p-2.5 px-3 border border-slate-700/60 text-slate-100 flex items-center gap-3 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-emerald-400">R3F SIMULATOR</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-mono font-semibold text-slate-300">
                {fps} FPS
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {CAMERA_MODE_METADATA[cameraMode]?.badge}
              </span>
              <button
                onClick={() => setHudMinimized(!hudMinimized)}
                className="text-slate-400 hover:text-white p-1 rounded transition ml-1"
                title={hudMinimized ? 'Expand Camera Suite' : 'Minimize Camera Suite'}
              >
                {hudMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!hudMinimized && (
              <div className="pointer-events-auto cyber-glass rounded-xl p-3 border border-slate-700/60 shadow-xl flex flex-col gap-2.5 backdrop-blur-xl max-w-xs">
                {/* Perspective Mode Switcher Buttons */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Camera Suite</span>
                    <span className="text-[9px] font-mono text-slate-500">HOTKEYS [1-4]</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* 1. Chase Cam */}
                    <button
                      onClick={() => setCameraMode(CAMERA_MODES.CHASE)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition text-left ${
                        cameraMode === CAMERA_MODES.CHASE
                          ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div className="leading-tight">
                        <div>Chase Cam</div>
                        <div className="text-[9px] font-mono text-slate-400">[1] 3rd-Person</div>
                      </div>
                    </button>

                    {/* 2. Cockpit Dashcam */}
                    <button
                      onClick={() => setCameraMode(CAMERA_MODES.COCKPIT)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition text-left ${
                        cameraMode === CAMERA_MODES.COCKPIT
                          ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <div className="leading-tight">
                        <div>Cockpit</div>
                        <div className="text-[9px] font-mono text-slate-400">[2] Dashcam</div>
                      </div>
                    </button>

                    {/* 3. Drone God-View */}
                    <button
                      onClick={() => setCameraMode(CAMERA_MODES.DRONE)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition text-left ${
                        cameraMode === CAMERA_MODES.DRONE
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="leading-tight">
                        <div>Drone POV</div>
                        <div className="text-[9px] font-mono text-slate-400">[3] Overhead</div>
                      </div>
                    </button>

                    {/* 4. Free Orbit */}
                    <button
                      onClick={() => setCameraMode(CAMERA_MODES.FREE_ORBIT)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition text-left ${
                        cameraMode === CAMERA_MODES.FREE_ORBIT
                          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Rotate3d className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <div className="leading-tight">
                        <div>Free Orbit</div>
                        <div className="text-[9px] font-mono text-slate-400">[4] Inspect</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* In Chase Mode: Free-look reset button */}
                {cameraMode === CAMERA_MODES.CHASE && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Drag to Orbit View</span>
                    <button
                      onClick={resetFreeLook}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 flex items-center gap-1 transition"
                      title="Re-align camera directly behind moving vehicle [R]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Chase [R]</span>
                    </button>
                  </div>
                )}

                {/* Facility Quick Jump Presets */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Facility Quick Focus</span>
                    <Compass className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.keys(CAMERA_VIEWS).map((key) => {
                      const view = CAMERA_VIEWS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleSelectView(key)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white text-left transition truncate"
                        >
                          {view.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Macro Cesium GIS Container (Full-screen when Primary, PiP when Secondary) */}
      <div
        ref={cesiumContainerRef}
        className={
          isCesiumPrimary
            ? 'absolute inset-0 w-full h-full z-0 pointer-events-auto'
            : pipMinimized
            ? 'hidden'
            : 'fixed bottom-22 right-6 w-96 h-60 z-30 rounded-2xl overflow-hidden border border-blue-500/60 shadow-[0_10px_35px_rgba(0,0,0,0.75)] cyber-glass pointer-events-auto transition-all duration-300 group'
        }
      >
        {/* If in PiP mode, show mini top bar */}
        {!isCesiumPrimary && !pipMinimized && (
          <div className="absolute top-0 inset-x-0 h-8 px-3 bg-slate-950/85 border-b border-slate-800/80 flex items-center justify-between z-20 text-slate-200 select-none">
            <div
              onClick={() => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.CESIUM_GIS)}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition"
              title="Click to promote Macro Cesium GIS to Full-Screen Stage"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-wide">Macro Cesium</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold">
                GIS PiP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.CESIUM_GIS)}
                className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition"
                title="Promote Macro Cesium GIS to Full Screen"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPipMinimized && setPipMinimized(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Minimize PiP Window"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <CesiumTwinViewport
          isPiP={!isCesiumPrimary}
          vehicleGps={vehicleGps}
          selectedNodeId={selectedFacilityId}
          onSelectNode={handleSelectFacilityFromCesium}
          onSwapPiP={() => setActiveStageEngine && setActiveStageEngine(STAGE_ENGINES.CESIUM_GIS)}
        />
      </div>

      {/* 4. Minimized PiP Floating Restore Capsule */}
      {pipMinimized && (
        <div className="fixed bottom-22 right-6 z-30 pointer-events-auto animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => setPipMinimized && setPipMinimized(false)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl cyber-glass border border-slate-700/80 hover:border-cyan-400/60 shadow-xl backdrop-blur-xl text-slate-200 text-xs font-bold transition hover:scale-105 active:scale-95 group"
            title="Restore Picture-in-Picture [PiP] Window"
          >
            <div className="relative flex items-center justify-center">
              {isTacticalPrimary ? (
                <Globe className="w-4 h-4 text-blue-400 group-hover:animate-pulse" />
              ) : (
                <Truck className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
              )}
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span>
              {isTacticalPrimary ? 'Open Cesium GIS PiP' : 'Open Tactical 3D PiP'}
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
          </button>
        </div>
      )}

      {/* 5. Bottom-Left Live Telematics Cockpit HUD (Universal Across Both Engines) */}
      <div className="absolute bottom-22 left-6 z-20 pointer-events-auto cyber-glass rounded-2xl p-3.5 border border-slate-700/80 max-w-sm shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{vehicleTelematics.id}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  ACTIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{vehicleTelematics.corridorLeg}</div>
            </div>
          </div>

          {/* Simulation Speed & Pause Controls */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title={isPaused ? 'Resume Simulation [Space]' : 'Pause Simulation [Space]'}
            >
              {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            </button>
            {[1, 2, 4].map((mult) => (
              <button
                key={mult}
                onClick={() => {
                  setSimSpeed(mult);
                  setIsPaused(false);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  simSpeed === mult && !isPaused
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Gauges Row */}
        <div className="grid grid-cols-4 gap-2 pt-2.5 text-center">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] uppercase font-mono text-slate-400">Velocity</div>
            <div className="text-sm font-extrabold text-cyan-300 font-mono">{vehicleTelematics.speedKmh}</div>
            <div className="text-[8px] text-slate-500 font-mono">km/h</div>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] uppercase font-mono text-slate-400">Cold-Chain</div>
            <div className="text-sm font-extrabold text-emerald-400 font-mono">{vehicleTelematics.cargoTempC}°C</div>
            <div className="text-[8px] text-emerald-500 font-mono">NOMINAL</div>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] uppercase font-mono text-slate-400">Battery SoC</div>
            <div className="text-sm font-extrabold text-white font-mono">{vehicleTelematics.socPercent}%</div>
            <div className="text-[8px] text-slate-500 font-mono">Range 240km</div>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-[9px] uppercase font-mono text-slate-400">Altitude</div>
            <div className="text-sm font-extrabold text-amber-300 font-mono">{vehicleTelematics.altitudeM}m</div>
            <div className="text-[8px] text-slate-500 font-mono">Elevation</div>
          </div>
        </div>
      </div>

      {/* 6. Selected Node Telemetry Badge */}
      {selectedNode && (() => {
        const NodeIcon = ICON_MAP[selectedNode.iconName] || Anchor;
        return (
          <div
            className={`fixed bottom-22 z-20 pointer-events-auto cyber-glass rounded-2xl p-4 border border-slate-700/80 max-w-sm shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right duration-200 ${
              pipMinimized ? 'right-6' : 'right-[410px]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-900 font-extrabold shadow-md shrink-0"
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
              <span className="text-slate-400">COORDINATES 3D</span>
              <span className="text-cyan-400 font-bold">[{selectedNode.pos.join(', ')}]</span>
            </div>
          </div>
        );
      })()}

      {/* 7. Bottom Center Interaction Hint */}
      <div className="absolute bottom-2 left-6 z-10 text-[11px] font-mono text-slate-500 pointer-events-none select-none">
        <span>
          {isTacticalPrimary
            ? 'Tactical 3D Active • [Tab/E]: Swap to Macro Cesium • Drag: Free-Look • 1-4: Switch Camera • Space: Pause'
            : 'Macro Cesium GIS Active • [Tab/E]: Swap to Tactical 3D • Click Nodes: Focus • Highways & Shockwaves Active'}
        </span>
      </div>
    </div>
  );
}
