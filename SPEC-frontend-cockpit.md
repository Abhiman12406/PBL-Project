# Spec: NeoLogix Unified Command Cockpit & Frontend Layout Redesign

## Assumptions
1. **Desktop-First Command Center Focus**: The platform is primarily operated on desktop workstations (1080p, 1440p, 4K) in logistics control rooms, with responsive flexibility down to standard laptop screens (1280px minimum width for dual-rail cockpit).
2. **Preserve Existing Backend & Business Module Contracts**: All analytical tabs (`ForecastingTab`, `RoutingTab`, `ComplianceTab`, `KpisContent`, `AutonomousSentinelHUD`, `AdminRetrainContent`) remain fully functional with their existing hooks, props, and WebSocket feeds.
3. **Keep Underlying Test Invariants Intact**: All 168 existing tests in `frontend/tests/`—including those asserting `FROSTED_GLASS_CONTAINER_CLASSES`, `DOCK_SERVICES`, and geometry clamps—must pass without modification.
4. **Unified Cockpit as Primary Workspace**: The default experience will be an anchored, multi-rail command cockpit layout that eliminates accidental floating window overlap, while cleanly handling panel docking, collapsing, and tab selection.

---

## Objective

Modernize and restructure the NeoLogix frontend interface from an unorganized, overlapping floating-window manager into an anchored, high-density **Unified Command Cockpit**. 

In the existing design, draggable glass windows open on top of each other, obscuring critical 3D corridor telematics and creating visual alignment friction. The new design locks the interface into a structured 3-tier aerospace/logistics control center:
1. **Top Telematics Ribbon (`CyberStatusBar`)**: Synchronized corridor itinerary, live clock (UTC/IST), WebSocket connection heartbeat, and RBAC persona switcher.
2. **Central Spatial Arena (`PersistentStage3D`)**: Dedicated 60 FPS Three.js/Cesium digital twin stage anchored cleanly with zero uncontrolled window clutter.
3. **Flanking Docked Operational Rails**:
   - **Left Rail (Situational Awareness)**: Persistent overview containing network KPIs, active fleet health, and Autonomous AI Sentinel alerts.
   - **Right Rail (Deep Analytical Inspector)**: Docked, tabbed inspector for deep dives (DRL Dynamic Routing & detours, LSTM Demand Forecasting, or Automated Trade Compliance) that can be expanded or collapsed with single-click precision.
   - **Bottom Telematics Strip / Quick Bar**: Crisp camera perspective switcher (Chase, Cockpit POV, Drone God-View, Free Orbit) and simulation controls.

---

## Tech Stack

- **UI Framework**: React 19 (`react` ^19.2.8, `react-dom` ^19.2.8)
- **Styling**: Tailwind CSS v4 (`tailwindcss` ^4.3.3 with `@tailwindcss/vite`)
- **Icons**: Lucide React (`lucide-react` ^1.51.0)
- **3D & Spatial Engines**: Three.js (`three` ^0.186.1) and CesiumJS (`cesium` ^1.146.0)
- **Charts & Data Viz**: Chart.js (`chart.js` ^4.5.1, `react-chartjs-2` ^5.3.1)
- **Build Tool**: Vite 8 (`vite` ^8.3.0)
- **Test Runner**: Node.js Native Test Runner (`node --test tests/*.test.js`)
- **Linter**: Oxlint (`oxlint` ^1.81.0)

---

## Commands

```bash
# Development server (runs Vite on port 5173)
npm run dev --prefix frontend

# Execute full unit and integration test suite (168 tests)
npm test --prefix frontend

# Lint codebase for syntax & import errors
npm run lint --prefix frontend

# Production build bundle verification
npm run build --prefix frontend
```

---

## Project Structure

```
frontend/
├── src/
│   ├── ui/
│   │   ├── layout/
│   │   │   ├── UnifiedCockpitLayout.jsx      # [NEW] Master anchored cockpit grid container
│   │   │   ├── LeftSituationalRail.jsx       # [NEW] Anchored Left Rail (KPIs + Sentinel)
│   │   │   ├── RightInspectorRail.jsx        # [NEW] Anchored Right Rail (Routing, Forecasting, Compliance)
│   │   │   ├── BottomTelemetryBar.jsx        # [NEW] Bottom docked camera & simulation strip
│   │   │   ├── CyberStatusBar.jsx            # [REFINED] Crisp high-contrast top corridor bar
│   │   │   ├── WindowManager.jsx             # [REFINED] Routes to UnifiedCockpitLayout by default
│   │   │   ├── GlassDock.jsx                 # [REFINED] Docked quick-action selector
│   │   │   └── GlassPanel.jsx                # [REFINED] Polished panel container with sharp 1px borders
│   │   └── primitives/
│   │       ├── GlassCard.jsx                 # [REFINED] Industrial obsidian container primitive
│   │       ├── StatusBadge.jsx               # [REFINED] High-contrast operational status tags
│   │       └── TabularMetric.jsx             # [REFINED] JetBrains Mono aligned metric display
│   ├── modules/                              # Domain business modules (kept functionally intact)
│   │   ├── analytics/
│   │   ├── forecasting/
│   │   ├── routing/
│   │   ├── compliance/
│   │   └── twin/
│   ├── context/
│   │   ├── PersonaContext.jsx                # RBAC state & persona profiles
│   │   └── WorkspaceContext.jsx              # Active tabs, rail collapse states, mode selection
│   ├── constants/
│   │   ├── dockConfig.js                     # Dock services, geometry standards, and RBAC matrix
│   │   └── stage3DTopology.js                # Corridor nodes, camera presets, WGS84 coordinates
│   └── App.jsx                               # Root application orchestrator
└── tests/                                    # 168 passing unit & integration test suites
```

