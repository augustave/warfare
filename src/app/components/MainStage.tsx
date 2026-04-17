import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Budgets, KnowledgeNode, FormationType, SimulationStats } from '../types';
import { QuadTree, Rectangle } from '../utils/QuadTree';
import { KNOWLEDGE_BASE, GRAPH_RELATIONSHIPS } from '../data';
import { clsx } from 'clsx';
import { ScanlineOverlay } from './ScanlineOverlay';
import { getSmoothedVec2 } from '../utils/noise';

const AGENT_COUNT = 64;
const CELL = 12;
const GAP = 3;
const CONNECTION_DIST = 120;
const BEAM_WIDTH = 3;

// Callsign abbreviation table
const CALLSIGNS: Record<string, string> = {
  '01': 'AGNT', '02': 'ATTR', '03': 'REPL', '04': 'HIVE',
  '05': 'LTCE', '06': 'FLSH', '07': 'GSHK', '08': 'DCSN',
  '09': 'INTL', '10': 'D3K9', '11': 'SRNC', '12': 'MSAL',
  '13': 'VNVR', '14': 'MACH', '15': 'CSUA', '16': 'SENS',
};

const COMPASS = [
  { deg: 0, label: 'N' }, { deg: 45, label: 'NE' }, { deg: 90, label: 'E' },
  { deg: 135, label: 'SE' }, { deg: 180, label: 'S' }, { deg: 225, label: 'SW' },
  { deg: 270, label: 'W' }, { deg: 315, label: 'NW' },
];

// Disclosure grammar: Platform and Risk nodes are always labeled.
// Selection reveals 1-hop graph neighbors. Hover reveals singles.
const ALWAYS_LABELED = new Set(
  Object.values(KNOWLEDGE_BASE)
    .filter(n => n.type === 'Platform' || n.type === 'Risk')
    .map(n => n.id)
);

// Unified HUD typography — single 9px bold weight for all canvas-rendered labels.
// LG reserved for data-block headers (callsigns, TGT-XXX).
const HUD_FONT = 'bold 9px Helvetica, Arial, sans-serif';
const HUD_FONT_LG = 'bold 10px Helvetica, Arial, sans-serif';

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

interface Agent { id: number; x: number; y: number; targetX: number; targetY: number; }
interface Hostile { id: number; x: number; y: number; targetX: number; targetY: number; lockedOn?: boolean; }
interface SensorPoint { x: number; y: number; revealed: boolean; }

