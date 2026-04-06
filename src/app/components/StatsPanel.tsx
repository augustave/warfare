import React from 'react';
import { SimulationStats } from '../types';
import { clsx } from 'clsx';

interface StatsPanelProps {
  stats: SimulationStats;
  className?: string;
}

const toHex = (n: number) => Math.floor(n).toString(16).toUpperCase().padStart(2, '0');

const RegisterRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between items-center font-mono text-[11px]">
    <span className="text-black/50">{label}</span>
    <span className={clsx("font-bold", color || "text-black")}>{value}</span>
  </div>
);

const BudgetBar: React.FC<{ label: string; value: number; addr: string }> = ({ label, value, addr }) => {
  const phase = value >= 70 ? 'ok' : value >= 40 ? 'warn' : 'crit';
  const color = phase === 'ok' ? '#000080' : phase === 'warn' ? '#808000' : '#FF0000';

  return (
    <div className="space-y-[2px]">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-black/50">{addr}</span>
        <span>{label}</span>
        <span className="font-bold" style={{ color }}>{Math.floor(value)}%</span>
      </div>
      <div className="win95-progress h-[12px]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.max(value, 0)}%`,
            background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, transparent 8px, transparent 10px)`,
          }}
        />
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

  const trustColor =
    trustPhase === 'green' ? '#008000' :
    trustPhase === 'yellow' ? '#808000' :
    '#FF0000';

  return (
    <div className={clsx("flex flex-col gap-1 h-full bg-[#D4D0C8] text-black", className)}>

      {/* Trust Register */}
      <div className="win95-window p-0">
        <div className="win95-titlebar text-[10px] py-[2px]">
          <span>System Confidence</span>
          <span className="text-[9px] opacity-70">[0x00]</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-pixel text-[18px] leading-none" style={{ color: trustColor }}>
                {Math.floor(stats.trust)}%
              </div>
              <div className="text-[9px] font-mono mt-1 opacity-50">
                0x{toHex(stats.trust)} / 0x64
              </div>
            </div>
            <div className="text-right">
              <span
                className="text-[10px] font-bold px-2 py-[2px] border"
                style={{
                  color: trustColor,
                  borderColor: trustColor,
                }}
              >
                {trustLabel}
              </span>
            </div>
          </div>
          <div className="win95-progress h-[14px]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${stats.trust}%`,
                background: `repeating-linear-gradient(90deg, ${trustColor} 0px, ${trustColor} 8px, transparent 8px, transparent 10px)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* System Registers */}
      <div className="win95-window p-0">
        <div className="win95-titlebar text-[10px] py-[2px]">
          <span>System Registers</span>
          <span className="text-[9px] opacity-70">[0x10]</span>
        </div>
        <div className="p-2 win95-inset mx-2 my-2 bg-white space-y-1">
          <RegisterRow label="0x10 COV" value={`${stats.coverage}% [0x${toHex(stats.coverage)}]`} />
          <RegisterRow
            label="0x11 NET"
            value={stats.networkStatus === 'nominal' ? 'MESH' : stats.networkStatus === 'jammed' ? 'OFFLINE' : 'EDGE'}
            color={stats.networkStatus === 'jammed' ? 'text-[#FF0000]' : undefined}
          />
          <RegisterRow
            label="0x12 THR"
            value={stats.threatLevel.toUpperCase()}
            color={stats.threatLevel === 'critical' || stats.threatLevel === 'elevated' ? 'text-[#FF0000]' : stats.threatLevel === 'neutralized' ? 'text-[#008000]' : undefined}
          />
          <RegisterRow label="0x13 LAT" value={`${stats.latency}ms`} />
        </div>
      </div>

      {/* Budget Bars */}
      <div className="win95-window p-0 flex-1">
        <div className="win95-titlebar text-[10px] py-[2px]">
          <span>Resource Budget</span>
          <span className="text-[9px] opacity-70">[0x20]</span>
        </div>
        <div className="p-2 space-y-2">
          <BudgetBar label="Latency" value={stats.budgets.latency} addr="0x20" />
          <BudgetBar label="Bandwidth" value={stats.budgets.bandwidth} addr="0x21" />
          <BudgetBar label="Endurance" value={stats.budgets.energy} addr="0x22" />
          <BudgetBar label="Attention" value={stats.budgets.attention} addr="0x23" />
        </div>
      </div>

      {/* Footer */}
      <div className="win95-statusbar-field text-[9px] font-mono flex justify-between">
        <span>SYS:{stats.latency}ms</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
};