---

## Code Style & Visual Architecture

### Design Tokens & Aesthetics
- **Canvas Base**: `#020617` (Deep Obsidian Canvas)
- **Surface Panels**: `#0b0f19` / `rgba(11, 15, 25, 0.92)` with crisp 1px borders `border-slate-800` / `border-slate-700/60`
- **Accent Beacons**: Telematics Cyan (`#06b6d4`), Clear Emerald (`#10b981`), Hazard Amber (`#f59e0b`), Critical Coral (`#f43f5e`), Trade Violet (`#8b5cf6`)
- **Typography**: 
  - Display & Headings: `Plus Jakarta Sans`, font-semibold, tracking-tight
  - Telematics & Numbers: `JetBrains Mono` with `tabular-nums`

### Component Style Example

```jsx
import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { TabularMetric, StatusBadge } from '../primitives';

export function CockpitMetricTile({ label, value, unit, trend, status = 'nominal' }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="uppercase tracking-wider">{label}</span>
        <StatusBadge status={status} size="xs" />
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <TabularMetric value={value} unit={unit} className="text-xl font-bold text-slate-100" />
        {trend && (
          <span className={`text-xs font-mono font-medium ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.positive ? '↑' : '↓'} {trend.text}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

- **Test Suite Location**: `frontend/tests/*.test.js`
- **Runner**: Node.js native test runner (`node --test`)
- **Coverage Criteria**:
  1. All 168 existing unit and integration tests must pass without regressions.
  2. Workspace context must cleanly toggle active rail tabs and collapsed states.
  3. RBAC persona permissions must dynamically restrict access to sensitive inspector tabs (e.g., Compliance locked for Dispatcher, Routing locked for Customs).
  4. Camera mode switches in the bottom strip must accurately dispatch 3D camera controller transitions.

---

## Boundaries

### Always
- Verify all 168 tests pass before and after changes (`npm test --prefix frontend`).
- Use standard CSS variables and Tailwind classes aligned with `#020617` base and `#0b0f19` panel surfaces.
- Ensure all numbers and real-time telematics use `tabular-nums` and monospace styling to prevent layout jitter.
- Maintain responsive rail collapsing so lower resolutions (e.g. 1280px) never experience horizontal overflow.

### Ask First
- Adding any new external npm packages.
- Modifying test assertions in `frontend/tests/`.
- Changing existing route coordinates or corridor node topology in `src/constants/stage3DTopology.js`.

### Never
- Never delete or bypass existing RBAC permission checks in `dockConfig.js` or `PersonaContext.jsx`.
- Never degrade persistent 3D WebGL render loop performance below 60 FPS.
- Never use bright uncalibrated background colors or inconsistent border radius values.

---

## Success Criteria

1. **Zero Window Overlap**: No panels float randomly or occlude each other; all active analytical modules occupy dedicated, anchored left/right rails.
2. **Clear Central 3D Focus**: The 3D Digital Twin corridor remains clearly visible and interactive in the center arena at all times.
3. **Collapsible Rails**: Both Left and Right rails can be toggled/collapsed with single-click chevron buttons for full-screen 3D immersion when desired.
4. **Instant Persona Adaptation**: Switching between Director, Dispatcher, Compliance Officer, and Admin immediately reconfigures the visible metrics and accessible tabs without layout breakage.
5. **100% Test Pass Rate**: `npm test --prefix frontend` exits with code 0 (all 168 passing).
6. **Clean Production Build**: `npm run build --prefix frontend` succeeds with zero errors.

---

## Open Questions

1. **Left Rail Default Width**: Would you prefer the left situational awareness rail fixed at ~340px width (compact metric tiles) or slightly wider at ~380px (for expanded charts)?
2. **Right Inspector Expansion**: When inspecting complex data like the LSTM Demand Forecast chart or IDP Customs Documents, should the right rail support an "expand to center" toggle (expanding from ~460px to ~720px)?
