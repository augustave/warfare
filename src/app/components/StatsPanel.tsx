import React from 'react';
import { SimulationStats } from '../types';
import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, ShieldX, TriangleAlert } from 'lucide-react';

interface StatsPanelProps {
  stats: SimulationStats;
  className?: string;
}

interface BudgetCardProps {
  label: string;
  value: number;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ label, value }) => {
    const phase = value >= 70 ? 'green' : value >= 40 ? 'yellow' : 'red';
    const color = phase === 'green' ? 'text-black' : phase === 'yellow' ? 'text-yellow-600' : 'text-red-600';
    const bg = phase === 'red' ? 'bg-red-50' : 'bg-transparent';
    
    return (
        <div className={clsx("flex justify-between items-center py-1 border-b border-black/5 last:border-0", bg)}>
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">{label}</span>
            <span className={clsx("font-mono text-xs font-bold", color)}>{Math.floor(value)}%</span>
        </div>
    );
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, className }) => {
  const trustPhase = 
    stats.trust >= 85 ? 'green' : 
    stats.trust >= 70 ? 'yellow' : 
    stats.trust >= 50 ? 'orange' : 'red';

  const trustColor = 
    trustPhase === 'green' ? 'text-green-700 border-green-700' : 
    trustPhase === 'yellow' ? 'text-yellow-600 border-yellow-600' :
    trustPhase === 'orange' ? 'text-orange-600 border-orange-600' : 'text-red-600 border-red-600';
    
  const trustBg = 
    trustPhase === 'green' ? 'bg-green-50' : 
    trustPhase === 'yellow' ? 'bg-yellow-50' :
    trustPhase === 'orange' ? 'bg-orange-50' : 'bg-red-50';

  const trustLabel = 
    trustPhase === 'green' ? 'TRUSTED' :
    trustPhase === 'yellow' ? 'DEGRADED' :
    trustPhase === 'orange' ? 'OVERSIGHT' : 'REVOKED';

  const trustIcon =
    trustPhase === 'green' ? <ShieldCheck size={20} /> :
    trustPhase === 'yellow' ? <ShieldAlert size={20} /> :
    trustPhase === 'orange' ? <TriangleAlert size={20} /> : <ShieldX size={20} />;

  return (
    <div className={clsx("flex flex-col p-8 gap-6 border-l border-black/10 h-full bg-[#F5F5F5] text-black w-full md:w-[280px]", className)}>
      
      {/* Trust Panel (Priority P0) */}
      <div className={clsx("border-2 p-4 transition-all duration-300", trustColor, trustBg)}>
         <div className="flex justify-between items-start mb-2">
            {trustIcon}
            <span className="text-3xl font-black">{Math.floor(stats.trust)}%</span>
         </div>
         <span className="text-[10px] uppercase font-bold tracking-widest block mb-1">
            System Confidence
         </span>
         <div className="text-xs font-bold uppercase tracking-wider border-t border-current pt-2 mt-2 flex justify-between">
            <span>Status:</span>
            <span>{trustLabel}</span>
         </div>
      </div>

      <div className="border border-black p-4 bg-white/50">
        <span className="text-2xl font-black block mb-1">{stats.coverage}%</span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Domain Awareness</span>
      </div>

      <div className="border border-black p-4 bg-white/50">
        <span className={clsx("text-2xl font-black block mb-1", stats.networkStatus === 'jammed' ? "text-[#FF3333]" : "text-black")}>
          {stats.networkStatus === 'nominal' ? 'MESH' : stats.networkStatus === 'local' ? 'EDGE' : 'OFFLINE'}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Network Topology</span>
      </div>

      {/* Budget Panel */}
      <div className="border border-black p-4 bg-white/50 space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest border-b-2 border-black pb-1 mb-2">
              Resource Budget
          </div>
          <BudgetCard label="Latency Headroom" value={stats.budgets.latency} />
          <BudgetCard label="Bandwidth" value={stats.budgets.bandwidth} />
          <BudgetCard label="Endurance" value={stats.budgets.energy} />
          <BudgetCard label="Operator Load" value={stats.budgets.attention} />
      </div>

      <div className="mt-auto border border-black p-4 bg-white/50">
        <span className={clsx("text-2xl font-black block mb-1", 
          stats.threatLevel === 'critical' || stats.threatLevel === 'elevated' ? "text-[#FF3333]" : 
          stats.threatLevel === 'neutralized' ? "text-green-600" : "text-black"
        )}>
          {stats.threatLevel.toUpperCase()}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Threat Assessment</span>
      </div>
      
      <div className="flex justify-between font-mono text-xs font-bold uppercase tracking-wider opacity-60">
          <span>Latency: {stats.latency}ms</span>
          <span>v2.4.1</span>
      </div>
    </div>
  );
};
