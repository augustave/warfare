# ASCII Automata System v1.0 (Budgeted Command)

## Overview
**ASCII Automata System** is a high-performance visual simulation that bridges the gap between **drone swarm physics** and **semantic knowledge graphs**. Built with a **Utilitarian Generative OS** aesthetic, it visualizes how an "Agentic AI" interprets strategic doctrines (e.g., "Kill Web", "Sensing Grid") by physically maneuvering distinct agents into formation while maintaining dynamic data links.

The system features **Cost Surfaces & Budgeted Command**, a finite resource economy that forces operators to trade off between operational tempo and system sustainability. Every command now consumes specific budgets (Latency, Bandwidth, Energy, Attention), adding strategic tension and consequence to the simulation.

## New Features (v2.5: Cost Surfaces)

### 1. Resource Budget Economy
The system now tracks four distinct finite resources (0-100%):
- **Latency Headroom**: Capacity for responsive command; depleted by high-jitter environments and complex fusion.
- **Bandwidth**: Mesh network capacity; drained by wide-area sensing and jamming.
- **Endurance (Energy)**: Physical battery/fuel state; consumed by high-speed maneuvers and formation keeping.
- **Operator Load (Attention)**: Cognitive capacity of human oversight; taxed by alerts and rapid task switching.

### 2. "Soft Fail" Degradation
As budgets deplete below critical thresholds (<40%), the simulation visually degrades:
- **Low Energy**: Agents move slower and formations become sluggish.
- **Low Bandwidth**: Network links become faint and intermittent.
- **Low Latency**: Command signals suffer from high jitter/noise.

### 3. Gated Doctrine & Hard Constraints
- Aggressive doctrines like **Kill Web** are now locked if resources are critical (e.g., requires Energy > 25%).
- Burst costs are applied instantly when triggering events like **Flash War** or **Jamming**.

## Core Features

### 1. Hybrid Physics Engine
- **Canvas Layer**: Handles high-frequency particle physics (60FPS) for 64+ interactive agents.
- **React Layer**: Manages state, UI overlays, and semantic data handling.
- **Optimization**: QuadTree spatial partitioning ensures efficient neighbor detection.

### 2. Semantic Knowledge Graph
- Agents are **Knowledge Nodes** representing strategic concepts (e.g., "Replicator", "Attritable Mass").
- **Dynamic Linking**: Related concepts form visual data links when in proximity.

### 3. Tactical Formations (Doctrines)
- **Net Idle**: Low-cost, free-floating behavior.
- **Sensing Grid**: Wide-area search (High Bandwidth cost).
- **A2AD Wall**: Defensive perimeter (High Energy cost).
- **Kill Web**: Aggressive strike (High cost across all budgets).

### 4. Trust & Accountability
- **Trust Debt**: High-risk autonomous actions degrade global confidence.
- **After Action Report (AAR)**: Generates a graded report at session end, summarizing trust incidents and final resource states.

## Stability Hotfix (Patch 001)

This version includes critical stability improvements:
- **Single Clock Runtime**: Guarantees strictly one simulation loop (10Hz) to prevent CPU race conditions.
- **Seeded Jitter**: Replaced random noise with coherent seeded noise to eliminate "teleporting" visual artifacts.
- **State Guardrails**: Inputs are clamped and sanitized to prevent NaN/Negative budget states.
- **Kernel Diagnostics**: Press `Ctrl+D` (or `Cmd+D`) to toggle the runtime debugger overlay.

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS v4.0
- **Rendering**: HTML5 Canvas API (2D Context)
- **State**: React Hooks (complex state managed via Refs for performance)
- **Icons**: Lucide React
- **Audio**: Custom Web Audio Engine

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
    /components   # React UI components (MainStage, StatsPanel, etc.)
    /data.ts      # Semantic Knowledge Graph definitions
    /types.ts     # TypeScript interfaces (including Budgets)
    /utils        # SoundEngine, QuadTree, Guards
    App.tsx       # Main loop and state management
  /styles         # Tailwind and Theme
```

---
*Ref: 2011fb7e // Status: OPERATIONAL // Budgets: NOMINAL*
