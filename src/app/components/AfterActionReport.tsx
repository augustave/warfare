import React from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { TrustHistoryItem, Budgets } from '../types';

interface AfterActionReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    startingTrust: number;
    endingTrust: number;
    durationSeconds: number;
    endingBudgets: Budgets;
  };
  history: TrustHistoryItem[];
  onRestart: () => void;
}

const toHex = (n: number) => Math.floor(n).toString(16).toUpperCase().padStart(2, '0');

const BudgetRow: React.FC<{ label: string; value: number; addr: string }> = ({ label, value, addr }) => {
  const color = value < 40 ? '#FF0000' : value < 70 ? '#808000' : '#000000';
  return (
    <div className="flex justify-between font-mono text-[11px]">
      <span className="text-black/50">{addr}</span>
      <span>{label}</span>
      <span style={{ color }} className="font-bold">{Math.floor(value)}% [0x{toHex(value)}]</span>
    </div>
  );
};

export const AfterActionReport: React.FC<AfterActionReportProps> = ({
  open,
  onOpenChange,
  stats,
  history,
  onRestart
}) => {
  const totalDebt = stats.startingTrust - stats.endingTrust;
  const incidentCount = history.length;

  const grade =
    stats.endingTrust >= 90 ? { letter: 'A', color: '#008000', label: 'EXEMPLARY' } :
    stats.endingTrust >= 70 ? { letter: 'B', color: '#000080', label: 'SATISFACTORY' } :
    stats.endingTrust >= 50 ? { letter: 'C', color: '#FF0000', label: 'COMPROMISED' } :
    { letter: 'F', color: '#FF0000', label: 'FAILURE' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-none border-none gap-0 bg-transparent">
        <div className="win95-window flex flex-col">

          {/* Title Bar */}
          <div className="win95-titlebar">
            <span>After Action Report — Session Complete</span>
            <div className="flex gap-[2px]">
              <button className="win95-sys-btn" onClick={() => onOpenChange(false)}>×</button>
            </div>
          </div>

          <DialogTitle className="sr-only">After Action Report</DialogTitle>

          {/* Body */}
          <div className="bg-[#D4D0C8] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Left: Metrics */}
              <div className="space-y-3">
                {/* Grade */}
                <div className="win95-inset p-3 bg-white flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-black/50 font-mono">ASSESSMENT GRADE</div>
                    <div className="text-[10px] font-bold" style={{ color: grade.color }}>{grade.label}</div>
                  </div>
                  <div className="font-pixel text-[28px]" style={{ color: grade.color }}>
                    {grade.letter}
                  </div>
                </div>

                {/* Trust Telemetry */}
                <div className="win95-groupbox">
                  <span className="win95-groupbox-label text-[9px]">Trust Telemetry</span>
                  <div className="font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-black/50">START</span>
                      <span>{stats.startingTrust}% [0x{toHex(stats.startingTrust)}]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">FINAL</span>
                      <span style={{ color: grade.color }} className="font-bold">{Math.floor(stats.endingTrust)}% [0x{toHex(stats.endingTrust)}]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">DELTA</span>
                      <span className="text-[#FF0000]">-{totalDebt.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">T_DUR</span>
                      <span>{stats.durationSeconds}s</span>
                    </div>
                  </div>
                </div>

                {/* Resource State */}
                <div className="win95-groupbox">
                  <span className="win95-groupbox-label text-[9px]">Final Resources</span>
                  <div className="space-y-1">
                    <BudgetRow label="Latency" value={stats.endingBudgets.latency} addr="0x20" />
                    <BudgetRow label="Bandwidth" value={stats.endingBudgets.bandwidth} addr="0x21" />
                    <BudgetRow label="Endurance" value={stats.endingBudgets.energy} addr="0x22" />
                    <BudgetRow label="Attention" value={stats.endingBudgets.attention} addr="0x23" />
                  </div>
                </div>

                {/* Narrative */}
                <div className="win95-inset p-2 bg-white">
                  <div className="font-mono text-[10px] leading-relaxed">
                    Operational outcome shaped by <span className="font-bold">{incidentCount}</span> trust-degrading events.
                    Autonomous capability {stats.endingTrust < 50 ? "REVOKED" : "maintained"} at T+{stats.durationSeconds}s.
                    System integrity: {grade.label}.
                  </div>
                </div>
              </div>

              {/* Right: Incident Log */}
              <div className="flex flex-col min-h-[280px]">
                <div className="text-[10px] font-bold mb-1 flex justify-between items-center">
                  <span>Incident Log</span>
                  <span className="font-mono bg-black text-white px-1">{history.length}</span>
                </div>
                <ScrollArea className="flex-1 win95-inset bg-white">
                  <div className="p-2 space-y-2 font-mono text-[10px]">
                    {history.length === 0 && (
                      <div className="text-center text-black/30 py-8">
                        No adverse trust events recorded.
                      </div>
                    )}
                    {history.map((item, i) => (
                      <div key={i} className="border-b border-[#D4D0C8] pb-1 last:border-0">
                        <div className="text-[#FF0000] font-bold">{item.reason}</div>
                        <div className="text-black/40 flex gap-3">
                          <span>[{item.timestamp}]</span>
                          <span>DEBT:-{item.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#808080]">
              <button className="win95-btn text-[11px]" onClick={() => onOpenChange(false)}>
                Close
              </button>
              <button className="win95-btn text-[11px] font-bold" onClick={onRestart}>
                Acknowledge {'&'} Reset
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
