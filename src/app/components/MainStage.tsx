import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Budgets, KnowledgeNode, FormationType, SimulationStats } from '../types';
import { QuadTree, Rectangle } from '../utils/QuadTree';
import { KNOWLEDGE_BASE, GRAPH_RELATIONSHIPS } from '../data';
import { clsx } from 'clsx';
import { ScanlineOverlay } from './ScanlineOverlay';
import { getSmoothedVec2 } from '../utils/noise';

const AGENT_COUNT = 64;
const PIXEL_SIZE = 20;
const GAP = 4;
const CONNECTION_DIST  = 120;

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

  // Jitter Effect Factor based on Trust + Latency Budget
  const trustJitter = trustPhase === 'green' ? 0 : 
                       trustPhase === 'yellow' ? 0.5 :
                       trustPhase === 'orange' ? 2 : 5;
  
  const totalJitter = trustJitter + latencyJitter;
  
  // DOM Refs for direct manipulation
  const agentDomsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hostileDomsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Simulation State
  const agentsRef = useRef<Agent[]>([]);
  const hostilesRef = useRef<Hostile[]>([]);
  const sensorGridRef = useRef<SensorPoint[]>([]);
  const packetsRef = useRef<{x: number, y: number, tx: number, ty: number, age: number, maxAge: number}[]>([]); // Visual packets
  const draggingRef = useRef<{id: number, startX: number, startY: number} | null>(null);
  
  const lockOnTimerRef = useRef(0);
  const networkStatusRef = useRef<'nominal' | 'jammed' | 'local'>('nominal');
  const animationFrameRef = useRef<number>(0);
  const lastFormationRef = useRef<FormationType>(formation);

  // Pre-computed mapping: knowledge node ID -> agent indices (static, computed once)
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

  // Initialize Agents
  useEffect(() => {
    if (agentsRef.current.length === 0) {
      const cx = window.innerWidth / 2; // Approximate center initially
      const cy = window.innerHeight / 2;
      for (let i = 0; i < AGENT_COUNT; i++) {
        agentsRef.current.push({
          id: i,
          x: cx,
          y: cy,
          targetX: cx,
          targetY: cy
        });
      }
    }
  }, []);

  // Handle Formation Changes
  useEffect(() => {
    lastFormationRef.current = formation;
    if (hostilesRef.current.length > 0) {
      onLog(`ROE: <${formation.toUpperCase()}>. Engaging target.`);
    } else {
      onLog(`Command: Formation <${formation.toUpperCase()}>`);
    }
  }, [formation, onLog]);

  // Exposed Methods
  useImperativeHandle(ref, () => ({
    spawnHostile: () => {
      if (hostilesRef.current.length > 0) return;
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      const startX = Math.random() > 0.5 ? 20 : width - 20;
      const startY = Math.random() * height;
      
      const newHostile: Hostile = {
        id: Date.now(),
        x: startX,
        y: startY,
        targetX: width / 2,
        targetY: height / 2
      };
      
      hostilesRef.current.push(newHostile);
      onLog("ALERT: UNIDENTIFIED SIGNATURE DETECTED.", "alert");
      onStatsUpdate({ threatLevel: 'elevated' });
    },
    triggerJamming: () => {
      onLog("WARNING: RF SPECTRUM JAMMING DETECTED.", "alert");
      networkStatusRef.current = 'jammed';
      onStatsUpdate({ networkStatus: 'jammed' });

      // Scatter agents
      agentsRef.current.forEach(agent => {
        agent.targetX += (Math.random() - 0.5) * 300;
        agent.targetY += (Math.random() - 0.5) * 300;
      });

      // Recovery sequence
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
                containerRef.current.style.backgroundColor = flashCount % 2 === 0 ? '#FFCCCC' : 'transparent';
                flashCount++;
                if (flashCount > 5) {
                    clearInterval(flashInterval);
                    containerRef.current.style.backgroundColor = 'transparent';
                    onLog("De-escalation protocols active. Human-in-the-loop required.");
                    // Reset
                    if (hostilesRef.current.length > 0) {
                        hostilesRef.current = [];
                        setRenderHostiles([]); 
                    }
                    onStatsUpdate({ threatLevel: 'low' });
                }
            }, 200);
        }
        
        // Use the exposed method to spawn
        const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
         const newHostile: Hostile = {
            id: Date.now(),
            x: Math.random() > 0.5 ? 20 : width - 20,
            y: Math.random() * height,
            targetX: width / 2,
            targetY: height / 2
        };
        hostilesRef.current.push(newHostile);
        setRenderHostiles([newHostile]); 
    }
  }));

  // State to force render of Hostile DOM elements since they appear/disappear
  const [renderHostiles, setRenderHostiles] = useState<Hostile[]>([]);

  // Sync ref with state for the loop
  useEffect(() => {
    // Intentionally empty, just for re-render sync
  }, [renderHostiles]);


  // Handle Mouse/Drag
  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent stage click
    // Find agent
    const agent = agentsRef.current.find(a => a.id === id);
    if(agent) {
        draggingRef.current = { id, startX: e.clientX, startY: e.clientY };
    }
    // Also trigger selection
    const dataIndex = id % Object.keys(KNOWLEDGE_BASE).length;
    onAgentClick(KNOWLEDGE_BASE[dataIndex]);
  };

  const handleMouseMove = (e: MouseEvent) => {
     if(draggingRef.current) {
         const agent = agentsRef.current.find(a => a.id === draggingRef.current?.id);
         if(agent && containerRef.current) {
             const rect = containerRef.current.getBoundingClientRect();
             // Direct update for responsiveness
             agent.targetX = e.clientX - rect.left;
             agent.targetY = e.clientY - rect.top;
         }
     }
  };

  const handleMouseUp = () => {
      draggingRef.current = null;
  };

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      }
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
          newGrid.push({
            x: i * spacing + spacing/2,
            y: j * spacing + spacing/2,
            revealed: false
          });
        }
      }
      sensorGridRef.current = newGrid;
    };

    const resize = () => {
      if (containerRef.current && sensorCanvasRef.current && netCanvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        sensorCanvasRef.current.width = width;
        sensorCanvasRef.current.height = height;
        netCanvasRef.current.width = width;
        netCanvasRef.current.height = height;
        initSensors();
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // Loop
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
        // IDLE
        if (currentFormation === 'idle') {
          const cols = 8;
          agentsRef.current.forEach((agent, i) => {
             const col = i % cols;
             const row = Math.floor(i / cols);
             agent.targetX = cx - (cols * PIXEL_SIZE)/2 + col * (PIXEL_SIZE + GAP);
             agent.targetY = cy - (cols * PIXEL_SIZE)/2 + row * (PIXEL_SIZE + GAP);
          });
        } 
        // SEARCH
        else if (currentFormation === 'search') {
           if(Math.random() > 0.98) {
             agentsRef.current.forEach(agent => {
                if(Math.random() > 0.8) {
                    agent.targetX = Math.random() * (width - 100) + 50;
                    agent.targetY = Math.random() * (height - 100) + 50;
                }
             });
           }
        }
        // SHIELD
        else if (currentFormation === 'shield') {
            const cols = 16;
            const rows = Math.ceil(AGENT_COUNT / cols);
            const totalW = cols * (PIXEL_SIZE + GAP);
            
            agentsRef.current.forEach((agent, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              agent.targetX = cx - totalW/2 + col * (PIXEL_SIZE + GAP);
              agent.targetY = cy + row * (PIXEL_SIZE + GAP);
            });
        }
        // STRIKE
        else if (currentFormation === 'strike') {
            agentsRef.current.forEach((agent, i) => {
              const row = Math.floor(i / 2);
              const side = i % 2 === 0 ? -1 : 1;
              if(i === 0) { agent.targetX = cx; agent.targetY = cy - 100; } 
              else {
                agent.targetX = cx + (side * row * (PIXEL_SIZE + GAP));
                agent.targetY = (cy - 100) + (row * (PIXEL_SIZE + GAP));
              }
            });
        }
      } else {
        // COMBAT
        const dx = activeHostile.x - cx;
        const dy = activeHostile.y - cy;
        const angle = Math.atan2(dy, dx);
        
        if (currentFormation === 'search') { // Investigate
             agentsRef.current.forEach((agent, i) => {
                const d2h = Math.sqrt(Math.pow(agent.x - activeHostile.x, 2) + Math.pow(agent.y - activeHostile.y, 2));
                if (d2h < 300) {
                    agent.targetX = activeHostile.x + Math.cos(i) * 80;
                    agent.targetY = activeHostile.y + Math.sin(i) * 80;
                }
            });
        } else if (currentFormation === 'shield') { // Wall
              const wallDist = 150;
              const wx = cx + Math.cos(angle) * wallDist;
              const wy = cy + Math.sin(angle) * wallDist;
              const perpX = -Math.sin(angle);
              const perpY = Math.cos(angle);
              
              agentsRef.current.forEach((agent, i) => {
                  const offset = (i - AGENT_COUNT/2) * (PIXEL_SIZE/1.5); 
                  agent.targetX = wx + perpX * offset;
                  agent.targetY = wy + perpY * offset;
              });
        } else if (currentFormation === 'strike') { // Surround
              agentsRef.current.forEach((agent, i) => {
                 // Spiral attack
                 const attackAngle = (i / AGENT_COUNT) * Math.PI * 2 * 2; // Wrap twice
                 const radiusOffset = (i % 2) * 30; // Two layers
                 const attackDist = 80 + radiusOffset + Math.sin(Date.now() / 100) * 5; 
                 agent.targetX = activeHostile.x + Math.cos(attackAngle) * attackDist;
                 agent.targetY = activeHostile.y + Math.sin(attackAngle) * attackDist;
              });
        }
      }

      // 2. Physics & DOM Updates
      agentsRef.current.forEach((agent, i) => {
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        agent.x += dx * 0.08 * speedMultiplier;
        agent.y += dy * 0.08 * speedMultiplier;
        
        const el = agentDomsRef.current[i];
        if (el) {
          el.style.transform = `translate(${agent.x - PIXEL_SIZE/2}px, ${agent.y - PIXEL_SIZE/2}px)`;
        }
      });

      // Hostiles
      hostilesRef.current.forEach(h => {
          const hdx = h.targetX - h.x;
          const hdy = h.targetY - h.y;
          // Wander if close to target
          if (Math.abs(hdx) < 10 && Math.abs(hdy) < 10) {
              h.targetX = Math.random() * (width - 100) + 50;
              h.targetY = Math.random() * (height - 100) + 50;
          }
          h.x += hdx * 0.02;
          h.y += hdy * 0.02;

          const el = hostileDomsRef.current.get(h.id);
          if (el) {
             el.style.transform = `translate(${h.x - PIXEL_SIZE/2}px, ${h.y - PIXEL_SIZE/2}px)`;
             
             // Combat Logic
             if (currentFormation === 'strike') {
                 lockOnTimerRef.current += 1;
                 el.classList.add('animate-pulse'); // Use tailwind pulse for convenience or custom class
                 
                 // Shake effect
                 const shake = Math.sin(Date.now() / 20) * 2;
                 el.style.transform += ` rotate(${shake}deg)`;
                 
                 // Lock on ring
                 if (netCtx) {
                    const progress = Math.min(lockOnTimerRef.current / 180, 1);
                    netCtx.beginPath();
                    netCtx.strokeStyle = '#FF3333';
                    netCtx.lineWidth = 3;
                    netCtx.arc(h.x, h.y, 40 * (1 - progress) + 10, 0, Math.PI * 2);
                    netCtx.stroke();
                 }

                 if (lockOnTimerRef.current > 180) {
                     // Kill
                     hostilesRef.current = hostilesRef.current.filter(x => x.id !== h.id);
                     setRenderHostiles([...hostilesRef.current]); // Sync State
                     lockOnTimerRef.current = 0;
                     onLog("EFFECT ON TARGET. Hostile Neutralized.", "success");
                     onStatsUpdate({ threatLevel: 'neutralized' });
                     setTimeout(() => onStatsUpdate({ threatLevel: 'low' }), 2000);
                 }
             } else {
                 lockOnTimerRef.current = 0;
                 el.classList.remove('animate-pulse');
             }
          }
      });
      // Sync render state if hostile was removed during loop logic (handled above) 
      // but if we added one via ref (spawnHostile), we need to check if we need to update state to show it.
      if (hostilesRef.current.length !== renderHostiles.length) {
          setRenderHostiles([...hostilesRef.current]);
      }

      // 3. Draw Network
      if (netCtx) {
          netCtx.clearRect(0, 0, width, height);
          if (networkStatusRef.current !== 'jammed') {
            netCtx.beginPath();
            // Apply bandwidth link opacity
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
                    // Jitter Effect
                    // Use a unique ID for the link (cant use pointer, so mix IDs)
                    const linkId = agent.id * 1000 + other.id;
                    const j = getSmoothedVec2(linkId, totalJitter, 0.2);
                    
                    netCtx.moveTo(agent.x + j.x, agent.y + j.y);
                    netCtx.lineTo(other.x + j.x, other.y + j.y);
                  }
                }
              }
            });
            netCtx.stroke();

            // Strike Lines
            if (activeHostile && currentFormation === 'strike') {
                netCtx.beginPath();
                netCtx.strokeStyle = 'rgba(255, 51, 51, 0.4)';
                agentsRef.current.forEach(a => {
                    netCtx.moveTo(a.x, a.y);
                    netCtx.lineTo(activeHostile.x, activeHostile.y);
                });
                netCtx.stroke();
            }

            // Semantic Relationships (Knowledge Graph) — uses pre-computed mapping
            GRAPH_RELATIONSHIPS.forEach(edge => {
               const sourceIndices = nodeToAgentsMap.current.get(edge.source) || [];
               const targetIndices = nodeToAgentsMap.current.get(edge.target) || [];
               const sourceAgents = sourceIndices.map(i => agentsRef.current[i]);
               const targetAgents = targetIndices.map(i => agentsRef.current[i]);

               const isSelectedRelationship = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

               sourceAgents.forEach(sa => {
                 targetAgents.forEach(ta => {
                    const dx = sa.x - ta.x;
                    const dy = sa.y - ta.y;
                    const distSq = dx*dx + dy*dy;
                    
                    // Relaxed distance for selected nodes to visualize long-range doctrine
                    const maxDist = isSelectedRelationship ? 1000 : 250; 
                    
                    if (distSq < maxDist * maxDist) {
                        netCtx.beginPath();
                        
                        // Jitter for semantic links too
                        // Unique semantic link ID based on string hash or just index
                        const semanticId = 50000 + (sa.id * 100 + ta.id); 
                        const j = getSmoothedVec2(semanticId, totalJitter, 0.15);
                        
                        if (isSelectedRelationship) {
                             netCtx.strokeStyle = 'rgba(37, 99, 235, 0.8)'; // Strong Blue
                             netCtx.lineWidth = 2;
                             netCtx.setLineDash([5, 5]);
                             
                             // Spawn Packet occasionally
                             if (Math.random() > 0.92) {
                                 packetsRef.current.push({
                                     x: sa.x, y: sa.y,
                                     tx: ta.x, ty: ta.y,
                                     age: 0,
                                     maxAge: 30 + Math.random() * 20
                                 });
                             }
                        } else {
                             netCtx.strokeStyle = 'rgba(0, 150, 255, 0.15)'; 
                             netCtx.lineWidth = 1;
                             netCtx.setLineDash([2, 4]);
                        }

                        netCtx.moveTo(sa.x + j.x, sa.y + j.y);
                        netCtx.lineTo(ta.x + j.x, ta.y + j.y);
                        netCtx.stroke();
                        
                        // Label
                        if (isSelectedRelationship || (distSq < 100 * 100 && Math.random() > 0.98)) {
                           netCtx.fillStyle = isSelectedRelationship ? '#000' : 'rgba(0,0,0,0.5)';
                           netCtx.font = isSelectedRelationship ? 'bold 10px monospace' : '8px monospace';
                           netCtx.fillText(edge.label.toUpperCase(), (sa.x + ta.x)/2 + j.x, (sa.y + ta.y)/2 + j.y);
                        }
                    }
                 });
               });
               netCtx.setLineDash([]); // Reset
            });

            // Draw Packets
            packetsRef.current = packetsRef.current.filter(p => {
                p.age++;
                if (p.age > p.maxAge) return false;
                const progress = p.age / p.maxAge;
                const curX = p.x + (p.tx - p.x) * progress;
                const curY = p.y + (p.ty - p.y) * progress;

                netCtx.beginPath();
                netCtx.fillStyle = '#2563EB';
                netCtx.arc(curX, curY, 3, 0, Math.PI*2);
                netCtx.fill();
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
                  for (let agent of agentsRef.current) {
                      const d = Math.sqrt(Math.pow(agent.x - point.x, 2) + Math.pow(agent.y - point.y, 2));
                      if (d < 80) point.revealed = true;
                  }
              }
              if (point.revealed) revealedCount++;

              sensorCtx.beginPath();
              sensorCtx.fillStyle = point.revealed ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.05)';
              sensorCtx.arc(point.x, point.y, point.revealed ? 3 : 1, 0, Math.PI * 2);
              sensorCtx.fill();
          });
          
          // Throttled stats update (roughly every 60 frames to avoid React spam)
          if (animationFrameRef.current % 60 === 0) {
              const coverage = Math.floor((revealedCount / sensorGridRef.current.length) * 100);
              onStatsUpdate({ coverage });
          }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [onStatsUpdate, onLog, renderHostiles]); 

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#F5F5F5] overflow-hidden cursor-crosshair">
      <ScanlineOverlay trustPhase={trustPhase} />
      <canvas ref={sensorCanvasRef} className="absolute top-0 left-0 w-full h-full z-0 opacity-50 pointer-events-none" />
      <canvas ref={netCanvasRef} className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none" />
      
      {/* Agents */}
      {Array.from({ length: AGENT_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { agentDomsRef.current[i] = el; }}
          onMouseDown={(e) => handleMouseDown(e, i)}
          className={clsx(
            "absolute top-0 left-0 w-[20px] h-[20px] bg-black text-white text-[8px] font-bold z-20 flex items-center justify-center cursor-move transition-colors duration-200 border border-transparent hover:border-white hover:z-50 select-none",
            selectedNode && KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id === selectedNode.id ? "bg-blue-600 border-white scale-110 z-50 shadow-[0_0_15px_rgba(37,99,235,0.8)]" : "",
             // Highlight related nodes
             selectedNode && GRAPH_RELATIONSHIPS.some(r => 
                (r.source === selectedNode.id && r.target === KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id) ||
                (r.target === selectedNode.id && r.source === KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id)
             ) ? "bg-cyan-800 border-cyan-400 z-40" : "",
            "shadow-sm"
          )}
        >
          {KNOWLEDGE_BASE[i % Object.keys(KNOWLEDGE_BASE).length]?.id}
        </div>
      ))}
      
      {/* Hostiles */}
      {renderHostiles.map((h) => (
         <div
           key={h.id}
           ref={el => { 
             if(el) hostileDomsRef.current.set(h.id, el); 
             else hostileDomsRef.current.delete(h.id);
           }}
           className="absolute top-0 left-0 w-[20px] h-[20px] bg-[#FF3333] border-2 border-white shadow-[0_0_10px_#FF0000] z-30 flex items-center justify-center text-white text-[8px] font-bold animate-pulse"
         >
           TGT
         </div>
      ))}

    </div>
  );
});

MainStage.displayName = 'MainStage';
