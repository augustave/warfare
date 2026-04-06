# ASCII Automata System v1.0

## Overview
**ASCII Automata System** is a high-performance visual simulation rendered as a **Windows 95 desktop application**. It bridges **drone swarm physics** and **semantic knowledge graphs**, visualizing how an "Agentic AI" interprets strategic doctrines (e.g., "Kill Web", "Sensing Grid") by physically maneuvering pixel-art agents into formation while maintaining dynamic data links.

The entire interface is built as a faithful recreation of the **Win95 operating system chrome** — beveled 3D borders, navy-blue title bars, system buttons, register-dump readouts, and a DOS command prompt terminal — running a cellular automata simulation inside a coordinate-gridded canvas.

## Visual Identity: Utilitarian Generative OS

The art direction is **"research simulation running on a 1995 workstation"**:

- **Win95 Window Chrome**: Every panel is a proper Win95 window with 3D inset/outset beveled borders, navy-blue gradient title bars, `[_][□][×]` system buttons, and menu bars.
- **Pixel-Art Agents**: 64 agents are rendered as tiny 10×10px `<canvas>` elements displaying 5×5 pixel-art bitmaps that change pattern per formation (block, diamond, frame, X-pattern).
- **Coordinate Grid Canvas**: The simulation area draws hex-addressed grid lines (000, 064, 0C8…), center crosshair guides, and a live mouse-position hex readout.
- **Register-Dump Stats**: System telemetry displays as hardware register dumps with memory addresses (0x00–0x23), hex values, and segmented navy-blue Win95 progress bars.
- **DOS Terminal**: Log output renders in a `C:\ASCIIAUTOMATA>` prompt with blinking block cursor, CRT phosphor scanlines, and green-on-black text glow.
- **Teal Desktop**: The app window floats on the classic `#008080` Windows 95 desktop background.
- **CRT Scanlines**: Horizontal phosphor lines overlay the canvas, intensifying as trust degrades.

## Cost Surfaces & Budgeted Command

The system tracks four finite resources (0–100%):
- **Latency Headroom**: Capacity for responsive command; depleted by high-jitter environments.
- **Bandwidth**: Mesh network capacity; drained by wide-area sensing and jamming.
- **Endurance (Energy)**: Physical battery/fuel state; consumed by high-speed maneuvers.
- **Operator Load (Attention)**: Cognitive capacity of human oversight; taxed by alerts and task switching.

### Soft Fail Degradation
As budgets deplete below 40%, the simulation visually degrades:
- **Low Energy**: Agents move slower, formations become sluggish.
- **Low Bandwidth**: Network links fade and become intermittent.
- **Low Latency**: Command signals suffer jitter/noise.

### Gated Doctrine & Hard Constraints
- Aggressive doctrines like **Kill Web** are locked if resources are critical (e.g., requires Energy > 25%).
- Burst costs are applied instantly when triggering events like **Flash War** or **Jamming**.

## Core Features

### Hybrid Physics Engine
- **Canvas Layer**: Handles high-frequency particle physics (60FPS) for 64 pixel-art agents.
- **React Layer**: Manages state, Win95 UI chrome, and semantic data handling.
- **Optimization**: QuadTree spatial partitioning for efficient neighbor detection.

### Semantic Knowledge Graph
- Agents are **Knowledge Nodes** representing strategic concepts (e.g., "Replicator", "Attritable Mass").
- **Dynamic Linking**: Related concepts form visual data links when in proximity.
- **Packet Animation**: Data packets travel along selected relationship links.

### Tactical Formations (Doctrines)
- **Net Idle**: Low-cost, free-floating grid formation.
- **Sensing Grid**: Wide-area search (High Bandwidth cost).
- **A2AD Wall**: Defensive perimeter (High Energy cost).
- **Kill Web**: Aggressive strike with spiral attack pattern (High cost across all budgets).

### Trust & Accountability
- **Trust Debt**: High-risk autonomous actions degrade global confidence.
- **After Action Report (AAR)**: Win95 dialog with graded report at session end, showing trust telemetry, resource register dumps, and incident log.

## Stability Features

- **Single Clock Runtime**: Strictly one simulation loop (10Hz) to prevent CPU race conditions.
- **Seeded Jitter**: Coherent seeded noise eliminates "teleporting" visual artifacts.
- **State Guardrails**: Inputs are clamped and sanitized to prevent NaN/Negative budget states.
- **Kernel Diagnostics**: Press `Ctrl+D` (or `Cmd+D`) to toggle the runtime debugger overlay.

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS v4.0 + Custom Win95 CSS chrome system
- **Rendering**: HTML5 Canvas API (2D Context) — grid layer, sensor layer, network layer, per-agent pixel canvases
- **State**: React Hooks (complex state managed via Refs for performance)
- **Icons**: Lucide React (minimal), ASCII/Unicode glyphs for Win95 UI
- **Audio**: Custom Web Audio Engine
- **Font**: Press Start 2P (pixel font for headings/grades)

## Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Build for Production**
    ```bash
    npm run build
    ```

## Project Structure

```
/src
  /app
    /components     # React UI components (MainStage, StatsPanel, ControlPanel, Terminal, etc.)
    /components/ui  # Shadcn/Radix primitives (dialog, sheet, scroll-area, etc.)
    /data.ts        # Semantic Knowledge Graph definitions
    /types.ts       # TypeScript interfaces (Budgets, FormationType, SimulationStats)
    /utils          # SoundEngine, QuadTree, Guards, Noise
    App.tsx         # Main loop, state management, Win95 window frame
  /styles
    theme.css       # CSS variables, Win95 chrome classes, CRT effects
    fonts.css       # Press Start 2P pixel font import
```

---
*Ref: 2011fb7e // Status: OPERATIONAL // Budgets: NOMINAL*
