import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { TrustHistoryItem, Budgets } from '../types';
import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle2, FileText, Download, Battery, Activity, Zap, Wifi } from 'lucide-react';

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

interface BudgetResultProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const BudgetResult: React.FC<BudgetResultProps> = ({ label, value, icon }) => (
    <div className="flex justify-between items-center p-2 border border-black bg-white">
        <div className="flex items-center gap-2">
            {icon}
            <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
        </div>
        <span className={clsx("font-mono text-xs font-bold", value < 40 ? "text-[#FF0000]" : value < 70 ? "text-[#0000FF]" : "text-black")}>
            {Math.floor(value)}%
        </span>
    </div>
);

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
    stats.endingTrust >= 90 ? { letter: 'A', color: 'text-[#00FF00]', label: 'EXEMPLARY' } :
    stats.endingTrust >= 70 ? { letter: 'B', color: 'text-[#0000FF]', label: 'SATISFACTORY' } :
    stats.endingTrust >= 50 ? { letter: 'C', color: 'text-[#FF0000]', label: 'COMPROMISED' } :
    { letter: 'F', color: 'text-[#FF0000]', label: 'FAILURE' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#D4D0C8] border-2 border-black p-0 overflow-hidden rounded-none gap-0">

        {/* Header */}
        <div className="bg-black text-white p-6 flex justify-between items-start">
          <div>
            <DialogTitle className="text-xl uppercase font-black tracking-widest flex items-center gap-2">
              <FileText size={24} />
              After Action Report
            </DialogTitle>
            <div className="font-mono text-xs opacity-70 mt-1 uppercase">
              Ref: {Math.random().toString(36).substr(2, 8).toUpperCase()} // Session: {stats.durationSeconds}s
            </div>
          </div>
          <div className="text-right">
             <div className={clsx("text-4xl font-black leading-none", grade.color)}>
               {grade.letter}
             </div>
             <div className="text-[10px] font-bold tracking-widest uppercase opacity-80">
               {grade.label}
             </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Metrics */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest border-b border-black pb-2 mb-4">
                        Trust Telemetry
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs uppercase text-black opacity-60">Starting Confidence</span>
                            <span className="font-bold">{stats.startingTrust}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs uppercase text-black opacity-60">Final Confidence</span>
                            <span className={clsx("font-bold", grade.color)}>{stats.endingTrust}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs uppercase text-black opacity-60">Total Degradation</span>
                            <span className="font-bold text-[#FF0000]">-{totalDebt.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#FFFFFF] p-4 border border-black">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Narrative Summary</h4>
                    <p className="font-mono text-xs leading-relaxed">
                        Operational outcome was shaped by <span className="font-bold">{incidentCount}</span> trust-degrading decisions.
                        Autonomous capability was {stats.endingTrust < 50 ? "REVOKED" : "maintained"} by T+{stats.durationSeconds}.
                        System integrity is {grade.label.toLowerCase()}.
                    </p>
                </div>

                <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Final Resource State</h4>
                    <div className="grid grid-cols-2 gap-2">
                       <BudgetResult label="Latency" value={stats.endingBudgets.latency} icon={<Activity size={12}/>} />
                       <BudgetResult label="Bandwidth" value={stats.endingBudgets.bandwidth} icon={<Wifi size={12}/>} />
                       <BudgetResult label="Endurance" value={stats.endingBudgets.energy} icon={<Battery size={12}/>} />
                       <BudgetResult label="Attention" value={stats.endingBudgets.attention} icon={<Zap size={12}/>} />
                    </div>
                </div>
            </div>

            {/* Log */}
            <div className="h-full flex flex-col min-h-[300px]">
                 <h3 className="text-xs font-bold uppercase tracking-widest border-b border-black pb-2 mb-4 flex justify-between items-center">
                    <span>Incident Log</span>
                    <span className="text-[10px] bg-black text-white px-1.5 py-0.5">{history.length}</span>
                </h3>
                <ScrollArea className="flex-1 h-[200px] border border-black bg-white">
                    <div className="p-4 space-y-3">
                        {history.length === 0 && (
                            <div className="text-center text-black opacity-40 font-mono text-xs py-8 italic">
                                No adverse trust events recorded.
                            </div>
                        )}
                        {history.map((item, i) => (
                            <div key={i} className="flex gap-3 items-start border-b border-dashed border-black pb-2 last:border-0">
                                <AlertTriangle size={14} className="text-[#FF0000] mt-0.5 shrink-0" />
                                <div>
                                    <div className="text-xs font-bold uppercase">{item.reason}</div>
                                    <div className="text-[10px] font-mono text-black opacity-60 flex gap-2">
                                        <span>{item.timestamp}</span>
                                        <span className="text-[#FF0000] font-bold">-{item.amount} Trust</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-[#D4D0C8] p-6 border-t border-black flex justify-between items-center">
             <Button variant="outline" className="gap-2 bg-white border-black text-black hover:bg-black hover:text-white rounded-none uppercase text-xs font-bold tracking-wider">
                <Download size={14} />
                Export CSV
             </Button>
             <Button onClick={onRestart} className="gap-2 bg-black text-white hover:bg-[#00FF00] hover:text-black rounded-none uppercase text-xs font-bold tracking-wider">
                <CheckCircle2 size={14} />
                Acknowledge & Reset
             </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
