import React from 'react';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  return (
    <div className="shrink-0 border-t-[6px] border-black bg-black text-white h-[140px] flex flex-col">
      <div className="overflow-y-auto flex flex-col gap-0 h-full px-5 py-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className={clsx(
              "text-[10px] font-bold uppercase tracking-wide leading-[1.8]",
              log.type === 'alert' && "animate-blink",
              !log.type && "opacity-50"
            )}
          >
            <span className="opacity-30 mr-2">{log.timestamp}</span>
            {log.message}
          </div>
        ))}
        <div className="text-[10px] font-bold uppercase tracking-wide opacity-30 flex items-center">
          {'>'} <span className="animate-blink ml-1">_</span>
        </div>
      </div>
    </div>
  );
};
