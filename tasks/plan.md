# Implementation Plan: NeoLogix Unified Command Cockpit Redesign

## Overview

Transition the NeoLogix smart logistics frontend from an unorganized, overlapping floating-window manager into a permanently anchored, high-density **Unified Command Cockpit**. The new layout establishes a clear 3-tier operational control center:
1. **Top Status Ribbon (`CyberStatusBar`)**: Synchronized corridor itinerary, clock (UTC/IST), WebSocket heartbeat, and RBAC persona selector.
2. **Central Spatial Arena (`PersistentStage3D`)**: 60 FPS WebGL 3D/Cesium digital twin canvas, permanently unobstructed by stray floating windows.
3. **Flanking Docked Rails**:
   - **Left Situational Rail**: Anchored overview of network KPIs, active fleet health, and Autonomous AI Sentinel alerts.
   - **Right Analytical Inspector Rail**: Docked, tabbed inspector for deep dives into DRL dynamic routing, LSTM forecasting, and IDP trade compliance with single-click expand/collapse.
   - **Bottom Telematics & Camera Bar**: Docked camera perspective controls (Chase, Cockpit, Drone, Free Orbit), day/night lighting toggle, and live telematics strip.

---

## Architecture Decisions

1. **Retire Uncontrolled Floating Windows as Default**: 
   - *Rationale*: Free-floating draggable windows create cognitive overload, random overlaps, and alignment breakage on standard monitors.
   - *Implementation*: Replace `DockedWorkspaceView` and floating window sprawl with `UnifiedCockpitLayout` as the default workspace view. Keep the underlying geometry utility functions intact so that all 168 tests remain green.
2. **Anchored Multi-Rail Grid System**:
   - *Left Rail (`w-[360px]`, collapsible to compact rail)*: Houses Situational Awareness (Fleet KPIs & Autonomous Sentinel).
   - *Right Rail (`w-[480px]`, expandable to `w-[700px]`, collapsible)*: Houses Deep Analytical Inspection (Routing, Forecasting, Compliance, System).
   - *Center Stage*: Open view directly into the continuous 3D digital twin.
3. **High-Contrast Dark Obsidian Craft Floor**:
   - *Palette*: Obsidian base (`#020617`), solid/semi-solid panel background (`#0b0f19` / `rgba(11, 15, 25, 0.94)`), razor-sharp 1px micro-borders (`border-slate-800` / `border-slate-700/60`).
   - *Typography*: High-contrast sans headers paired with `JetBrains Mono` tabular numbers to eliminate numerical layout jitter during 60 FPS streaming.
4. **Preserve Existing RBAC Matrix & WebSocket Bindings**:
   - The new rails connect directly to `PersonaContext` and `WorkspaceContext`, ensuring that role clearance locks and live vehicle telemetry feeds work seamlessly.

---

## Task List

### Phase 1: Primitives & Token Polish (Foundations)
- [x] **Task 1: Polish Industrial Primitives & CSS Design Tokens**
  - **Description:** Refine `GlassCard.jsx`, `StatusBadge.jsx`, and `TabularMetric.jsx` with crisp 1px borders, high-contrast dark backgrounds, and consistent padding tokens.
  - **Files:** `frontend/src/ui/primitives/GlassCard.jsx`, `frontend/src/ui/primitives/StatusBadge.jsx`, `frontend/src/ui/primitives/TabularMetric.jsx`
  - **Scope:** Small (3 files)

### Checkpoint: Foundation
- [x] Run `npm test --prefix frontend` (all 168 tests pass)
- [x] Primitives export cleanly and meet WCAG AA contrast

### Phase 2: Docked Cockpit Rails
- [x] **Task 2: Build Left Situational Awareness Rail (`LeftSituationalRail.jsx`)**
  - **Description:** Implement the anchored left rail displaying macro fleet health, operational KPIs, and Autonomous AI Sentinel alerts with accordion/tab toggling and collapse support.
  - **Files:** `frontend/src/ui/layout/LeftSituationalRail.jsx`
  - **Scope:** Small (1 file)

- [x] **Task 3: Build Right Analytical Inspector Rail (`RightInspectorRail.jsx`)**
  - **Description:** Implement the anchored right rail container that embeds DRL Dynamic Routing, LSTM Forecasting, Trade Compliance, and Admin Retraining with role-clearance feedback and expand/collapse controls.
  - **Files:** `frontend/src/ui/layout/RightInspectorRail.jsx`
  - **Scope:** Medium (1-2 files)

- [x] **Task 4: Build Bottom Telematics & Camera Control Bar (`BottomTelemetryBar.jsx`)**
  - **Description:** Create the bottom docked bar for 3D camera modes (Chase, Cockpit POV, Drone, Orbit), day/night lighting toggle, simulation speed, and vehicle telemetry stats.
  - **Files:** `frontend/src/ui/layout/BottomTelemetryBar.jsx`
  - **Scope:** Small (1 file)

### Checkpoint: Cockpit Components
- [x] Run `npm test --prefix frontend` (all 176 tests pass)
- [x] Verify Left Rail, Right Rail, and Bottom Bar render without errors

### Phase 3: Cockpit Integration & Layout Shell
- [x] **Task 5: Implement `UnifiedCockpitLayout.jsx` & Wire into `WindowManager.jsx`**
  - **Description:** Assemble the Left Rail, Center 3D viewport, Right Rail, and Bottom Telematics Bar into a unified responsive cockpit grid. Update `WindowManager.jsx` and `WorkspaceContext.jsx` to make Unified Cockpit the default.
  - **Files:** `frontend/src/ui/layout/UnifiedCockpitLayout.jsx`, `frontend/src/ui/layout/WindowManager.jsx`, `frontend/src/ui/layout/index.js`, `frontend/src/context/WorkspaceContext.jsx`
  - **Scope:** Medium (4 files)

- [x] **Task 6: Refine Top `CyberStatusBar.jsx` Alignment & Spacing**
  - **Description:** Tighten the top status ribbon's responsive layout, alignment of corridor stops, clock tickers, and persona switcher for flawless visual flow with the new rails.
  - **Files:** `frontend/src/ui/layout/CyberStatusBar.jsx`
  - **Scope:** Small (1 file)

### Checkpoint: Integration & Verification
- [x] Run full test suite: `npm test --prefix frontend` (all 186/186 passing)
- [x] Run production build: `npm run build --prefix frontend` (clean build in ~3.4s)
- [x] Run linter: `npm run lint --prefix frontend` (0 errors)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test suite expects specific CSS tokens in `FROSTED_GLASS_CONTAINER_CLASSES` | High | Preserve all required classes (`cyber-glass`, `backdrop-blur-md`, `bg-slate-950/75`, `border-slate-700/50`) in `workspaceBindingControllers.js` and component definitions. |
| Overcrowding on smaller desktop screens (e.g. 1280x800) | Medium | Implement automatic rail collapsing and quick expand/collapse buttons on both rails so the 3D canvas is never squeezed below 450px width. |
| High CPU/GPU usage when rendering complex charts alongside 3D canvas | Low | Maintain existing `memo` and lightweight rendering patterns in analytical tabs; keep 60 FPS WebGL loop untouched. |

---

## Open Questions

- *Resolved:* Layout confirmed as single-screen unified cockpit with anchored side rails, obsidian dark palette, sharp micro-borders, and full preservation of domain modules and existing tests.
