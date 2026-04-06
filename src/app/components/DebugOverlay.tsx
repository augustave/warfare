import React, { useEffect, useState } from 'react';
import { SimulationStats } from '../types';

interface DebugOverlayProps {
    stats: SimulationStats;
    activeLoops: number;
    tickHz: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, activeLoops, tickHz }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'd') {
                setVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed top-20 right-4 z-[9999] bg-[#000000] text-[#00FF00] p-4 font-mono text-[10px] pointer-events-none border border-[#00FF00]">
            <h3 className="font-bold border-b border-[#00FF00] mb-2 pb-1">KERNEL DIAGNOSTICS</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="opacity-70">Active Loops:</span>
                <span className={activeLoops !== 1 ? "text-[#FF0000] font-bold animate-pulse" : "text-[#00FF00]"}>
                    {activeLoops}
                </span>

                <span className="opacity-70">Est. Hz:</span>
                <span>{tickHz.toFixed(1)}</span>

                <span className="opacity-70">Trust:</span>
                <span className={stats.trust < 0 || stats.trust > 100 || isNaN(stats.trust) ? "text-[#FF0000]" : ""}>
                    {stats.trust.toFixed(2)}
                </span>

                <span className="opacity-70">Latency:</span>
                <span className={stats.budgets.latency < 0 ? "text-[#FF0000]" : ""}>
                    {stats.budgets.latency.toFixed(2)}%
                </span>

                <span className="opacity-70">Bandwidth:</span>
                <span className={stats.budgets.bandwidth < 0 ? "text-[#FF0000]" : ""}>
                    {stats.budgets.bandwidth.toFixed(2)}%
                </span>

                <span className="opacity-70">Energy:</span>
                <span className={stats.budgets.energy < 0 ? "text-[#FF0000]" : ""}>
                    {stats.budgets.energy.toFixed(2)}%
                </span>

                <span className="opacity-70">Attention:</span>
                <span className={stats.budgets.attention < 0 ? "text-[#FF0000]" : ""}>
                    {stats.budgets.attention.toFixed(2)}%
                </span>
            </div>
            <div className="mt-2 text-[9px] opacity-50 italic">
                Press Ctrl+D to toggle
            </div>
        </div>
    );
};
