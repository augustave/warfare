import { KnowledgeNode, KnowledgeEdge } from './types';

export const GRAPH_RELATIONSHIPS: KnowledgeEdge[] = [
  { source: "01", target: "02", label: "Enables" },           // Agentic AI -> Attritable Mass
  { source: "03", target: "02", label: "Operationalizes" },     // Replicator -> Attritable Mass
  { source: "01", target: "06", label: "Risk: Escalation" },    // Agentic AI -> Flash Wars
  { source: "01", target: "12", label: "Risk: Alignment" },     // Agentic AI -> Agentic Misalignment
  { source: "03", target: "15", label: "Includes" },            // Replicator -> C-sUAS
  { source: "16", target: "08", label: "Feeds" },               // Sensing Grid -> Decision Superiority
  { source: "05", target: "16", label: "Orchestrates" },        // Lattice OS -> Sensing Grid
  { source: "11", target: "16", label: "Node In" },             // Saronic -> Sensing Grid
  { source: "14", target: "02", label: "Sustains" },            // Mach Industries -> Attritable Mass
  { source: "13", target: "08", label: "Accelerates" },         // Vannevar -> Decision Superiority
  { source: "09", target: "08", label: "Contests" },            // Intel. Warfare -> Decision Superiority
  { source: "10", target: "01", label: "Regulates" },           // Directive 3000.09 -> Agentic AI
];

export const KNOWLEDGE_BASE: Record<number, KnowledgeNode> = {
  0: { 
    id: "01", 
    title: "Agentic AI", 
    type: "Concept", 
    body: "A paradigm shift from rigid automation to autonomous systems capable of pursuing high-level goals. Unlike traditional automation, Agentic AI adapts to changing environments to achieve 'Commander's Intent'." 
  },
  1: { 
    id: "02", 
    title: "Attritable Mass", 
    type: "Strategy", 
    body: "The strategic doctrine of deploying thousands of low-cost, high-risk assets. 'Attritable' means the loss of a single unit is operationally and financially acceptable, overwhelming adversaries with sheer volume." 
  },
  2: { 
    id: "03", 
    title: "Replicator Initiative", 
    type: "Initiative", 
    body: "DepSecDef Hicks' program to field 'thousands of autonomous systems' (ADA2) within 18-24 months. Designed to counter the PRC's A2/AD mass with a resilient distributed network of our own." 
  },
  3: { 
    id: "04", 
    title: "Hivemind", 
    type: "Tech", 
    body: "Shield AI's autonomy pilot. It enables swarms (like V-BATs) to operate in GPS-denied and comms-degraded environments by processing mapping and planning locally on the edge." 
  },
  4: { 
    id: "05", 
    title: "Lattice OS", 
    type: "Tech", 
    body: "Anduril's operating system for defense. It fuses data from thousands of sensors (towers, drones, subs) into a single common operating picture, automating target identification and tasking." 
  },
  5: { 
    id: "06", 
    title: "Flash Wars", 
    type: "Risk", 
    body: "The distinct probability that opposing agentic swarms, reacting at machine speed (nanoseconds), could unintentionally escalate a standoff into a kinetic conflict before human commanders can intervene." 
  },
  6: { 
    id: "07", 
    title: "Ghost Shark", 
    type: "Platform", 
    body: "An Extra-Large Autonomous Underwater Vehicle (XL-AUV) jointly developed by Anduril and the RAN/US Navy. Provides persistent, stealthy subsea deterrence without risking human crews." 
  },
  7: { 
    id: "08", 
    title: "Decision Superiority", 
    type: "Strategy", 
    body: "Achieving a faster OODA loop (Observe-Orient-Decide-Act) than the adversary. AI agents process sensor data instantly, allowing commanders to act on information while the enemy is still analyzing it." 
  },
  8: { 
    id: "09", 
    title: "Intelligentized Warfare", 
    type: "Strategy", 
    body: "The PRC's military concept (Zhineng Hua). It views AI not just as a tool, but as the central cognitive domain of warfare, prioritizing algorithm dominance over kinetic yield." 
  },
  9: { 
    id: "10", 
    title: "DoD Directive 3000.09", 
    type: "Policy", 
    body: "The primary US policy governing autonomy in weapon systems. It mandates 'appropriate human judgment' over the use of force, sparking debate on how to maintain control over swarms of thousands." 
  },
  10: { 
    id: "11", 
    title: "Saronic", 
    type: "Company", 
    body: "Specializes in Autonomous Surface Vessels (ASVs) like Corsair and Cutlass. These form maritime sensing grids to detect enemy fleets, acting as a force multiplier for the Navy." 
  },
  11: { 
    id: "12", 
    title: "Agentic Misalignment", 
    type: "Risk", 
    body: "The danger that an autonomous agent, in maximizing its objective function (e.g., 'neutralize threat'), might take actions violating the constraints or ethics intended by its human commander." 
  },
  12: { 
    id: "13", 
    title: "Vannevar Labs", 
    type: "Company", 
    body: "Focuses on 'non-kinetic' effects and intelligence analysis (Decrypt). Their tools automate the processing of foreign text and signals, feeding the 'Decision Superiority' engine." 
  },
  13: { 
    id: "14", 
    title: "Mach Industries", 
    type: "Company", 
    body: "Pioneering hydrogen-based platforms and distributed manufacturing. Their approach emphasizes logistics independence—generating fuel (hydrogen) on the battlefield to sustain the swarm." 
  },
  14: { 
    id: "15", 
    title: "C-sUAS", 
    type: "Sub-Initiative", 
    body: "Replicator 2 focus area: Counter-Small Unmanned Aerial Systems. Using kinetic and non-kinetic (EW/Directed Energy) means to defend against the proliferation of cheap enemy drones." 
  },
  15: { 
    id: "16", 
    title: "Sensing Grid", 
    type: "Concept", 
    body: "A decentralized mesh of sensors (Space, Air, Sea). Unlike a 'Kill Chain' which breaks if one link fails, a 'Kill Web' or Grid is resilient—data routes around damage instantly." 
  }
};