export const MainStage = forwardRef<MainStageHandle, MainStageProps>(({
  formation, selectedNode, onAgentClick, onStatsUpdate, onLog, trust, budgets
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sensorCanvasRef = useRef<HTMLCanvasElement>(null);
  const netCanvasRef = useRef<HTMLCanvasElement>(null);

  const trustPhase = trust >= 85 ? 'green' : trust >= 70 ? 'yellow' : trust >= 50 ? 'orange' : 'red';

  const energyFactor = budgets ? budgets.energy / 100 : 1;
  const speedMultiplier = energyFactor < 0.4 ? 0.5 : 1.0;
  const bandwidthFactor = budgets ? budgets.bandwidth / 100 : 1;
  const linkOpacity = bandwidthFactor < 0.4 ? 0.3 : 1.0;
  const latencyFactor = budgets ? budgets.latency / 100 : 1;
  const latencyJitter = latencyFactor < 0.4 ? 2 : 0;
  const trustJitter = trustPhase === 'green' ? 0 : trustPhase === 'yellow' ? 0.5 : trustPhase === 'orange' ? 2 : 5;
  const totalJitter = trustJitter + latencyJitter;

  const agentDomsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hostileDomsRef = useRef<Map<number, HTMLDivElement>>(new Map());

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
  const startTimeRef = useRef(Date.now());
  const coverageRef = useRef(0);

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
    if (hostilesRef.current.length > 0) onLog(`ROE: <${formation.toUpperCase()}>. Engaging target.`);
    else onLog(`Command: Formation <${formation.toUpperCase()}>`);
  }, [formation, onLog]);

  useImperativeHandle(ref, () => ({
    spawnHostile: () => {
      if (hostilesRef.current.length > 0) return;
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const startX = Math.random() > 0.5 ? 20 : width - 20;
      const startY = Math.random() * height;
      hostilesRef.current.push({ id: Date.now(), x: startX, y: startY, targetX: width / 2, targetY: height / 2 });
      onLog("ALERT: UNIDENTIFIED SIGNATURE DETECTED.", "alert");
      onStatsUpdate({ threatLevel: 'elevated' });
    },
    triggerJamming: () => {
      onLog("WARNING: RF SPECTRUM JAMMING DETECTED.", "alert");
      networkStatusRef.current = 'jammed';
      onStatsUpdate({ networkStatus: 'jammed' });
      agentsRef.current.forEach(a => { a.targetX += (Math.random() - 0.5) * 300; a.targetY += (Math.random() - 0.5) * 300; });
      setTimeout(() => { onLog("Edge Compute... Local mesh."); networkStatusRef.current = 'local'; onStatsUpdate({ networkStatus: 'local' }); }, 2500);
      setTimeout(() => { networkStatusRef.current = 'nominal'; onStatsUpdate({ networkStatus: 'nominal' }); onLog("Spectrum clear."); }, 8000);
    },
    triggerFlashWar: () => {
      onLog("CRITICAL: Adversarial AI escalation.", "alert");
      onStatsUpdate({ threatLevel: 'critical' });
      if (containerRef.current) {
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          if (!containerRef.current) return;
          containerRef.current.style.backgroundColor = flashCount % 2 === 0 ? '#000' : '';
          flashCount++;
          if (flashCount > 5) {
            clearInterval(flashInterval);
            containerRef.current.style.backgroundColor = '';
            onLog("De-escalation. Human-in-the-loop required.");
            if (hostilesRef.current.length > 0) { hostilesRef.current = []; setRenderHostiles([]); }
            onStatsUpdate({ threatLevel: 'low' });
          }
        }, 200);
      }
      const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
      const newHostile: Hostile = { id: Date.now(), x: Math.random() > 0.5 ? 20 : width - 20, y: Math.random() * height, targetX: width / 2, targetY: height / 2 };
      hostilesRef.current.push(newHostile);
      setRenderHostiles([newHostile]);
    }
  }));

  const [renderHostiles, setRenderHostiles] = useState<Hostile[]>([]);
  useEffect(() => {}, [renderHostiles]);

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    draggingRef.current = { id, startX: e.clientX, startY: e.clientY };
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
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  // ═══════════════════════════════════════════
  // HUD DRAWING FUNCTIONS
  // ═══════════════════════════════════════════

  const drawRangeRings = (ctx: CanvasRenderingContext2D, cx: number, cy: number, maxR: number) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.font = HUD_FONT;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let r = 100; r < maxR; r += 100) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`R${r}`, cx + r - 20, cy - 4);
    }
    ctx.setLineDash([]);
    // Center crosshair
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
    ctx.stroke();
  };

  const drawCompass = (ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.font = HUD_FONT;
    const pad = 14;
    const tickLen = 6;

    for (const { deg, label } of COMPASS) {
      const rad = (deg - 90) * Math.PI / 180; // 0° = top
      // Tick on edge
      const edgeX = cx + Math.cos(rad) * Math.max(cx, cy);
      const edgeY = cy + Math.sin(rad) * Math.max(cx, cy);
      // Clamp to viewport edges
      let tx = Math.max(pad, Math.min(w - pad, edgeX));
      let ty = Math.max(pad, Math.min(h - pad, edgeY));

      // Draw tick mark
      const inX = Math.cos(rad + Math.PI) * tickLen;
      const inY = Math.sin(rad + Math.PI) * tickLen;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + inX, ty + inY);
      ctx.stroke();

      // Label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${deg}°${label}`, tx + inX * 2.5, ty + inY * 2.5);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  };

  const drawGridCoords = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.font = HUD_FONT;

    // Vertical grid lines + labels along top
    for (let x = 100; x < w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillText(String(x / 100), x + 2, 10);
    }
    // Horizontal grid lines + labels along left
    for (let y = 100; y < h; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillText(String(y / 100), 3, y - 2);
    }
  };

  const drawVelocityVectors = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    agentsRef.current.forEach(a => {
      const dx = a.targetX - a.x;
      const dy = a.targetY - a.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 5) { // Only show when moving
        const nx = dx / mag;
        const ny = dy / mag;
        const vLen = Math.min(mag * 0.3, 20); // Scale with speed, cap at 20px
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + nx * vLen, a.y + ny * vLen);
        ctx.stroke();
      }
    });
  };

  const drawCornerHUD = (ctx: CanvasRenderingContext2D, w: number, h: number, currentFormation: string) => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    ctx.font = HUD_FONT;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';

    // Top-left: Formation + Agent count
    const tl = [
      `FRM: ${currentFormation.toUpperCase()}`,
      `AGT: ${AGENT_COUNT}`,
      `NET: ${networkStatusRef.current.toUpperCase()}`,
    ];
    tl.forEach((line, i) => ctx.fillText(line, 12, 22 + i * 13));

    // Top-right: Coverage + Trust
    ctx.textAlign = 'right';
    const tr = [
      `COV: ${coverageRef.current}%`,
      `TRS: ${Math.floor(trust)}%`,
      `THR: ${hostilesRef.current.length > 0 ? 'ELEVATED' : 'LOW'}`,
    ];
    tr.forEach((line, i) => ctx.fillText(line, w - 12, 22 + i * 13));

    // Bottom-right: Mouse pos + elapsed
    const br = [
      `POS: ${Math.floor(mousePos.current.x)},${Math.floor(mousePos.current.y)}`,
      `T+${elapsed}S`,
    ];
    br.forEach((line, i) => ctx.fillText(line, w - 12, h - 20 + i * 13));
    ctx.textAlign = 'left';

    // Bottom-left: Large formation watermark (already in original, enhanced)
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.font = 'bold 72px Helvetica, Arial, sans-serif';
    ctx.fillText(currentFormation.toUpperCase(), 12, h - 10);
  };

  const drawHostileDataBlock = (ctx: CanvasRenderingContext2D, h: Hostile, cx: number, cy: number, currentFormation: string) => {
    const dx = h.x - cx;
    const dy = h.y - cy;
    const range = Math.floor(Math.sqrt(dx * dx + dy * dy));
    const bearing = Math.floor(((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360);
    const lockProgress = currentFormation === 'strike' ? Math.min(lockOnTimerRef.current / 180, 1) : 0;

    // Position data block offset from hostile
    const blockX = h.x + 20;
    const blockY = h.y - 40;

    // Leader line
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h.x + CELL / 2, h.y - CELL / 2);
    ctx.lineTo(blockX, blockY + 12);
    ctx.stroke();

    // Data block background
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(blockX - 2, blockY - 10, 80, currentFormation === 'strike' ? 52 : 40);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(blockX - 2, blockY - 10, 80, currentFormation === 'strike' ? 52 : 40);

    // Data text
    ctx.fillStyle = '#000';
    ctx.font = HUD_FONT_LG;
    ctx.fillText('TGT-001', blockX + 2, blockY + 2);
    ctx.font = HUD_FONT;
    ctx.fillText(`BRG ${String(bearing).padStart(3, '0')}°`, blockX + 2, blockY + 14);
    ctx.fillText(`RNG ${range}`, blockX + 2, blockY + 26);

    if (currentFormation === 'strike') {
      const pct = Math.floor(lockProgress * 100);
      ctx.fillStyle = lockProgress >= 1 ? '#000' : 'rgba(0,0,0,0.6)';
      ctx.font = HUD_FONT;
      ctx.fillText(`LCK ${pct}%`, blockX + 2, blockY + 38);
      // Lock bar
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(blockX + 44, blockY + 30, 30, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(blockX + 44, blockY + 30, 30 * lockProgress, 8);
    }
  };

  const drawSelectedAgentBlock = (ctx: CanvasRenderingContext2D, agent: Agent, nodeId: string) => {
    const node = KNOWLEDGE_BASE.find(n => n.id === nodeId);
    if (!node) return;

    const callsign = CALLSIGNS[nodeId] || nodeId;
    const relCount = GRAPH_RELATIONSHIPS.filter(r => r.source === nodeId || r.target === nodeId).length;

    // Block position: offset to right
    const blockX = agent.x + 22;
    const blockY = agent.y - 8;

    // Leader line
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(agent.x + CELL / 2, agent.y);
    ctx.lineTo(blockX, blockY + 6);
    ctx.stroke();

    // Data block
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(blockX - 2, blockY - 8, 120, 44);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(blockX - 2, blockY - 8, 120, 44);

    ctx.fillStyle = '#000';
    ctx.font = HUD_FONT_LG;
    ctx.fillText(`${nodeId} ${callsign}`, blockX + 2, blockY + 4);
    ctx.font = HUD_FONT;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(node.title.toUpperCase().slice(0, 18), blockX + 2, blockY + 16);
    ctx.fillText(`TYPE: ${node.type.toUpperCase()}`, blockX + 2, blockY + 28);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(`REL: ${relCount}`, blockX + 82, blockY + 28);
  };

  const drawThreatArc = (ctx: CanvasRenderingContext2D, hostile: Hostile, cx: number, cy: number, w: number, h: number) => {
    const dx = hostile.x - cx;
    const dy = hostile.y - cy;
    const angle = Math.atan2(dy, dx);
    const maxR = Math.max(w, h) * 0.45;

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, angle - 0.4, angle + 0.4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Threat direction label
    const labelR = maxR + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = HUD_FONT;
    ctx.fillText('THREAT', cx + Math.cos(angle) * labelR - 16, cy + Math.sin(angle) * labelR);
  };

  // Draw agent callsign on canvas near agent (for visible agents only)
  const drawAgentCallsign = (ctx: CanvasRenderingContext2D, agent: Agent, nodeId: string, isSelected: boolean, isRelated: boolean) => {
    const callsign = CALLSIGNS[nodeId] || nodeId;
    ctx.font = HUD_FONT;
    ctx.fillStyle = isSelected ? 'rgba(0,0,0,0.85)' : isRelated ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
    ctx.fillText(`${nodeId}`, agent.x + CELL / 2 + 3, agent.y - 1);
    if (isSelected || isRelated) {
      ctx.fillText(callsign, agent.x + CELL / 2 + 3, agent.y + 9);
    }
  };

  // Main Game Loop
  useEffect(() => {
    const initSensors = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const spacing = 50;
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      const newGrid: SensorPoint[] = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        newGrid.push({ x: i * spacing + spacing / 2, y: j * spacing + spacing / 2, revealed: false });
      }
      sensorGridRef.current = newGrid;
    };

    const resize = () => {
      if (containerRef.current && sensorCanvasRef.current && netCanvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        sensorCanvasRef.current.width = width; sensorCanvasRef.current.height = height;
        netCanvasRef.current.width = width; netCanvasRef.current.height = height;
        initSensors();
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

      // 1. Update Targets
      if (!activeHostile) {
        if (currentFormation === 'idle') {
          const cols = 8;
          agentsRef.current.forEach((a, i) => {
            a.targetX = cx - (cols * CELL) / 2 + (i % cols) * (CELL + GAP);
            a.targetY = cy - (cols * CELL) / 2 + Math.floor(i / cols) * (CELL + GAP);
          });
        } else if (currentFormation === 'search') {
          if (Math.random() > 0.98) agentsRef.current.forEach(a => {
            if (Math.random() > 0.8) { a.targetX = Math.random() * (width - 100) + 50; a.targetY = Math.random() * (height - 100) + 50; }
          });
        } else if (currentFormation === 'shield') {
          const cols = 16;
          const totalW = cols * (CELL + GAP);
          agentsRef.current.forEach((a, i) => {
            a.targetX = cx - totalW / 2 + (i % cols) * (CELL + GAP);
            a.targetY = cy + Math.floor(i / cols) * (CELL + GAP);
          });
        } else if (currentFormation === 'strike') {
          agentsRef.current.forEach((a, i) => {
            const row = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            if (i === 0) { a.targetX = cx; a.targetY = cy - 100; }
            else { a.targetX = cx + (side * row * (CELL + GAP)); a.targetY = (cy - 100) + (row * (CELL + GAP)); }
          });
        }
      } else {
        const dx = activeHostile.x - cx;
        const dy = activeHostile.y - cy;
        const angle = Math.atan2(dy, dx);
        if (currentFormation === 'search') {
          agentsRef.current.forEach((a, i) => {
            const d2h = Math.sqrt((a.x - activeHostile.x) ** 2 + (a.y - activeHostile.y) ** 2);
            if (d2h < 300) { a.targetX = activeHostile.x + Math.cos(i) * 80; a.targetY = activeHostile.y + Math.sin(i) * 80; }
          });
        } else if (currentFormation === 'shield') {
          const wallDist = 150;
          const wx = cx + Math.cos(angle) * wallDist;
          const wy = cy + Math.sin(angle) * wallDist;
          agentsRef.current.forEach((a, i) => {
            const offset = (i - AGENT_COUNT / 2) * (CELL / 1.5);
            a.targetX = wx + (-Math.sin(angle)) * offset;
            a.targetY = wy + Math.cos(angle) * offset;
          });
        } else if (currentFormation === 'strike') {
          agentsRef.current.forEach((a, i) => {
            const aa = (i / AGENT_COUNT) * Math.PI * 4;
            const rad = 80 + (i % 2) * 30 + Math.sin(Date.now() / 100) * 5;
            a.targetX = activeHostile.x + Math.cos(aa) * rad;
            a.targetY = activeHostile.y + Math.sin(aa) * rad;
          });
        }
      }

      // 2. Physics + DOM
      agentsRef.current.forEach((a, i) => {
        a.x += (a.targetX - a.x) * 0.08 * speedMultiplier;
        a.y += (a.targetY - a.y) * 0.08 * speedMultiplier;
        const el = agentDomsRef.current[i];
        if (el) el.style.transform = `translate(${Math.round(a.x - CELL / 2)}px, ${Math.round(a.y - CELL / 2)}px)`;
      });

      hostilesRef.current.forEach(h => {
        const hdx = h.targetX - h.x;
        const hdy = h.targetY - h.y;
        if (Math.abs(hdx) < 10 && Math.abs(hdy) < 10) { h.targetX = Math.random() * (width - 100) + 50; h.targetY = Math.random() * (height - 100) + 50; }
        h.x += hdx * 0.02; h.y += hdy * 0.02;
        const el = hostileDomsRef.current.get(h.id);
        if (el) {
          el.style.transform = `translate(${Math.round(h.x - CELL / 2)}px, ${Math.round(h.y - CELL / 2)}px)`;
          if (currentFormation === 'strike') {
            lockOnTimerRef.current += 1;
            if (netCtx) {
              const progress = Math.min(lockOnTimerRef.current / 180, 1);
              const sz = 50 * (1 - progress) + 10;
              netCtx.strokeStyle = '#000'; netCtx.lineWidth = 4;
              netCtx.strokeRect(h.x - sz, h.y - sz, sz * 2, sz * 2);
              netCtx.beginPath();
              netCtx.moveTo(h.x - sz - 8, h.y); netCtx.lineTo(h.x + sz + 8, h.y);
              netCtx.moveTo(h.x, h.y - sz - 8); netCtx.lineTo(h.x, h.y + sz + 8);
              netCtx.stroke();
            }
            if (lockOnTimerRef.current > 180) {
              hostilesRef.current = hostilesRef.current.filter(x => x.id !== h.id);
              setRenderHostiles([...hostilesRef.current]);
              lockOnTimerRef.current = 0;
              onLog("EFFECT ON TARGET. Neutralized.", "success");
              onStatsUpdate({ threatLevel: 'neutralized' });
              setTimeout(() => onStatsUpdate({ threatLevel: 'low' }), 2000);
            }
          } else { lockOnTimerRef.current = 0; }
        }
      });
      if (hostilesRef.current.length !== renderHostiles.length) setRenderHostiles([...hostilesRef.current]);

      // 3. Network Canvas — HUD + connections + data
      if (netCtx) {
        netCtx.clearRect(0, 0, width, height);

        // ── HUD LAYER: Grid, Range Rings, Compass ──
        drawGridCoords(netCtx, width, height);
        drawRangeRings(netCtx, cx, cy, Math.max(width, height) * 0.5);
        drawCompass(netCtx, width, height, cx, cy);
        drawVelocityVectors(netCtx);
        drawCornerHUD(netCtx, width, height, currentFormation);

        // ── THREAT LAYER ──
        if (activeHostile) {
          drawThreatArc(netCtx, activeHostile, cx, cy, width, height);
          drawHostileDataBlock(netCtx, activeHostile, cx, cy, currentFormation);
        }

        // ── NETWORK LAYER ──
        if (networkStatusRef.current !== 'jammed') {
          const alpha = networkStatusRef.current === 'local' ? 0.6 : 0.25;
          netCtx.strokeStyle = `rgba(0,0,0,${alpha * linkOpacity})`;
          netCtx.lineWidth = BEAM_WIDTH;
          netCtx.beginPath();

          const boundary = new Rectangle(width / 2, height / 2, width, height);
          const qt = new QuadTree(boundary, 4);
          agentsRef.current.forEach(a => qt.insert({ x: a.x, y: a.y, userData: a }));

          agentsRef.current.forEach(a => {
            const range = new Rectangle(a.x, a.y, CONNECTION_DIST, CONNECTION_DIST);
            const neighbors = qt.query(range);
            for (const p of neighbors) {
              const other = p.userData as Agent;
              if (a.id < other.id) {
                const dist = Math.sqrt((a.x - other.x) ** 2 + (a.y - other.y) ** 2);
                if (dist < CONNECTION_DIST) {
                  const linkId = a.id * 1000 + other.id;
                  const j = getSmoothedVec2(linkId, totalJitter, 0.2);
                  netCtx.moveTo(Math.round(a.x + j.x), Math.round(a.y + j.y));
                  netCtx.lineTo(Math.round(other.x + j.x), Math.round(other.y + j.y));
                }
              }
            }
          });
          netCtx.stroke();

          // Strike lines
          if (activeHostile && currentFormation === 'strike') {
            netCtx.strokeStyle = 'rgba(0,0,0,0.15)'; netCtx.lineWidth = 1;
            netCtx.beginPath();
            agentsRef.current.forEach(a => { netCtx.moveTo(a.x, a.y); netCtx.lineTo(activeHostile.x, activeHostile.y); });
            netCtx.stroke();
          }

          // Semantic links
          GRAPH_RELATIONSHIPS.forEach(edge => {
            const sI = nodeToAgentsMap.current.get(edge.source) || [];
            const tI = nodeToAgentsMap.current.get(edge.target) || [];
            const sA = sI.map(i => agentsRef.current[i]);
            const tA = tI.map(i => agentsRef.current[i]);
            const isSel = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

            sA.forEach(sa => {
              tA.forEach(ta => {
                const dSq = (sa.x - ta.x) ** 2 + (sa.y - ta.y) ** 2;
                const maxD = isSel ? 1000 : 250;
                if (dSq < maxD * maxD) {
                  netCtx.beginPath();
                  const sid = 50000 + sa.id * 100 + ta.id;
                  const j = getSmoothedVec2(sid, totalJitter, 0.15);
                  if (isSel) {
                    netCtx.strokeStyle = 'rgba(0,0,0,0.7)'; netCtx.lineWidth = 4; netCtx.setLineDash([6, 4]);
                    if (Math.random() > 0.92) packetsRef.current.push({ x: sa.x, y: sa.y, tx: ta.x, ty: ta.y, age: 0, maxAge: 30 + Math.random() * 20 });
                  } else {
                    netCtx.strokeStyle = 'rgba(0,0,0,0.08)'; netCtx.lineWidth = 2; netCtx.setLineDash([2, 4]);
                  }
                  netCtx.moveTo(sa.x + j.x, sa.y + j.y); netCtx.lineTo(ta.x + j.x, ta.y + j.y);
                  netCtx.stroke();
                  if (isSel || (dSq < 100 * 100 && Math.random() > 0.98)) {
                    netCtx.fillStyle = isSel ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)';
                    netCtx.font = HUD_FONT;
                    netCtx.fillText(edge.label.toUpperCase(), (sa.x + ta.x) / 2 + j.x, (sa.y + ta.y) / 2 + j.y);
                  }
                }
              });
            });
            netCtx.setLineDash([]);
          });

          // Packets
          packetsRef.current = packetsRef.current.filter(p => {
            p.age++;
            if (p.age > p.maxAge) return false;
            const prog = p.age / p.maxAge;
            const px = p.x + (p.tx - p.x) * prog;
            const py = p.y + (p.ty - p.y) * prog;
            netCtx.fillStyle = '#000';
            netCtx.fillRect(px - 3, py - 3, 6, 6);
            return true;
          });
        }

        // ── AGENT CALLSIGN LAYER ──
        const nodeCount = Object.keys(KNOWLEDGE_BASE).length;
        agentsRef.current.forEach((agent, i) => {
          const nodeId = KNOWLEDGE_BASE[i % nodeCount]?.id;
          if (!nodeId) return;
          const isSelected = !!(selectedNode && nodeId === selectedNode.id);
          const isRelated = !!(selectedNode && GRAPH_RELATIONSHIPS.some(r =>
            (r.source === selectedNode.id && r.target === nodeId) ||
            (r.target === selectedNode.id && r.source === nodeId)
          ));

          // Semantic disclosure: selected/related get full callsign; Platform/Risk nodes always labeled; everything else is pure geometry.
          if (isSelected || isRelated) {
            drawAgentCallsign(netCtx, agent, nodeId, isSelected, isRelated);
          } else if (ALWAYS_LABELED.has(nodeId)) {
            netCtx.font = HUD_FONT;
            netCtx.fillStyle = 'rgba(0,0,0,0.4)';
            netCtx.fillText(CALLSIGNS[nodeId] || nodeId, agent.x + CELL / 2 + 3, agent.y + 3);
          }
        });

        // ── SELECTED AGENT DATA BLOCK ──
        if (selectedNode) {
          const selIndices = nodeToAgentsMap.current.get(selectedNode.id) || [];
          if (selIndices.length > 0) {
            const primaryAgent = agentsRef.current[selIndices[0]];
            if (primaryAgent) {
              drawSelectedAgentBlock(netCtx, primaryAgent, selectedNode.id);
            }
          }
        }
      }

      // 4. Sensors
      if (sensorCtx) {
        sensorCtx.clearRect(0, 0, width, height);
        let revealedCount = 0;
        sensorGridRef.current.forEach(point => {
          if (!point.revealed) {
            for (const a of agentsRef.current) {
              if (Math.sqrt((a.x - point.x) ** 2 + (a.y - point.y) ** 2) < 80) point.revealed = true;
            }
          }
          if (point.revealed) revealedCount++;
          sensorCtx.fillStyle = point.revealed ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)';
          const sz = point.revealed ? 4 : 2;
          sensorCtx.fillRect(Math.round(point.x) - sz / 2, Math.round(point.y) - sz / 2, sz, sz);
        });
        if (animationFrameRef.current % 60 === 0) {
          coverageRef.current = Math.floor((revealedCount / sensorGridRef.current.length) * 100);
          onStatsUpdate({ coverage: coverageRef.current });
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [onStatsUpdate, onLog, renderHostiles]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden cursor-crosshair">
      <ScanlineOverlay trustPhase={trustPhase} />
      <canvas ref={sensorCanvasRef} className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none" />
      <canvas ref={netCanvasRef} className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none" />

      {/* Agents — stark black squares */}
      {Array.from({ length: AGENT_COUNT }).map((_, i) => {
        const nodeId = KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id;
        const isSelected = !!(selectedNode && nodeId === selectedNode.id);
        const isRelated = !!(selectedNode && GRAPH_RELATIONSHIPS.some(r =>
          (r.source === selectedNode.id && r.target === nodeId) ||
          (r.target === selectedNode.id && r.source === nodeId)
        ));
        return (
          <div
            key={i}
            ref={el => { agentDomsRef.current[i] = el; }}
            onMouseDown={(e) => handleMouseDown(e, i)}
            className={clsx(
              "absolute top-0 left-0 z-20 cursor-move transition-colors duration-100",
              isSelected
                ? "bg-black outline outline-[3px] outline-black outline-offset-2 z-50"
                : isRelated
                  ? "bg-black outline outline-[2px] outline-black outline-offset-1 z-40"
                  : "bg-black hover:outline hover:outline-[2px] hover:outline-black hover:outline-offset-2 hover:z-50"
            )}
            style={{ width: CELL, height: CELL }}
          />
        );
      })}

      {/* Hostiles */}
      {renderHostiles.map((h) => (
        <div
          key={h.id}
          ref={el => { if (el) hostileDomsRef.current.set(h.id, el); else hostileDomsRef.current.delete(h.id); }}
          className="absolute top-0 left-0 z-30 bg-white border-[3px] border-black animate-blink"
          style={{ width: CELL, height: CELL }}
        />
      ))}
    </div>
  );
});

MainStage.displayName = 'MainStage';
