import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Globe,
  Anchor,
  Package,
  Layers,
  Building2,
  Mountain,
  Navigation,
  RefreshCw,
  Eye,
  Maximize2,
  Info,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import {
  FACILITY_NODES,
  CAMERA_PRESETS,
  getStockCapacityStatus
} from '../constants/logisticsTopology';

// Helper to create an SVG icon data URL for billboards
function createPinIconSvg(tierNumber, statusColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${statusColor}" flood-opacity="0.8"/>
      </filter>
    </defs>
    <circle cx="24" cy="20" r="16" fill="#0f172a" stroke="${statusColor}" stroke-width="3" filter="url(#glow)"/>
    <circle cx="24" cy="20" r="12" fill="${statusColor}" fill-opacity="0.25"/>
    <text x="24" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">T${tierNumber}</text>
    <polygon points="20,33 28,33 24,44" fill="${statusColor}"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function CesiumTwinViewport({
  selectedNodeId = 'DC-BHW-01',
  onSelectNode = () => {},
  simulationNodes = null,
  height = '580px',
  className = ''
}) {
  const containerRef = useRef(null);
  const creditContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const entitiesMapRef = useRef(new Map());
  const osmBuildingsTilesetRef = useRef(null);

  const [activePreset, setActivePreset] = useState('CORRIDOR_OVERVIEW');
  const [showBuildings, setShowBuildings] = useState(true);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Check Ion token
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    if (ionToken && ionToken.trim() !== '') {
      Cesium.Ion.defaultAccessToken = ionToken.trim();
      setTokenMissing(false);
    } else {
      console.warn('VITE_CESIUM_ION_TOKEN is not configured. Falling back to default Cesium basemap.');
      setTokenMissing(true);
    }

    let viewer;
    try {
      viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        creditContainer: creditContainerRef.current || undefined,
        shouldAnimate: true
      });

      viewerRef.current = viewer;

      // Visual and atmosphere tuning
      const scene = viewer.scene;
      scene.globe.depthTestAgainstTerrain = true;
      scene.skyAtmosphere.show = true;
      scene.globe.enableLighting = false; // Steady day lighting for operational clarity

      // Attempt to load Cesium World Terrain asynchronously
      if (ionToken) {
        Cesium.Terrain.fromWorldTerrain({
          requestVertexNormals: true,
          requestWaterMask: true
        })
          .then((terrainProvider) => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              viewerRef.current.terrainProvider = terrainProvider;
            }
          })
          .catch((err) => {
            console.warn('Cesium World Terrain fallback triggered:', err);
          });

        // Attempt to load Cesium OSM 3D Buildings
        Cesium.createOsmBuildingsAsync()
          .then((buildingTileset) => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              osmBuildingsTilesetRef.current = buildingTileset;
              viewerRef.current.scene.primitives.add(buildingTileset);
            }
          })
          .catch((err) => {
            console.warn('Cesium 3D Buildings fallback triggered:', err);
          });
      }

      // Initial camera positioning: Western India corridor overview
      const overview = CAMERA_PRESETS.CORRIDOR_OVERVIEW;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          overview.longitude,
          overview.latitude,
          overview.height
        ),
        orientation: {
          heading: Cesium.Math.toRadians(overview.heading),
          pitch: Cesium.Math.toRadians(overview.pitch),
          roll: Cesium.Math.toRadians(overview.roll)
        },
        duration: 1.2
      });

      // Interactive Picking & Hover Cursor Handler
      const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

      // Left Click: Node selection & camera fly-to
      handler.setInputAction((click) => {
        const picked = scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id && picked.id._nodeId) {
          const clickedNodeId = picked.id._nodeId;
          onSelectNode(clickedNodeId);
          flyToNode(clickedNodeId);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Mouse Move: Pointer styling & hover tooltip
      handler.setInputAction((movement) => {
        const picked = scene.pick(movement.endPosition);
        if (Cesium.defined(picked) && picked.id && picked.id._nodeId) {
          containerRef.current.style.cursor = 'pointer';
          const node = FACILITY_NODES.find((n) => n.node_id === picked.id._nodeId);
          if (node) setHoveredNode(node);
        } else {
          containerRef.current.style.cursor = 'default';
          setHoveredNode(null);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      setIsViewerReady(true);
    } catch (err) {
      console.error('Failed to initialize Cesium Viewer:', err);
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      setIsViewerReady(false);
    };
  }, [ionToken]);

  // Synchronize 3D Facility Entities (Beacons, Rings, Billboards)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !isViewerReady) return;

    // Clear existing facility entities
    entitiesMapRef.current.forEach((entityList) => {
      entityList.forEach((e) => viewer.entities.remove(e));
    });
    entitiesMapRef.current.clear();

    // Map simulation stock levels if available
    const liveStockMap = new Map();
    if (simulationNodes && Array.isArray(simulationNodes)) {
      simulationNodes.forEach((sn) => {
        const stock = sn.mitigated?.stock ?? sn.stock ?? sn.initial_stock;
        liveStockMap.set(sn.node_id, stock);
      });
    }

    FACILITY_NODES.forEach((node) => {
      const currentStock = liveStockMap.get(node.node_id) ?? node.nominal_stock;
      const { fillPct, hexColor, cesiumColor } = getStockCapacityStatus(
        currentStock,
        node.capacity_units
      );
      const isSelected = selectedNodeId === node.node_id;

      const entityColor = new Cesium.Color(
        cesiumColor.red,
        cesiumColor.green,
        cesiumColor.blue,
        cesiumColor.alpha
      );

      const beaconHeight = 1600; // 1.6km tall vertical beacon
      const baseRadius = 450;
      const ringRadius = baseRadius + (fillPct / 100) * 550; // Dynamic diameter reflecting fill %

      const entitiesForNode = [];

      // 1. Dynamic Holographic 3D Stock Capacity Ring (Extruded Cylindrical Disc/Ring)
      const stockRing = viewer.entities.add({
        name: `${node.name} Stock Ring`,
        position: Cesium.Cartesian3.fromDegrees(node.longitude, node.latitude, 10),
        ellipse: {
          semiMajorAxis: ringRadius,
          semiMinorAxis: ringRadius,
          material: new Cesium.ColorMaterialProperty(entityColor.withAlpha(0.28)),
          outline: true,
          outlineColor: entityColor.withAlpha(0.95),
          outlineWidth: 3,
          height: 10,
          extrudedHeight: 45 // 3D volume
        }
      });
      stockRing._nodeId = node.node_id;
      entitiesForNode.push(stockRing);

      // 2. Inner Concentric Ring
      const innerRing = viewer.entities.add({
        name: `${node.name} Inner Core Ring`,
        position: Cesium.Cartesian3.fromDegrees(node.longitude, node.latitude, 15),
        ellipse: {
          semiMajorAxis: ringRadius * 0.42,
          semiMinorAxis: ringRadius * 0.42,
          material: new Cesium.ColorMaterialProperty(entityColor.withAlpha(0.4)),
          outline: true,
          outlineColor: entityColor,
          outlineWidth: 2,
          height: 15,
          extrudedHeight: 25
        }
      });
      innerRing._nodeId = node.node_id;
      entitiesForNode.push(innerRing);

      // 3. Volumetric Vertical Light Beacon Cylinder
      const lightBeacon = viewer.entities.add({
        name: `${node.name} Light Beacon`,
        position: Cesium.Cartesian3.fromDegrees(
          node.longitude,
          node.latitude,
          beaconHeight / 2
        ),
        cylinder: {
          length: beaconHeight,
          topRadius: 32.0,
          bottomRadius: 75.0,
          material: new Cesium.ColorMaterialProperty(entityColor.withAlpha(0.42)),
          outline: true,
          outlineColor: entityColor.withAlpha(0.85),
          outlineWidth: 1.5
        }
      });
      lightBeacon._nodeId = node.node_id;
      entitiesForNode.push(lightBeacon);

      // 4. Central Glowing Core Polyline
      const coreRay = viewer.entities.add({
        name: `${node.name} Core Ray`,
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(node.longitude, node.latitude, 0),
            Cesium.Cartesian3.fromDegrees(node.longitude, node.latitude, beaconHeight + 200)
          ],
          width: 3.5,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35,
            taperPower: 0.1,
            color: entityColor
          })
        }
      });
      coreRay._nodeId = node.node_id;
      entitiesForNode.push(coreRay);

      // 5. Billboard Pin Badge and Label HUD
      const billboardPos = Cesium.Cartesian3.fromDegrees(
        node.longitude,
        node.latitude,
        beaconHeight + 350
      );

      const billboardSvg = createPinIconSvg(node.echelon_tier, hexColor);

      const billboardEntity = viewer.entities.add({
        name: `${node.name} Billboard`,
        position: billboardPos,
        billboard: {
          image: billboardSvg,
          width: 42,
          height: 42,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `${node.shortName}\n${currentStock.toLocaleString()} u (${fillPct}%)`,
          font: '900 12px "Plus Jakarta Sans", sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#020617'),
          outlineWidth: 4,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, -48),
          backgroundColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.82),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      billboardEntity._nodeId = node.node_id;
      entitiesForNode.push(billboardEntity);

      // 6. Selected Facility Halo Highlighter
      if (isSelected) {
        const selectionHalo = viewer.entities.add({
          name: `${node.name} Selected Halo`,
          position: Cesium.Cartesian3.fromDegrees(node.longitude, node.latitude, 20),
          ellipse: {
            semiMajorAxis: ringRadius * 1.35,
            semiMinorAxis: ringRadius * 1.35,
            material: new Cesium.ColorMaterialProperty(
              Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.3)
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#38bdf8'),
            outlineWidth: 3,
            height: 20,
            extrudedHeight: 30
          }
        });
        selectionHalo._nodeId = node.node_id;
        entitiesForNode.push(selectionHalo);
      }

      entitiesMapRef.current.set(node.node_id, entitiesForNode);
    });
  }, [isViewerReady, selectedNodeId, simulationNodes]);

  // Smooth cinematic glide to a facility hub
  const flyToNode = useCallback((nodeId) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const node = FACILITY_NODES.find((n) => n.node_id === nodeId);
    if (!node || !node.cameraPreset) return;

    setActivePreset(nodeId);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        node.cameraPreset.longitude,
        node.cameraPreset.latitude,
        node.cameraPreset.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(node.cameraPreset.heading),
        pitch: Cesium.Math.toRadians(node.cameraPreset.pitch),
        roll: Cesium.Math.toRadians(node.cameraPreset.roll)
      },
      duration: 2.0
    });
  }, []);

  // Smooth cinematic glide to a named camera preset
  const flyToPreset = useCallback((presetKey) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    setActivePreset(presetKey);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        preset.longitude,
        preset.latitude,
        preset.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(preset.heading),
        pitch: Cesium.Math.toRadians(preset.pitch),
        roll: Cesium.Math.toRadians(preset.roll)
      },
      duration: 2.0
    });
  }, []);

  // Toggle 3D OSM Buildings
  const handleToggleBuildings = () => {
    if (osmBuildingsTilesetRef.current) {
      osmBuildingsTilesetRef.current.show = !showBuildings;
      setShowBuildings(!showBuildings);
    }
  };

  // Node icon helper
  const getNodeIcon = (nodeType) => {
    switch (nodeType) {
      case 'port':
        return <Anchor className="w-3.5 h-3.5 text-blue-400" />;
      case 'central_dc':
        return <Package className="w-3.5 h-3.5 text-orange-400" />;
      case 'regional_hub':
        return <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'regional_depot':
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case 'fulfillment_center':
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-950 shadow-2xl ${className}`}
      style={{ height }}
    >
      {/* Central Cesium Canvas Mount */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Hidden container for default Cesium credit link */}
      <div ref={creditContainerRef} className="hidden" />

      {/* Top Floating Quick-Navigation Camera Ribbon */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Corridor Header & Cyber Tag */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-wide text-slate-100 uppercase">
            Western India 3D Cyber-Twin
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold border border-blue-500/30">
            WGS84 Real-World
          </span>
        </div>

        {/* Center/Right: 1-Click Smooth Glide Navigation Ribbon */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-xl">
          {/* Corridor Overview */}
          <button
            type="button"
            onClick={() => flyToPreset('CORRIDOR_OVERVIEW')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activePreset === 'CORRIDOR_OVERVIEW'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Angled bird-eye view of Western Maharashtra corridor"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Corridor</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

          {/* 5 Facility Hub Presets */}
          {FACILITY_NODES.map((node) => {
            const isSelected = selectedNodeId === node.node_id;
            return (
              <button
                key={node.node_id}
                type="button"
                onClick={() => {
                  onSelectNode(node.node_id);
                  flyToNode(node.node_id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#ff5400] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`${node.tier_label} • ${node.city}`}
              >
                {getNodeIcon(node.node_type)}
                <span>{node.shortName}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

          {/* Mountain Pass Preset: Kasara Ghat */}
          <button
            type="button"
            onClick={() => flyToPreset('KASARA_GHAT')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activePreset === 'KASARA_GHAT'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800'
            }`}
            title="Steep mountain pass on NH-160 subject to monsoon landslides"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Kasara Ghat</span>
          </button>
        </div>
      </div>

      {/* Bottom-Left: Holographic Stock Ring Legend & Node Status HUD */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-auto flex flex-col gap-2 max-w-sm">
        <div className="p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400 tracking-wider">
            <span>Capacity Stock Rings</span>
            <span className="text-[10px] text-slate-500 font-mono">Fill %</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              <span>&ge;60% Safe</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/60 border border-amber-600/40 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              <span>30-59% Warn</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-950/60 border border-rose-600/40 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#ef4444]" />
              <span>&lt;30% Risk</span>
            </div>
          </div>

          {hoveredNode && (
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <div className="font-extrabold text-white flex items-center gap-1.5">
                {getNodeIcon(hoveredNode.node_type)}
                <span>{hoveredNode.name}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {hoveredNode.city}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-Right: Viewport Controls */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl text-white">
        {/* Toggle 3D Buildings */}
        <button
          type="button"
          onClick={handleToggleBuildings}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            showBuildings
              ? 'bg-blue-600/80 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Photorealistic 3D OSM Buildings"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>3D Mesh</span>
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={() => flyToPreset('CORRIDOR_OVERVIEW')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Reset Camera to Corridor Overview"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Fallback Setup Guide Modal (Displayed if Ion token is not present) */}
      {tokenMissing && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Cesium Ion Token Unconfigured</h4>
                <p className="text-xs text-amber-300/80 font-medium">World Terrain & 3D Buildings require authentication</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To render high-resolution photorealistic 3D terrain and building meshes for the Western India corridor, configure your Cesium Ion access token:
            </p>

            <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 break-all select-all">
              VITE_CESIUM_ION_TOKEN=your_cesium_ion_token_here
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://cesium.com/ion/tokens"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                <span>Get Free Cesium Token</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setTokenMissing(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-lg hover:bg-amber-400 transition cursor-pointer"
              >
                Continue Base View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
