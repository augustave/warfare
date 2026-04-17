import React from 'react';
import { SimulationStats } from '../types';
import { clsx } from 'clsx';

interface StatsPanelProps {
  stats: SimulationStats;
  className?: string;
}

const BudgetRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const critical = value < 40;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="node-label">{label}</span>
        {critical ? (
          <span className="inv-inline" style={{ fontSize: '18px', padding: '2px 8px', letterSpacing: '-0.02em' }}>{Math.floor(value)}</span>
        ) : (
          <span className="data-large">{Math.floor(value)}</span>
        )}
      </div>
      <div className="brut-bar">
        <div className="brut-bar-fill" style={{ width: `${Math.max(value, 0)}%` }} />
      </div>
    </div>
  );
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, className }) => {
  const trustPhase =
    stats.trust >= 85 ? 'green' :
    stats.trust >= 70 ? 'yellow' :
    stats.trust >= 50 ? 'orange' : 'red';

  const trustLabel =
    trustPhase === 'green' ? 'TRUSTED' :
    trustPhase === 'yellow' ? 'DEGRADED' :
    trustPhase === 'orange' ? 'OVERSIGHT' : 'REVOKED';

  return (
    <div className={clsx("flex flex-col h-full bg-white text-black", className)}>

      {/* Trust — the dominant data point */}
      <div className={clsx(
        "p-5 border-b-[3px] border-black",
        trustPhase === 'red' && "bg-black text-white",
      )}>
        <div className={clsx("node-label mb-1", trustPhase === 'red' && "opacity-60 text-white")}>
          System Confidence
        </div>
        <div className="data-huge">{Math.floor(stats.trust)}%</div>
        <div className="mt-2">
          <span className={clsx(
            "inv-inline",
            trustPhase === 'red' ? "bg-white text-black" : ""
          )}>
            {trustLabel}
          </span>
        </div>
      </div>

      <div className="beam-h" />

      {/* Coverage + Network */}
      <div className="p-5 border-b-[3px] border-black flex gap-6">
        <div className="flex-1">
          <div className="node-label mb-1">Coverage</div>
          <div className="data-large">{stats.coverage}%</div>
        </div>
        <div className="flex-1">
          <div className="node-label mb-1">Network</div>
          {stats.networkStatus === 'jammed' ? (
            <span className="inv-inline" style={{ fontSize: '18px', padding: '2px 8px', letterSpacing: '-0.02em' }}>OFF</span>
          ) : (
            <div className="data-large">
              {stats.networkStatus === 'nominal' ? 'MESH' : 'EDGE'}
            </div>
          )}
        </div>
      </div>

      <div className="beam-h" />

      {/* Resource Budgets */}
      <div className="p-5 space-y-4 flex-1">
        <div className="node-label">Resources</div>
        <BudgetRow label="Latency" value={stats.budgets.latency} />
        <BudgetRow label="Bandwidth" value={stats.budgets.bandwidth} />
        <BudgetRow label="Endurance" value={stats.budgets.energy} />
        <BudgetRow label="Attention" value={stats.budgets.attention} />
      </div>

      <div className="beam-h" />

      {/* Threat */}
      <div className="p-5">
        <div className="node-label mb-1">Threat</div>
        {(stats.threatLevel === 'critical' || stats.threatLevel === 'elevated') ? (
          <span className="inv-inline" style={{ fontSize: '18px', padding: '2px 8px', letterSpacing: '-0.02em' }}>
            {stats.threatLevel.toUpperCase()}
          </span>
        ) : (
          <div className="data-large">{stats.threatLevel.toUpperCase()}</div>
        )}
      </div>
    </div>
  );
};
