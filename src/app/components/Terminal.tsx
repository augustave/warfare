import React from 'react';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  return (
    <div className="bg-[#000000] border-t-2 border-black p-4 h-[150px] font-mono text-[10px] text-[#00FF00] overflow-hidden relative flex flex-col w-full">
        <div className="overflow-y-auto flex flex-col gap-1 h-full">
            {logs.map((log) => (
                <div
                    key={log.id}
                    className={clsx(
                        "opacity-70",
                        log.type === 'alert' && "text-[#FF0000] font-bold opacity-100",
                        log.type === 'success' && "text-[#00FF00] font-bold opacity-100",
                        !log.type && "text-[#00FF00]"
                    )}
                >
                    <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                    {log.message}
                </div>
            ))}
            <div className="opacity-50 text-[#00FF00] font-bold">&gt; System initialized. Sensor Grid active.</div>
        </div>
    </div>
  );
};
