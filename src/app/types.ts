export interface KnowledgeNode {
  id: string;
  title: string;
  type: string;
  body: string;
}

export interface KnowledgeEdge {
  source: string; // The ID of the source node (e.g. "01")
  target: string; // The ID of the target node (e.g. "02")
  label: string;
}

export type FormationType = 'idle' | 'search' | 'shield' | 'strike';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: 'alert' | 'info' | 'success';
}

export interface Budgets {
  latency: number;
  bandwidth: number;
  energy: number;
  attention: number;
}

export interface SimulationStats {
  coverage: number;
  networkStatus: 'nominal' | 'jammed' | 'local';
  threatLevel: 'low' | 'elevated' | 'critical' | 'neutralized';
  latency: number;
  trust: number;
  budgets: Budgets;
}

export interface TrustHistoryItem {
  timestamp: string;
  amount: number;
  reason: string;
}

export type TrustPhase = 'green' | 'yellow' | 'orange' | 'red';
