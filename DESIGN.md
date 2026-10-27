---
name: NeoLogix Smart Logistics Design System
description: High-velocity intermodal freight command console & dual-engine corridor digital twin design system
colors:
  primary: "#06b6d4"
  neutral-bg: "#020617"
  neutral-surface: "#0b0f19"
  accent-orange: "#ff5400"
  signal-emerald: "#10b981"
  solar-amber: "#f59e0b"
  hazard-coral: "#f43f5e"
  compliance-violet: "#8b5cf6"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-glass:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "#f8fafc"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: NeoLogix Command Console

## Overview

NeoLogix is a cyber-physical mission control interface designed for 24/7 logistics orchestration, corridor telematics, and multi-echelon supply chain oversight. Built for high situational awareness, it pairs a persistent 60 FPS 3D corridor digital twin with floating, draggable, and dockable glassmorphic service panels.

The visual system rejects generic SaaS templates and card-grid dashboards in favor of an authentic intermodal transport dispatch aesthetic. High-precision numerical indicators, 45/90° transit vectors, and luminous operational beacons deliver instant clarity to Supply Chain Directors, Fleet Dispatchers, Compliance Officers, and IT Administrators.

## Colors

- **Neutral Foundation**:
  - Base Ground: `#020617` (Deep Obsidian Canvas)
  - Surface Glass: `rgba(11, 15, 25, 0.85)` with `backdrop-filter: blur(20px)`
  - Elevated Container: `#111827`
  - Subtle Borders: `rgba(51, 65, 85, 0.6)` / `rgba(71, 85, 105, 0.5)`
- **Operational Status Palette**:
  - Telematics Cyan: `#06b6d4` (Active vehicle telemetry, camera modes, GPS stream)
  - Clear Corridor Emerald: `#10b981` (On-time SLA, nominal stock levels, validated transit)
  - Alert Amber: `#f59e0b` (Weather hazards, congestion warnings, LSTM uncertainty bounds)
  - Critical Hazard Coral: `#f43f5e` (Roadblock obstructions, mudslides, RBAC clearance locks)
  - Trade Compliance Violet: `#8b5cf6` (Automated IDP customs seals, HS code audits)
  - Safety Orange: `#ff5400` (Platform beacon, corridor freight volume)

## Typography

- **Display & Headings**: `Plus Jakarta Sans`, weights 600-800. Crisp technical character with negative tracking (-0.02em) on titles. Strict prohibition on decorative eyebrow labels or kicker caps above headings.
- **Body & Prose**: `Plus Jakarta Sans`, weights 400-500, line height 1.5, measure bounded between 60ch and 75ch.
- **Data & Telematics**: `JetBrains Mono` with `font-variant-numeric: tabular-nums`. Used for physical coordinates, latency, speedometers, HS codes, and probability bounds to ensure zero visual jitter during 60 FPS streaming.

## Layout

- **Persistent Spatial Stage**: Full-viewport Three.js / Cesium dual-engine canvas acting as the spatial anchor at `z-0`.
- **Top Cyber Status Bar**: 56px fixed header (`z-40`) providing continuous visibility into the active sequential corridor itinerary (JNPT ↔ Nashik), live WebSocket connectivity, IST/UTC clock, and role-adaptive persona switcher.
- **Role-Adaptive Glass Dock**: Floating pill toolbar (`z-40`) anchored at bottom-center with role-clearance markers and quick layout presets (minimize all, reset).
- **Floating Window Manager**: Freeform draggable and resizable service panels (`z-30`) with coordinate boundary clamping, window memory persistence, and full maximization support.

## Elevation & Depth

- **Tonal Layering**: Depth is achieved through backdrop blur filters (`backdrop-blur-md` and `backdrop-blur-2xl`), translucent obsidian surfaces, and fine micro-borders (`1px border-slate-700/60`).
- **Soft Dispersion Shadows**: Windows utilize soft, diffuse ambient shadows (`box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85)`). Zero-blur colored halos and hard block shadows are strictly prohibited.
- **Luminous Conduit Accents**: Critical road conduits and beacons project calibrated glows (`0 0 15px rgba(6, 182, 212, 0.35)`).

## Shapes

- **Radius Tokens**:
  - Small elements (badges, buttons, tags): `6px` (`rounded-md`) to `8px` (`rounded-lg`)
  - Floating panels and dock: `16px` (`rounded-2xl`) to `24px` (`rounded-3xl`)
- **Interactive State Feedback**: Subtle inner borders and gentle scale transform on active press (`active:scale-[0.98]`).

## Components

- **GlassCard (`src/ui/primitives/GlassCard.jsx`)**: The fundamental panel surface with obsidian glass texture, micro-borders, and customizable variants (`default`, `elevated`, `subtle`, `interactive`).
- **StatusBadge (`src/ui/primitives/StatusBadge.jsx`)**: High-contrast indicator pills with pulsing dot beacons and role-appropriate color mapping meeting WCAG AA contrast standards.
- **TabularMetric (`src/ui/primitives/TabularMetric.jsx`)**: Aligned tabular numerical displays paired with units and trend deltas.
- **CyberButton (`src/ui/primitives/CyberButton.jsx`)**: Tactile interactive controls with hover transitions, focused keyboard focus rings, and disabled states.
- **GlassPanel (`src/ui/layout/GlassPanel.jsx`)**: Complete floating window container with title bar, minimize/restore, maximize, drag repositioning, and resize grips.

## Do's and Don'ts

### Do
- Always use tabular numbers (`tabular-nums font-mono`) for live metrics, timestamps, speed, and GPS coordinates.
- Ensure all text on translucent backgrounds maintains at least 4.5:1 contrast against the darkest sample point.
- Group dense operational controls cleanly with SectionHeader and explicit action targets.
- Preserve backward-compatible barrel exports across `src/modules/*`, `src/ui/*`, and `src/core/*`.

### Don't
- Never place kicker/eyebrow labels above headings.
- Never use colored border-left or border-right accent stripes (>1px) on cards or panels.
- Never use gradient text or decorative text fills.
- Never use gray text directly over colored status backgrounds.
- Never animate images or canvas frames directly on hover.
