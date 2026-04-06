import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { Budgets, KnowledgeNode, FormationType, SimulationStats } from '../types';
import { QuadTree, Rectangle } from '../utils/QuadTree';
import { KNOWLEDGE_BASE, GRAPH_RELATIONSHIPS } from '../data';
import { clsx } from 'clsx';
import { ScanlineOverlay } from './ScanlineOverlay';
import { getSmoothedVec2 } from '../utils/noise';

const AGENT_COUNT = 64;
const CELL_SIZE = 10;
const GAP = 2;
const CONNECTION_DIST = 120;
const GRID_CELL = 20; // Background grid cell size

export interface MainStageHandle {
  spawnHostile: () => void;
  triggerJamming: () => void;
  triggerFlashWar: () => void;
}

interface MainStageProps {
  formation: FormationType;
  selectedNode: KnowledgeNode | null;
  onAgentClick: (node: KnowledgeNode) => void;
  onStatsUpdate: (stats: Partial<SimulationStats>) => void;
  onLog: (msg: string, type?: 'alert' | 'info' | 'success') => void;
  trust: number;
  budgets?: Budgets;
}

interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface Hostile {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lockedOn?: boolean;
}

interface SensorPoint {
  x: number;
  y: number;
  revealed: boolean;
}

// Pixel patterns for agent states (5x5 bitmaps)
const AGENT_PATTERNS: Record<string, number[]> = {
  idle:    [0,1,1,1,0, 1,1,1,1,1, 1,1,0,1,1, 1,1,1,1,1, 0,1,1,1,0],
  search:  [0,0,1,0,0, 0,1,0,1,0, 1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0],
  shield:  [1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1],
  strike:  [1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0, 0,1,0,1,0, 1,0,0,0,1],
  hostile: [1,0,1,0,1, 0,1,1,1,0, 1,1,1,1,1, 0,1,1,1,0, 1,0,1,0,1],
};

