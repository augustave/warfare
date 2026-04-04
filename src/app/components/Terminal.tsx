import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom isn't needed as we are prepending logs (newest at top) per original design,
  // but let's check the original design.
  // Original: `terminal.prepend(entry)` -> Newest on top.
  // CSS: `flex-direction: column-reverse` -> Actually, column-reverse with prepend means the DOM order is reversed visually?
  // Let's stick to a standard list where we map logs. 
  // If we map `logs` array, index 0 is newest.
  
  return (
    <div className="bg-[#F5F5F5] border-t-2 border-black p-4 h-[150px] font-mono text-[11px] overflow-hidden relative flex flex-col w-full">
        <div className="overflow-y-auto flex flex-col gap-1 h-full">
            {logs.map((log) => (
                <div 
                    key={log.id} 
                    className={clsx(
                        "opacity-70",
                        log.type === 'alert' && "text-[#FF3333] font-bold opacity-100",
                        log.type === 'success' && "text-green-700 font-bold opacity-100",
                        !log.type && "text-black"
                    )}
                >
                    <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                    {log.message}
                </div>
            ))}
            <div className="opacity-50 text-black font-bold">&gt; System initialized. Sensor Grid active.</div>
        </div>
    </div>
  );
};
