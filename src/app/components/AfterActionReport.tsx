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

const BudgetLine: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between text-[11px] font-bold uppercase">
    <span className="opacity-40">{label}</span>
    <span>{Math.floor(value)}%</span>
  </div>
);

export const AfterActionReport: React.FC<AfterActionReportProps> = ({
  open, onOpenChange, stats, history, onRestart
}) => {
  const totalDebt = stats.startingTrust - stats.endingTrust;
  const grade =
    stats.endingTrust >= 90 ? { letter: 'A', label: 'EXEMPLARY' } :
    stats.endingTrust >= 70 ? { letter: 'B', label: 'SATISFACTORY' } :
    stats.endingTrust >= 50 ? { letter: 'C', label: 'COMPROMISED' } :
    { letter: 'F', label: 'FAILURE' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-none border-[4px] border-black gap-0 bg-white">
        <div className="beam-h-heavy flex items-center px-5 text-white">
          <span className="font-black text-[11px] tracking-wider">After Action Report</span>
        </div>

        <DialogTitle className="sr-only">After Action Report</DialogTitle>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Metrics */}
            <div className="space-y-4">
              {/* Grade */}
              <div className="flex items-end justify-between border-b-[3px] border-black pb-3">
                <div>
                  <div className="node-label">Assessment</div>
                  <div className="text-[12px] font-bold uppercase mt-1">{grade.label}</div>
                </div>
                <div className="data-huge">{grade.letter}</div>
              </div>

              {/* Trust */}
              <div className="space-y-2">
                <div className="node-label">Trust Telemetry</div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="opacity-40">Start</span><span>{stats.startingTrust}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="opacity-40">Final</span><span>{Math.floor(stats.endingTrust)}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="opacity-40">Delta</span><span>-{totalDebt.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="opacity-40">Duration</span><span>{stats.durationSeconds}s</span>
                </div>
              </div>

              <div className="beam-h" />

              {/* Resources */}
              <div className="space-y-2">
                <div className="node-label">Final Resources</div>
                <BudgetLine label="Latency" value={stats.endingBudgets.latency} />
                <BudgetLine label="Bandwidth" value={stats.endingBudgets.bandwidth} />
                <BudgetLine label="Endurance" value={stats.endingBudgets.energy} />
                <BudgetLine label="Attention" value={stats.endingBudgets.attention} />
              </div>
            </div>

            {/* Right: Incident Log */}
            <div className="flex flex-col min-h-[280px]">
              <div className="node-label mb-2 flex justify-between items-center">
                <span>Incidents</span>
                <span className="inv-inline">{history.length}</span>
              </div>
              <ScrollArea className="flex-1 border-[3px] border-black">
                <div className="p-3 space-y-3 text-[10px] font-bold uppercase">
                  {history.length === 0 && (
                    <div className="text-center opacity-20 py-8">No adverse events.</div>
                  )}
                  {history.map((item, i) => (
                    <div key={i} className="border-b border-black/10 pb-2 last:border-0">
                      <div>{item.reason}</div>
                      <div className="opacity-30">{item.timestamp} // -{item.amount}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="beam-h mt-6 mb-4" />

          <div className="flex justify-end gap-3">
            <button className="brut-btn text-[11px]" onClick={() => onOpenChange(false)}>Close</button>
            <button className="brut-btn brut-btn-active text-[11px]" onClick={onRestart}>Acknowledge {'&'} Reset</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
