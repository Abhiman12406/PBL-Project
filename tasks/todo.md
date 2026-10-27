# Task List: NeoLogix Unified Command Cockpit Redesign

## Phase 1: Foundations & Token Polish

### Task 1: Polish Industrial Primitives & CSS Design Tokens
**Description:** Refine `GlassCard.jsx`, `StatusBadge.jsx`, and `TabularMetric.jsx` with crisp 1px borders, high-contrast dark surfaces (`#0b0f19`/`slate-950`), and consistent padding tokens meeting WCAG AA contrast standards.
**Acceptance criteria:**
- [x] `GlassCard` supports variants (`default`, `elevated`, `subtle`, `interactive`) with sharp 1px micro-borders and soft depth.
- [x] `StatusBadge` provides high-contrast operational indicator pills with glowing dots.
- [x] `TabularMetric` renders numerical metrics in `JetBrains Mono` with `tabular-nums`.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
**Dependencies:** None
**Files likely touched:**
- `frontend/src/ui/primitives/GlassCard.jsx`
- `frontend/src/ui/primitives/StatusBadge.jsx`
- `frontend/src/ui/primitives/TabularMetric.jsx`
**Estimated scope:** Small (3 files)

---

### Checkpoint: Foundation
- [x] Full unit test suite passes: `npm test --prefix frontend`
- [x] Primitives export cleanly and compile without errors

---

## Phase 2: Docked Cockpit Rails

### Task 2: Build Left Situational Awareness Rail (`LeftSituationalRail.jsx`)
**Description:** Create the anchored left rail component that houses macro fleet KPIs, network health metrics, and the Autonomous AI Sentinel incident monitor. Includes one-click collapse/expand functionality.
**Acceptance criteria:**
- [x] Anchored cleanly to the left viewport edge (`w-[360px]` expanded, slim icon rail collapsed).
- [x] Tab/accordion switcher between Executive KPIs (`KpisContent`) and Corridor Sentinel (`AutonomousSentinelHUD`).
- [x] Crisp header with operational status beacon and collapse toggle.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/ui/layout/LeftSituationalRail.jsx`
**Estimated scope:** Small (1 file)

---

### Task 3: Build Right Analytical Inspector Rail (`RightInspectorRail.jsx`)
**Description:** Create the anchored right rail component that houses deep analytical modules (DRL Dynamic Routing, LSTM Forecasting, Trade Compliance, and Admin Retrain Console). Includes module tab switcher, RBAC role-clearance feedback, and width expand/collapse controls.
**Acceptance criteria:**
- [x] Anchored to the right viewport edge (`w-[480px]` standard, expandable to `w-[680px]` for wide data tables).
- [x] Tab buttons for Routing, Forecasting, Compliance, and System diagnostics with active highlight beacons.
- [x] If current persona lacks permission, renders an informative locked state with one-click persona switcher.
- [x] Smooth expand/collapse toggles that never cover the center 3D vehicle tracking view unexpectedly.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/ui/layout/RightInspectorRail.jsx`
**Estimated scope:** Medium (1-2 files)

---

### Task 4: Build Bottom Telematics & Camera Control Bar (`BottomTelemetryBar.jsx`)
**Description:** Implement the bottom docked control strip providing instant 3D camera mode selection (Chase Cam, Cockpit Dashcam, Drone God-View, Free Orbit), Day/Night lighting simulation toggle, and real-time vehicle speed/telematics readout.
**Acceptance criteria:**
- [x] Anchored at bottom-center with high-contrast glass pill styling.
- [x] Camera mode buttons seamlessly trigger camera transitions via `WorkspaceContext`.
- [x] Night simulation button toggles day/night lighting in the 3D world.
- [x] Live speed, corridor km, and throttle % displayed in tabular monospace format.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
**Dependencies:** Task 1
**Files likely touched:**
- `frontend/src/ui/layout/BottomTelemetryBar.jsx`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Cockpit Components
- [x] Run `npm test --prefix frontend` (all 176 tests pass)
- [x] All three rail/dock components compile cleanly

---

## Phase 3: Cockpit Integration & Refinement

### Task 5: Implement `UnifiedCockpitLayout.jsx` & Wire into `WindowManager.jsx`
**Description:** Assemble the Left Situational Rail, Center 3D Arena, Right Analytical Inspector, and Bottom Telematics Bar into `UnifiedCockpitLayout.jsx`. Wire it as the primary interface in `WindowManager.jsx` and update `WorkspaceContext.jsx` to default to the unified cockpit.
**Acceptance criteria:**
- [x] `UnifiedCockpitLayout` renders the full cockpit grid with zero overlapping windows.
- [x] `WindowManager.jsx` defaults to `UnifiedCockpitLayout` while maintaining compatibility with legacy tests.
- [x] Layout responds cleanly to screen resizes down to 1280px width without horizontal scrolling.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
**Dependencies:** Tasks 2, 3, 4
**Files likely touched:**
- `frontend/src/ui/layout/UnifiedCockpitLayout.jsx`
- `frontend/src/ui/layout/WindowManager.jsx`
- `frontend/src/ui/layout/index.js`
- `frontend/src/context/WorkspaceContext.jsx`
**Estimated scope:** Medium (4 files)

---

### Task 6: Refine Top `CyberStatusBar.jsx` Alignment & Spacing
**Description:** Polish the top `CyberStatusBar.jsx` layout, ensuring pixel-perfect horizontal alignment of the operations menu, logo, corridor progression timeline, UTC/IST clocks, and persona dropdown with the new docked rails below.
**Acceptance criteria:**
- [x] Header height fixed at 56px with crisp 1px bottom border `border-slate-800`.
- [x] Corridor stop indicators align cleanly across the top-center.
- [x] Persona selector and quick workspace buttons align with the right rail's boundary.
**Verification:**
- [x] Tests pass: `npm test --prefix frontend`
- [x] Build succeeds: `npm run build --prefix frontend`
- [x] Oxlint passes: `npm run lint --prefix frontend`
**Dependencies:** Task 5
**Files likely touched:**
- `frontend/src/ui/layout/CyberStatusBar.jsx`
**Estimated scope:** Small (1 file)

---

### Final Checkpoint: Full Platform Verification
- [x] All 186 unit and integration tests pass: `npm test --prefix frontend`
- [x] Full production build completes cleanly: `npm run build --prefix frontend`
- [x] Oxlint passes with zero errors: `npm run lint --prefix frontend`
- [x] Zero free-floating window overlap; verified high-density command cockpit alignment
