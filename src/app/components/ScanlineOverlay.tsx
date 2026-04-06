import React from 'react';
import { TrustPhase } from '../types';
import { clsx } from 'clsx';

interface ScanlineOverlayProps {
  trustPhase?: TrustPhase;
}

export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({ trustPhase = 'green' }) => {
  return (
    <div className={clsx(
        "absolute inset-0 pointer-events-none z-[100] overflow-hidden transition-all duration-500",
        trustPhase === 'red' && "opacity-80",
        trustPhase === 'orange' && "opacity-60",
        trustPhase === 'yellow' && "opacity-30",
        trustPhase === 'green' && "opacity-20"
    )}>
       {/* CRT Phosphor Scanlines — horizontal lines every 3px */}
       <div className="w-full h-full crt-scanlines pointer-events-none" />

       {/* Sweeping scan line */}
       <div className={clsx(
           "absolute top-0 left-0 w-full h-[2px] animate-scanline",
           trustPhase === 'red' ? "bg-[#FF0000]/20 h-[4px]" :
           trustPhase === 'orange' ? "bg-[#FF0000]/10 h-[3px]" :
           "bg-[#00FF00]/8"
       )} />

       {/* Low-trust vignette */}
       {(trustPhase === 'red' || trustPhase === 'orange') && (
         <div className="absolute inset-0 pointer-events-none"
           style={{
             background: trustPhase === 'red'
               ? 'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.08) 100%)'
               : 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.05) 100%)'
           }}
         />
       )}

       {trustPhase === 'red' && (
           <div className="absolute inset-0 flex items-center justify-center opacity-8 pointer-events-none animate-pulse">
               <span className="font-pixel text-[48px] text-[#FF0000] rotate-12 border-4 border-[#FF0000] p-6 tracking-widest opacity-[0.08]">
                   REVOKED
               </span>
           </div>
       )}
    </div>
  );
};
