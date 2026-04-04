import React from 'react';
import { TrustPhase } from '../types';
import { clsx } from 'clsx';

interface ScanlineOverlayProps {
  trustPhase?: TrustPhase;
}

export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({ trustPhase = 'green' }) => {
  return (
    <div className={clsx(
        "absolute inset-0 pointer-events-none z-[100] overflow-hidden mix-blend-multiply opacity-40 transition-all duration-500",
        trustPhase === 'red' && "animate-pulse opacity-60 mix-blend-hard-light bg-red-900/10",
        trustPhase === 'orange' && "opacity-50"
    )}>
       <div className={clsx(
           "w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none",
           trustPhase === 'red' && "animate-[pulse_0.1s_infinite]"
       )} />
       
       <div className={clsx(
           "absolute top-0 left-0 w-full h-2 bg-black/5 animate-scanline shadow-[0_0_15px_rgba(0,0,0,0.2)]",
           trustPhase === 'red' && "bg-red-500/20 h-4 duration-75",
           trustPhase === 'orange' && "bg-orange-500/10 h-3"
       )} />
       
       {trustPhase === 'red' && (
           <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
               <span className="text-9xl font-black text-red-600 rotate-45 border-4 border-red-600 p-8 rounded-xl uppercase tracking-widest">
                   REVOKED
               </span>
           </div>
       )}
    </div>
  );
};
