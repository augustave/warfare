import React, { useEffect, useState } from 'react';
import { SimulationStats } from '../types';

interface DebugOverlayProps {
  stats: SimulationStats;
  activeLoops: number;
  tickHz: number;
  tickCount?: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, activeLoops, tickHz }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); setVisible(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="bg-white border-[3px] border-black p-4 text-[10px] font-bold uppercase leading-[1.8] tracking-wide">
        <div className="node-label mb-2">Kernel</div>
        <div>Loops: {activeLoops !== 1 ? <span className="inv-inline">{activeLoops}</span> : <span>{activeLoops}</span>}</div>
        <div>Hz: {tickHz.toFixed(1)}</div>
        <div>Trust: {stats.trust.toFixed(2)}%</div>
        <div>Lat: {stats.budgets.latency.toFixed(2)}%</div>
        <div>BW: {stats.budgets.bandwidth.toFixed(2)}%</div>
        <div>NRG: {stats.budgets.energy.toFixed(2)}%</div>
        <div>ATN: {stats.budgets.attention.toFixed(2)}%</div>
        <div className="opacity-30 mt-2">Ctrl+D close</div>
      </div>
    </div>
  );
};
