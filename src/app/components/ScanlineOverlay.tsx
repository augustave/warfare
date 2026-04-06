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
      trustPhase === 'red' && "opacity-100",
      trustPhase === 'orange' && "opacity-70",
      trustPhase === 'yellow' && "opacity-30",
      trustPhase === 'green' && "opacity-0"
    )}>
      {/* Noise/grain overlay at low trust — pure B&W static */}
      {(trustPhase === 'red' || trustPhase === 'orange') && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(0,0,0,0.03) 0px,
              rgba(0,0,0,0.03) 1px,
              transparent 1px,
              transparent 4px
            )`,
          }}
        />
      )}

      {/* REVOKED stamp */}
      {trustPhase === 'red' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[80px] font-black text-black opacity-[0.04] rotate-[-12deg] tracking-[0.2em] uppercase border-[6px] border-black p-8">
            REVOKED
          </span>
        </div>
      )}
    </div>
  );
};
