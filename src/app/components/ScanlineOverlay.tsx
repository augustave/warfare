import React from 'react';
import { TrustPhase } from '../types';
import { clsx } from 'clsx';

interface ScanlineOverlayProps {
  trustPhase?: TrustPhase;
}

export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({ trustPhase = 'green' }) => {
  return (
    <div className={clsx(
        "absolute inset-0 pointer-events-none z-[100] overflow-hidden opacity-20 transition-all duration-500",
        trustPhase === 'red' && "animate-pulse opacity-60 bg-[#FF0000]/5",
        trustPhase === 'orange' && "opacity-50"
    )}>
       {/* Grid pattern overlay (cellular automata grid) */}
       <div className={clsx(
           "w-full h-full bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none",
           trustPhase === 'red' && "animate-[pulse_0.1s_infinite]"
       )} />

       {/* Sweeping scan line */}
       <div className={clsx(
           "absolute top-0 left-0 w-full h-2 bg-[#00FF00]/5 animate-scanline",
           trustPhase === 'red' && "bg-[#FF0000]/10 h-4 duration-75",
           trustPhase === 'orange' && "bg-[#FF0000]/5 h-3"
       )} />

       {trustPhase === 'red' && (
           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
               <span className="text-8xl font-black font-mono text-[#FF0000] rotate-45 border-4 border-[#FF0000] p-8 uppercase tracking-widest">
                   REVOKED
               </span>
           </div>
       )}
    </div>
  );
};
