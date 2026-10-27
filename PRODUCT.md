# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Supply Chain Director**: Needs end-to-end multi-echelon network inventory visibility, predictive demand distribution, and discrete-event risk simulation to mitigate global shocks.
2. **Fleet & Logistics Dispatcher**: Monitors active shipments in real-time, oversees DRL-driven dynamic routing, handles roadblock/congestion detours, and tracks vehicle telematics.
3. **Customs & Compliance Officer**: Reviews international shipping documents (Bills of Lading, Commercial Invoices), ensures HS code classification accuracy, and audits discrepancies via LLM/RAG pipelines.
4. **Enterprise IT Administrator**: Oversees API gateway connectivity (ERP, WMS, TMS), monitors system telemetry, and manages model retraining lifecycles.

## Product Purpose

NeoLogix is a cognitive, software-driven smart logistics orchestration platform that bridges digital twin simulation, deep reinforcement learning route optimization, predictive neural demand forecasting, and generative trade compliance into a unified operational command center. Success means zero-lag operational visibility, up to 50% lower demand forecast errors, 25-35% transportation cost reduction, and automated customs trade compliance without requiring new physical hardware deployments.

## Positioning

Unlike traditional static ERP/TMS dashboards or isolated 2D supply chain trackers, NeoLogix combines an in-browser persistent 60 FPS 3D corridor digital twin (Three.js and Cesium WGS84 dual-engine) with live reinforcement learning telemetry and agentic multi-persona workflows directly connected to enterprise data feeds.

## Operating Context

- Real-time logistics operations rooms and control towers operating under 24/7 mission-critical conditions.
- High-density multi-display environments where situational awareness must be immediate and actionable.
- Heavy dual-engine 3D graphics (Three.js WebGL / CesiumJS) running concurrently with floating glassmorphic operational panels and live telemetry streaming via WebSockets.

## Capabilities and Constraints

- **Persistent 3D & Geospatial Stage**: 60 FPS WebGL Three.js corridor stage with extruded highways, elevation gradients (Kasara Ghat), real-time lighting, and camera perspectives (Chase, Cockpit POV, Drone God-View, Free Orbit), with synchronized Cesium WGS84 geospatial engine.
- **Role-Adaptive RBAC**: Dynamically toggles available services and controls depending on active persona (Director, Dispatcher, Compliance, Admin).
- **Domain Modules**:
  - `twin`: 3D / Geospatial stage, model loaders, camera controllers, day/night lighting simulation.
  - `forecasting`: LSTM/GRU/XGBoost demand probability distributions, safety stock levels, and replenishment triggers.
  - `routing`: DRL dynamic route optimizer, active corridor waypoints, roadblock simulation, and detour recalculation.
  - `compliance`: Automated IDP document extraction, HS code classification, and discrepancy auditing.
  - `telemetry`: Live cockpit HUD, vehicle speed/throttle/braking, hazard radar, and WebSocket feeds.
  - `admin`: Model retrain console, API gateway health, and system diagnostics.
- **Constraints**:
  - Must strictly preserve compatibility with existing 168 unit/integration tests (`tests/*.test.js`).
  - Modular organization must follow clean Feature/Domain boundaries (`src/modules/*` alongside shared `src/core/` and `src/ui/`).
  - No degradation of 60 FPS render performance on persistent 3D canvas.

## Brand Commitments

- **Name**: NeoLogix Cognitive Smart Logistics Platform.
- **Tone**: Mission-critical cyber-physical precision, dark obsidian foundation, tactile glassmorphism, functional luminescence.
- **Visual Discipline**: High information density, luminous status indicators, clean legible telemetry typography, and instant spatial hierarchy.

## Evidence on Hand

- Complete Product Requirement Document: [product_requirement_document_smart_logistics_platform.md](file:///C:/Users/Asus/Desktop/PBL/product_requirement_document_smart_logistics_platform.md)
- 3D Digital Twin Specification: [3D_DIGITAL_TWIN.md](file:///C:/Users/Asus/Desktop/PBL/3D_DIGITAL_TWIN.md)
- Western India Corridor Logistics Topology: [logisticsTopology.js](file:///C:/Users/Asus/Desktop/PBL/frontend/src/constants/logisticsTopology.js)
- 168 Passing Tests covering RBAC, dual-engine sync, camera modes, telematics, and glass panels in `frontend/tests/`.

## Product Principles

1. **Spatial Truth Precedes Abstraction**: Operational telemetry is rooted in real-world geospatial and 3D physical coordinates before being abstracted into charts.
2. **Zero Modal Blindness**: Floating draggable and dockable service panels let operators query deep analytical data without breaking situational awareness of the live fleet and corridor.
3. **Role-Calibrated Density**: Information is filtered and elevated to match the exact mental model and urgency of the active operator persona.
4. **Resilient Dual-Engine Modularity**: High-performance Three.js procedural rendering and Cesium geospatial precision operate as loosely coupled, independently maintainable modules.
