# Agentic Warfare Simulation

## Overview

A real-time drone swarm simulation rendered as a **brutalist typographic diagram**. 64 autonomous agents form dynamic doctrines (Kill Web, Sensing Grid, A2AD Wall) while maintaining semantic knowledge-graph links — visualized as heavy black structural beams on a pure white canvas. Inspired by Maciunas Fluxus diagrams and Swiss brutalist print design.

## Visual Identity: Brutalist Flow

The entire interface is pure black and white. No color. No gradients. No shadows. No rounded corners.

- **Heavy Beams**: 6px structural connectors separate every section. 20px beams form the title bar and timeline. Network links between agents render as thick black lines.
- **Typography-Driven**: All data is communicated through type size, weight, and negative space. Large bold numbers. 9px uppercase tracking labels. 80px ghost formation names on the canvas.
- **Inverted Blocks**: Active states use white-on-black inversion. Hostile targets blink as hollow white squares with thick black borders.
- **Stark Agents**: 64 agents are pure 12×12px black squares. No labels, no icons, no color. Selected agents get a black outline offset. Hostiles are inverted (white with black border).
- **Sensor Grid**: Revealed coverage shown as black square dots on white. Unrevealed areas are near-invisible.
- **Timeline Bar**: Bottom bar displays all resource budgets as a continuous black strip with white text.
- **Trust Degradation**: At red trust, the entire trust panel inverts to black. The REVOKED stamp appears as a ghosted watermark. Critical values blink.

## Cost Surfaces & Budgeted Command

Four finite resources (0–100%):

| Resource | Depleted By | Visual Effect |
|----------|------------|---------------|
| **Latency** | High-jitter environments | Command signals gain noise |
| **Bandwidth** | Wide-area sensing, jamming | Network beams fade |
| **Endurance** | High-speed maneuvers | Agents move slower |
| **Attention** | Alerts, task switching | Requires manual confirmation |

### Gated Doctrine

Kill Web requires Energy > 25% and incurs burst costs across all channels. Formations lock when resources are critical (buttons go to 15% opacity).

## Core Architecture

### Hybrid Rendering

- **Canvas Layer**: 60FPS particle physics for 64 agents + QuadTree neighbor detection + heavy beam network drawing
- **React Layer**: State management, typographic panels, dialog system
- **DOM Agents**: Each agent is a positioned `<div>` for drag interaction and hit testing

### Semantic Knowledge Graph

Agents represent strategic concepts (Replicator, Attritable Mass, etc.). Related concepts form visual data links — heavy dashed beams when selected, with 6×6px black packet squares traveling along them.

### Tactical Formations

| Code | Name | Cost Profile |
|------|------|-------------|
| 01 | Net Idle | Low |
| 02 | Sensing Grid | Bandwidth-heavy |
| 03 | A2AD Wall | Energy-heavy |
| 04 | Kill Web | All channels, burst cost |

### Trust & Accountability

High-risk autonomous actions degrade global confidence. Below 70%, all actions require human authorization via a brutalist confirmation dialog. At 0%, system is REVOKED.

## Stability

- Single 10Hz simulation clock (prevents race conditions)
- Seeded noise for coherent jitter
- Clamped state (no NaN/negative budgets)
- `Ctrl+D` / `Cmd+D` toggles kernel diagnostics overlay

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS v4 + custom brutalist utility classes
- HTML5 Canvas 2D (sensor layer, network beam layer)
- Web Audio API (sound engine)
- Vite 6

## Getting Started

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Project Structure

```
src/
  app/
    components/     # MainStage, ControlPanel, StatsPanel, Terminal, overlays
    components/ui/  # Shadcn/Radix primitives
    data.ts         # Knowledge graph definitions
    types.ts        # TypeScript interfaces
    utils/          # SoundEngine, QuadTree, Guards, Noise
    App.tsx         # Main loop, state, layout
  styles/
    theme.css       # Brutalist Flow design system
    fonts.css       # Inter font import
```
