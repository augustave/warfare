import React, { useEffect, useState } from 'react';
import { SimulationStats } from '../types';

interface DebugOverlayProps {
    stats: SimulationStats;
    activeLoops: number;
    tickHz: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, activeLoops, tickHz }) => {
    const [visible, setVisible] = useState(false);

    // Toggle with Ctrl+D
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
        <div className="fixed top-20 right-4 z-[9999] bg-black/80 text-green-400 p-4 font-mono text-[10px] pointer-events-none border border-green-500 shadow-lg">
            <h3 className="font-bold border-b border-green-500 mb-2 pb-1">KERNEL DIAGNOSTICS</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="opacity-70">Active Loops:</span>
                <span className={activeLoops !== 1 ? "text-red-500 font-bold animate-pulse" : "text-green-400"}>
                    {activeLoops}
                </span>

                <span className="opacity-70">Est. Hz:</span>
                <span>{tickHz.toFixed(1)}</span>

                <span className="opacity-70">Trust:</span>
                <span className={stats.trust < 0 || stats.trust > 100 || isNaN(stats.trust) ? "text-red-500" : ""}>
                    {stats.trust.toFixed(2)}
                </span>

                <span className="opacity-70">Latency:</span>
                <span className={stats.budgets.latency < 0 ? "text-red-500" : ""}>
                    {stats.budgets.latency.toFixed(2)}%
                </span>
                
                <span className="opacity-70">Bandwidth:</span>
                <span className={stats.budgets.bandwidth < 0 ? "text-red-500" : ""}>
                    {stats.budgets.bandwidth.toFixed(2)}%
                </span>

                <span className="opacity-70">Energy:</span>
                <span className={stats.budgets.energy < 0 ? "text-red-500" : ""}>
                    {stats.budgets.energy.toFixed(2)}%
                </span>

                <span className="opacity-70">Attention:</span>
                <span className={stats.budgets.attention < 0 ? "text-red-500" : ""}>
                    {stats.budgets.attention.toFixed(2)}%
                </span>
            </div>
            <div className="mt-2 text-[9px] opacity-50 italic">
                Press Ctrl+D to toggle
            </div>
        </div>
    );
};