export const MainStage = forwardRef<MainStageHandle, MainStageProps>(({
  formation,
  selectedNode,
  onAgentClick,
  onStatsUpdate,
  onLog,
  trust,
  budgets
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const sensorCanvasRef = useRef<HTMLCanvasElement>(null);
  const netCanvasRef = useRef<HTMLCanvasElement>(null);

  const trustPhase = trust >= 85 ? 'green' : trust >= 70 ? 'yellow' : trust >= 50 ? 'orange' : 'red';

  // Soft Fail Calculations
  const energyFactor = budgets ? budgets.energy / 100 : 1;
  const speedMultiplier = energyFactor < 0.4 ? 0.5 : 1.0;
  const bandwidthFactor = budgets ? budgets.bandwidth / 100 : 1;
  const linkOpacity = bandwidthFactor < 0.4 ? 0.3 : 1.0;
  const latencyFactor = budgets ? budgets.latency / 100 : 1;
  const latencyJitter = latencyFactor < 0.4 ? 2 : 0;
  const trustJitter = trustPhase === 'green' ? 0 : trustPhase === 'yellow' ? 0.5 : trustPhase === 'orange' ? 2 : 5;
  const totalJitter = trustJitter + latencyJitter;

  // DOM Refs
  const agentDomsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const hostileDomsRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Simulation State
  const agentsRef = useRef<Agent[]>([]);
  const hostilesRef = useRef<Hostile[]>([]);
  const sensorGridRef = useRef<SensorPoint[]>([]);
  const packetsRef = useRef<{x: number, y: number, tx: number, ty: number, age: number, maxAge: number}[]>([]);
  const draggingRef = useRef<{id: number, startX: number, startY: number} | null>(null);
  const lockOnTimerRef = useRef(0);
  const networkStatusRef = useRef<'nominal' | 'jammed' | 'local'>('nominal');
  const animationFrameRef = useRef<number>(0);
  const lastFormationRef = useRef<FormationType>(formation);
  const mousePos = useRef({ x: 0, y: 0 });

  // Pre-computed mapping
  const nodeToAgentsMap = useRef<Map<string, number[]>>(new Map());
  if (nodeToAgentsMap.current.size === 0) {
    const nodeCount = Object.keys(KNOWLEDGE_BASE).length;
    for (let i = 0; i < AGENT_COUNT; i++) {
      const node = KNOWLEDGE_BASE[i % nodeCount];
      if (node) {
        const existing = nodeToAgentsMap.current.get(node.id) || [];
        existing.push(i);
        nodeToAgentsMap.current.set(node.id, existing);
      }
    }
  }

  // Draw a single agent as a 5x5 pixel art pattern on its mini canvas
  const drawAgentPixels = useCallback((canvas: HTMLCanvasElement, patternKey: string, isSelected: boolean, isRelated: boolean) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = 2; // pixel scale
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pattern = AGENT_PATTERNS[patternKey] || AGENT_PATTERNS.idle;
    const color = isSelected ? '#0000FF' : isRelated ? '#000080' : '#000000';
    const bg = isSelected ? '#0000FF' : isRelated ? '#000080' : 'transparent';

    if (bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = color;
    for (let py = 0; py < 5; py++) {
      for (let px = 0; px < 5; px++) {
        if (pattern[py * 5 + px]) {
          ctx.fillRect(px * s, py * s, s, s);
        }
      }
    }
  }, []);

  // Initialize Agents
  useEffect(() => {
    if (agentsRef.current.length === 0) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      for (let i = 0; i < AGENT_COUNT; i++) {
        agentsRef.current.push({ id: i, x: cx, y: cy, targetX: cx, targetY: cy });
      }
    }
  }, []);

  useEffect(() => {
    lastFormationRef.current = formation;
    if (hostilesRef.current.length > 0) {
      onLog(`ROE: <${formation.toUpperCase()}>. Engaging target.`);
    } else {
      onLog(`Command: Formation <${formation.toUpperCase()}>`);
    }
  }, [formation, onLog]);

  useImperativeHandle(ref, () => ({
    spawnHostile: () => {
      if (hostilesRef.current.length > 0) return;
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const startX = Math.random() > 0.5 ? 20 : width - 20;
      const startY = Math.random() * height;
      const newHostile: Hostile = { id: Date.now(), x: startX, y: startY, targetX: width / 2, targetY: height / 2 };
      hostilesRef.current.push(newHostile);
      onLog("ALERT: UNIDENTIFIED SIGNATURE DETECTED.", "alert");
      onStatsUpdate({ threatLevel: 'elevated' });
    },
    triggerJamming: () => {
      onLog("WARNING: RF SPECTRUM JAMMING DETECTED.", "alert");
      networkStatusRef.current = 'jammed';
      onStatsUpdate({ networkStatus: 'jammed' });
      agentsRef.current.forEach(agent => {
        agent.targetX += (Math.random() - 0.5) * 300;
        agent.targetY += (Math.random() - 0.5) * 300;
      });
      setTimeout(() => {
        onLog("Switching to Edge Compute... Local mesh established.");
        networkStatusRef.current = 'local';
        onStatsUpdate({ networkStatus: 'local' });
      }, 2500);
      setTimeout(() => {
        networkStatusRef.current = 'nominal';
        onStatsUpdate({ networkStatus: 'nominal' });
        onLog("Spectrum clear. Resuming standard protocols.");
      }, 8000);
    },
    triggerFlashWar: () => {
      onLog("CRITICAL: Adversarial AI detected. Escalation imminent.", "alert");
      onStatsUpdate({ threatLevel: 'critical' });
      if (containerRef.current) {
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          if (!containerRef.current) return;
          containerRef.current.style.backgroundColor = flashCount % 2 === 0 ? '#FF0000' : '';
          flashCount++;
          if (flashCount > 5) {
            clearInterval(flashInterval);
            containerRef.current.style.backgroundColor = '';
            onLog("De-escalation protocols active. Human-in-the-loop required.");
            if (hostilesRef.current.length > 0) {
              hostilesRef.current = [];
              setRenderHostiles([]);
            }
            onStatsUpdate({ threatLevel: 'low' });
          }
        }, 200);
      }
      const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
      const newHostile: Hostile = {
        id: Date.now(),
        x: Math.random() > 0.5 ? 20 : width - 20,
        y: Math.random() * height,
        targetX: width / 2, targetY: height / 2
      };
      hostilesRef.current.push(newHostile);
      setRenderHostiles([newHostile]);
    }
  }));

  const [renderHostiles, setRenderHostiles] = useState<Hostile[]>([]);

  useEffect(() => {}, [renderHostiles]);

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const agent = agentsRef.current.find(a => a.id === id);
    if (agent) draggingRef.current = { id, startX: e.clientX, startY: e.clientY };
    const dataIndex = id % Object.keys(KNOWLEDGE_BASE).length;
    onAgentClick(KNOWLEDGE_BASE[dataIndex]);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    if (draggingRef.current) {
      const agent = agentsRef.current.find(a => a.id === draggingRef.current?.id);
      if (agent && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        agent.targetX = e.clientX - rect.left;
        agent.targetY = e.clientY - rect.top;
      }
    }
  };

  const handleMouseUp = () => { draggingRef.current = null; };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Draw background grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += GRID_CELL) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += GRID_CELL) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Major grid lines every 100px
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 100) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += 100) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Hex coordinate labels on major gridlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.font = '8px monospace';
    for (let x = 0; x <= w; x += 100) {
      ctx.fillText(`${(x).toString(16).toUpperCase().padStart(3,'0')}`, x + 2, 10);
    }
    for (let y = 100; y <= h; y += 100) {
      ctx.fillText(`${(y).toString(16).toUpperCase().padStart(3,'0')}`, 2, y - 2);
    }

    // Origin crosshair
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  // Main Game Loop
  useEffect(() => {
    const initSensors = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const spacing = 50;
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      const newGrid: SensorPoint[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          newGrid.push({ x: i * spacing + spacing / 2, y: j * spacing + spacing / 2, revealed: false });
        }
      }
      sensorGridRef.current = newGrid;
    };

    const resize = () => {
      if (containerRef.current && sensorCanvasRef.current && netCanvasRef.current && gridCanvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        [gridCanvasRef, sensorCanvasRef, netCanvasRef].forEach(ref => {
          if (ref.current) { ref.current.width = width; ref.current.height = height; }
        });
        initSensors();
        // Redraw static grid
        const gridCtx = gridCanvasRef.current.getContext('2d');
        if (gridCtx) drawGrid(gridCtx, width, height);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const loop = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const cx = width / 2;
      const cy = height / 2;
      const netCtx = netCanvasRef.current?.getContext('2d');
      const sensorCtx = sensorCanvasRef.current?.getContext('2d');
      const currentFormation = lastFormationRef.current;
      const activeHostile = hostilesRef.current[0];

      // 1. Update Targets (same logic as before)
      if (!activeHostile) {
        if (currentFormation === 'idle') {
          const cols = 8;
          agentsRef.current.forEach((agent, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            agent.targetX = cx - (cols * CELL_SIZE) / 2 + col * (CELL_SIZE + GAP);
            agent.targetY = cy - (cols * CELL_SIZE) / 2 + row * (CELL_SIZE + GAP);
          });
        } else if (currentFormation === 'search') {
          if (Math.random() > 0.98) {
            agentsRef.current.forEach(agent => {
              if (Math.random() > 0.8) {
                agent.targetX = Math.random() * (width - 100) + 50;
                agent.targetY = Math.random() * (height - 100) + 50;
              }
            });
          }
        } else if (currentFormation === 'shield') {
          const cols = 16;
          const totalW = cols * (CELL_SIZE + GAP);
          agentsRef.current.forEach((agent, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            agent.targetX = cx - totalW / 2 + col * (CELL_SIZE + GAP);
            agent.targetY = cy + row * (CELL_SIZE + GAP);
          });
        } else if (currentFormation === 'strike') {
          agentsRef.current.forEach((agent, i) => {
            const row = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            if (i === 0) { agent.targetX = cx; agent.targetY = cy - 100; }
            else {
              agent.targetX = cx + (side * row * (CELL_SIZE + GAP));
              agent.targetY = (cy - 100) + (row * (CELL_SIZE + GAP));
            }
          });
        }
      } else {
        const dx = activeHostile.x - cx;
        const dy = activeHostile.y - cy;
        const angle = Math.atan2(dy, dx);
        if (currentFormation === 'search') {
          agentsRef.current.forEach((agent, i) => {
            const d2h = Math.sqrt(Math.pow(agent.x - activeHostile.x, 2) + Math.pow(agent.y - activeHostile.y, 2));
            if (d2h < 300) {
              agent.targetX = activeHostile.x + Math.cos(i) * 80;
              agent.targetY = activeHostile.y + Math.sin(i) * 80;
            }
          });
        } else if (currentFormation === 'shield') {
          const wallDist = 150;
          const wx = cx + Math.cos(angle) * wallDist;
          const wy = cy + Math.sin(angle) * wallDist;
          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);
          agentsRef.current.forEach((agent, i) => {
            const offset = (i - AGENT_COUNT / 2) * (CELL_SIZE / 1.5);
            agent.targetX = wx + perpX * offset;
            agent.targetY = wy + perpY * offset;
          });
        } else if (currentFormation === 'strike') {
          agentsRef.current.forEach((agent, i) => {
            const attackAngle = (i / AGENT_COUNT) * Math.PI * 2 * 2;
            const radiusOffset = (i % 2) * 30;
            const attackDist = 80 + radiusOffset + Math.sin(Date.now() / 100) * 5;
            agent.targetX = activeHostile.x + Math.cos(attackAngle) * attackDist;
            agent.targetY = activeHostile.y + Math.sin(attackAngle) * attackDist;
          });
        }
      }

      // 2. Physics & Agent Canvas Updates
      agentsRef.current.forEach((agent, i) => {
        const adx = agent.targetX - agent.x;
        const ady = agent.targetY - agent.y;
        agent.x += adx * 0.08 * speedMultiplier;
        agent.y += ady * 0.08 * speedMultiplier;

        const el = agentDomsRef.current[i];
        if (el) {
          // Snap to grid for pixel-perfect look
          const sx = Math.round(agent.x - CELL_SIZE / 2);
          const sy = Math.round(agent.y - CELL_SIZE / 2);
          el.style.transform = `translate(${sx}px, ${sy}px)`;

          // Redraw pixel pattern based on formation
          const nodeId = KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id;
          const isSelected = !!(selectedNode && nodeId === selectedNode.id);
          const isRelated = !!(selectedNode && GRAPH_RELATIONSHIPS.some(r =>
            (r.source === selectedNode.id && r.target === nodeId) ||
            (r.target === selectedNode.id && r.source === nodeId)
          ));
          drawAgentPixels(el, currentFormation, isSelected, isRelated);
        }
      });

      // Hostiles
      hostilesRef.current.forEach(h => {
        const hdx = h.targetX - h.x;
        const hdy = h.targetY - h.y;
        if (Math.abs(hdx) < 10 && Math.abs(hdy) < 10) {
          h.targetX = Math.random() * (width - 100) + 50;
          h.targetY = Math.random() * (height - 100) + 50;
        }
        h.x += hdx * 0.02;
        h.y += hdy * 0.02;

        const el = hostileDomsRef.current.get(h.id);
        if (el) {
          const hsx = Math.round(h.x - CELL_SIZE / 2);
          const hsy = Math.round(h.y - CELL_SIZE / 2);
          el.style.transform = `translate(${hsx}px, ${hsy}px)`;

          // Draw hostile pattern
          const hCtx = el.getContext('2d');
          if (hCtx) {
            hCtx.clearRect(0, 0, el.width, el.height);
            hCtx.fillStyle = '#FF0000';
            const pat = AGENT_PATTERNS.hostile;
            for (let py = 0; py < 5; py++) {
              for (let px = 0; px < 5; px++) {
                if (pat[py * 5 + px]) hCtx.fillRect(px * 2, py * 2, 2, 2);
              }
            }
          }

          if (currentFormation === 'strike') {
            lockOnTimerRef.current += 1;
            if (netCtx) {
              const progress = Math.min(lockOnTimerRef.current / 180, 1);
              // Pixelated lock-on: draw squares instead of circles
              netCtx.strokeStyle = '#FF0000';
              netCtx.lineWidth = 2;
              const size = 40 * (1 - progress) + 10;
              netCtx.strokeRect(h.x - size, h.y - size, size * 2, size * 2);

              // Targeting crosshair
              netCtx.beginPath();
              netCtx.moveTo(h.x - size - 5, h.y);
              netCtx.lineTo(h.x + size + 5, h.y);
              netCtx.moveTo(h.x, h.y - size - 5);
              netCtx.lineTo(h.x, h.y + size + 5);
              netCtx.stroke();
            }
            if (lockOnTimerRef.current > 180) {
              hostilesRef.current = hostilesRef.current.filter(x => x.id !== h.id);
              setRenderHostiles([...hostilesRef.current]);
              lockOnTimerRef.current = 0;
              onLog("EFFECT ON TARGET. Hostile Neutralized.", "success");
              onStatsUpdate({ threatLevel: 'neutralized' });
              setTimeout(() => onStatsUpdate({ threatLevel: 'low' }), 2000);
            }
          } else {
            lockOnTimerRef.current = 0;
          }
        }
      });

      if (hostilesRef.current.length !== renderHostiles.length) {
        setRenderHostiles([...hostilesRef.current]);
      }

      // 3. Draw Network
      if (netCtx) {
        netCtx.clearRect(0, 0, width, height);

        // Mouse coordinate readout
        const mx = mousePos.current.x;
        const my = mousePos.current.y;
        if (mx > 0 && my > 0 && mx < width && my < height) {
          netCtx.fillStyle = 'rgba(0,0,0,0.4)';
          netCtx.font = '9px monospace';
          netCtx.fillText(
            `X:${Math.floor(mx).toString(16).toUpperCase().padStart(3,'0')} Y:${Math.floor(my).toString(16).toUpperCase().padStart(3,'0')}`,
            width - 90, height - 8
          );
        }

        // Agent count indicator
        netCtx.fillStyle = 'rgba(0,0,0,0.25)';
        netCtx.font = '9px monospace';
        netCtx.fillText(`AGENTS:${AGENT_COUNT} NET:${networkStatusRef.current.toUpperCase()} FRM:${currentFormation.toUpperCase()}`, 4, height - 8);

        if (networkStatusRef.current !== 'jammed') {
          netCtx.beginPath();
          const alpha = networkStatusRef.current === 'local' ? 0.5 : 0.15;
          netCtx.strokeStyle = `rgba(0,0,0,${alpha * linkOpacity})`;
          netCtx.lineWidth = networkStatusRef.current === 'local' ? 2 : 1;

          const boundary = new Rectangle(width / 2, height / 2, width, height);
          const qt = new QuadTree(boundary, 4);
          agentsRef.current.forEach(agent => {
            qt.insert({ x: agent.x, y: agent.y, userData: agent });
          });

          agentsRef.current.forEach(agent => {
            const range = new Rectangle(agent.x, agent.y, CONNECTION_DIST, CONNECTION_DIST);
            const neighbors = qt.query(range);
            for (const p of neighbors) {
              const other = p.userData as Agent;
              if (agent.id < other.id) {
                const dist = Math.sqrt(Math.pow(agent.x - other.x, 2) + Math.pow(agent.y - other.y, 2));
                if (dist < CONNECTION_DIST) {
                  const linkId = agent.id * 1000 + other.id;
                  const j = getSmoothedVec2(linkId, totalJitter, 0.2);
                  // Stepped/pixelated lines: snap to integer coords
                  netCtx.moveTo(Math.round(agent.x + j.x) + 0.5, Math.round(agent.y + j.y) + 0.5);
                  netCtx.lineTo(Math.round(other.x + j.x) + 0.5, Math.round(other.y + j.y) + 0.5);
                }
              }
            }
          });
          netCtx.stroke();

          // Strike Lines
          if (activeHostile && currentFormation === 'strike') {
            netCtx.beginPath();
            netCtx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            netCtx.setLineDash([2, 2]);
            agentsRef.current.forEach(a => {
              netCtx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5);
              netCtx.lineTo(Math.round(activeHostile.x) + 0.5, Math.round(activeHostile.y) + 0.5);
            });
            netCtx.stroke();
            netCtx.setLineDash([]);
          }

          // Semantic Relationships
          GRAPH_RELATIONSHIPS.forEach(edge => {
            const sourceIndices = nodeToAgentsMap.current.get(edge.source) || [];
            const targetIndices = nodeToAgentsMap.current.get(edge.target) || [];
            const sourceAgents = sourceIndices.map(i => agentsRef.current[i]);
            const targetAgents = targetIndices.map(i => agentsRef.current[i]);
            const isSelectedRelationship = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

            sourceAgents.forEach(sa => {
              targetAgents.forEach(ta => {
                const sdx = sa.x - ta.x;
                const sdy = sa.y - ta.y;
                const distSq = sdx * sdx + sdy * sdy;
                const maxDist = isSelectedRelationship ? 1000 : 250;

                if (distSq < maxDist * maxDist) {
                  netCtx.beginPath();
                  const semanticId = 50000 + (sa.id * 100 + ta.id);
                  const j = getSmoothedVec2(semanticId, totalJitter, 0.15);

                  if (isSelectedRelationship) {
                    netCtx.strokeStyle = 'rgba(0, 0, 128, 0.7)';
                    netCtx.lineWidth = 2;
                    netCtx.setLineDash([3, 3]);
                    if (Math.random() > 0.92) {
                      packetsRef.current.push({
                        x: sa.x, y: sa.y, tx: ta.x, ty: ta.y,
                        age: 0, maxAge: 30 + Math.random() * 20
                      });
                    }
                  } else {
                    netCtx.strokeStyle = 'rgba(0, 0, 128, 0.1)';
                    netCtx.lineWidth = 1;
                    netCtx.setLineDash([1, 3]);
                  }

                  netCtx.moveTo(Math.round(sa.x + j.x) + 0.5, Math.round(sa.y + j.y) + 0.5);
                  netCtx.lineTo(Math.round(ta.x + j.x) + 0.5, Math.round(ta.y + j.y) + 0.5);
                  netCtx.stroke();

                  if (isSelectedRelationship || (distSq < 100 * 100 && Math.random() > 0.98)) {
                    netCtx.fillStyle = isSelectedRelationship ? 'rgba(0,0,128,0.6)' : 'rgba(0,0,0,0.3)';
                    netCtx.font = isSelectedRelationship ? 'bold 8px monospace' : '7px monospace';
                    netCtx.fillText(edge.label.toUpperCase(), (sa.x + ta.x) / 2 + j.x, (sa.y + ta.y) / 2 + j.y);
                  }
                }
              });
            });
            netCtx.setLineDash([]);
          });

          // Draw Packets as 3x3 pixel squares
          packetsRef.current = packetsRef.current.filter(p => {
            p.age++;
            if (p.age > p.maxAge) return false;
            const progress = p.age / p.maxAge;
            const curX = Math.round(p.x + (p.tx - p.x) * progress);
            const curY = Math.round(p.y + (p.ty - p.y) * progress);
            netCtx.fillStyle = '#000080';
            netCtx.fillRect(curX - 1, curY - 1, 3, 3);
            return true;
          });
        }
      }

      // 4. Draw Sensors
      if (sensorCtx) {
        sensorCtx.clearRect(0, 0, width, height);
        let revealedCount = 0;
        sensorGridRef.current.forEach(point => {
          if (!point.revealed) {
            for (const agent of agentsRef.current) {
              const d = Math.sqrt(Math.pow(agent.x - point.x, 2) + Math.pow(agent.y - point.y, 2));
              if (d < 80) point.revealed = true;
            }
          }
          if (point.revealed) revealedCount++;
          // Pixel-perfect sensor dots
          sensorCtx.fillStyle = point.revealed ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.08)';
          const dotSize = point.revealed ? 3 : 1;
          sensorCtx.fillRect(Math.round(point.x) - Math.floor(dotSize/2), Math.round(point.y) - Math.floor(dotSize/2), dotSize, dotSize);
        });

        if (animationFrameRef.current % 60 === 0) {
          const coverage = Math.floor((revealedCount / sensorGridRef.current.length) * 100);
          onStatsUpdate({ coverage });
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [onStatsUpdate, onLog, renderHostiles, drawGrid, drawAgentPixels]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#FFFFFF] overflow-hidden cursor-crosshair">
      <ScanlineOverlay trustPhase={trustPhase} />
      <canvas ref={gridCanvasRef} className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none" />
      <canvas ref={sensorCanvasRef} className="absolute top-0 left-0 w-full h-full z-[1] opacity-50 pointer-events-none" />
      <canvas ref={netCanvasRef} className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none" />

      {/* Agents as tiny pixel-art canvases */}
      {Array.from({ length: AGENT_COUNT }).map((_, i) => (
        <canvas
          key={i}
          ref={el => { agentDomsRef.current[i] = el; }}
          width={10}
          height={10}
          onMouseDown={(e) => handleMouseDown(e, i)}
          className="absolute top-0 left-0 z-20 cursor-move image-rendering-pixelated hover:outline hover:outline-1 hover:outline-[#0000FF] hover:z-50"
          style={{ imageRendering: 'pixelated', width: CELL_SIZE, height: CELL_SIZE }}
        />
      ))}

      {/* Hostiles as pixel-art canvases */}
      {renderHostiles.map((h) => (
        <canvas
          key={h.id}
          ref={el => {
            if (el) hostileDomsRef.current.set(h.id, el);
            else hostileDomsRef.current.delete(h.id);
          }}
          width={10}
          height={10}
          className="absolute top-0 left-0 z-30 animate-pulse"
          style={{ imageRendering: 'pixelated', width: CELL_SIZE, height: CELL_SIZE }}
        />
      ))}
    </div>
  );
});

MainStage.displayName = 'MainStage';
