import React from 'react';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  return (
    <div className="win95-window p-0 h-[160px] flex flex-col">
      <div className="win95-titlebar text-[10px] py-[2px] shrink-0">
        <span>C:\ASCIIAUTOMATA\output.log</span>
        <div className="flex gap-[2px]">
          <button className="win95-sys-btn">_</button>
          <button className="win95-sys-btn">×</button>
        </div>
      </div>
      <div className="flex-1 bg-[#000000] win95-inset font-mono text-[10px] text-[#00FF00] overflow-hidden relative crt-flicker">
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 crt-scanlines pointer-events-none z-10 opacity-30" />

        <div className="overflow-y-auto flex flex-col gap-0 h-full p-2 relative z-0">
          {logs.map((log) => (
            <div
              key={log.id}
              className={clsx(
                "leading-[1.6]",
                log.type === 'alert' && "text-[#FF0000] crt-glow",
                log.type === 'success' && "text-[#00FF00] crt-glow",
                !log.type && "text-[#00FF00] opacity-70"
              )}
            >
              <span className="opacity-40">[{log.timestamp}]</span>{' '}
              <span className="opacity-30">$</span>{' '}
              {log.message}
            </div>
          ))}
          <div className="text-[#00FF00] opacity-50 flex items-center gap-0">
            <span>C:\ASCIIAUTOMATA{'>'} </span>
            <span className="animate-blink">█</span>
          </div>
        </div>
      </div>
    </div>
  );
};
