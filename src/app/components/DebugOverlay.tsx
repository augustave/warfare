import React, { useEffect, useState } from 'react';
import { SimulationStats } from '../types';

interface DebugOverlayProps {
    stats: SimulationStats;
    activeLoops: number;
    tickHz: number;
    tickCount?: number;
}

const toHex = (n: number) => Math.floor(n).toString(16).toUpperCase().padStart(2, '0');

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ stats, activeLoops, tickHz }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                setVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
            <div className="win95-window">
                <div className="win95-titlebar text-[9px] py-[1px]">
                    <span>Kernel Diagnostics</span>
                </div>
                <div className="bg-black text-[#00FF00] p-3 font-mono text-[10px] crt-scanlines space-y-[2px]">
                    <div>LOOPS: <span className={activeLoops !== 1 ? "text-[#FF0000] font-bold" : ""}>{activeLoops}</span></div>
                    <div>HZ:    {tickHz.toFixed(1)}</div>
                    <div>TRUST: <span className={stats.trust < 0 || stats.trust > 100 || isNaN(stats.trust) ? "text-[#FF0000]" : ""}>{stats.trust.toFixed(2)} [0x{toHex(stats.trust)}]</span></div>
                    <div>LAT:   <span className={stats.budgets.latency < 0 ? "text-[#FF0000]" : ""}>{stats.budgets.latency.toFixed(2)}%</span></div>
                    <div>BW:    <span className={stats.budgets.bandwidth < 0 ? "text-[#FF0000]" : ""}>{stats.budgets.bandwidth.toFixed(2)}%</span></div>
                    <div>NRG:   <span className={stats.budgets.energy < 0 ? "text-[#FF0000]" : ""}>{stats.budgets.energy.toFixed(2)}%</span></div>
                    <div>ATN:   <span className={stats.budgets.attention < 0 ? "text-[#FF0000]" : ""}>{stats.budgets.attention.toFixed(2)}%</span></div>
                    <div className="text-[8px] opacity-40 pt-1">Ctrl+D to close</div>
                </div>
            </div>
        </div>
    );
};
