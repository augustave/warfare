import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { Terminal } from './components/Terminal';
import { MainStage, MainStageHandle } from './components/MainStage';
import { DataOverlay } from './components/DataOverlay';
import { FormationType, LogEntry, SimulationStats, KnowledgeNode, TrustPhase, TrustHistoryItem, Budgets } from './types';
import { Menu, Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './components/ui/alert-dialog';
import { AfterActionReport } from './components/AfterActionReport';
import { soundEngine } from './utils/SoundEngine';
import { DebugOverlay } from './components/DebugOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { clamp, getFormationLockReason } from './utils/guards';

const COST_MODELS = {
  idle: { latency: 0.02, bandwidth: 0.01, energy: 0.02, attention: 0.00 },
  search: { latency: 0.08, bandwidth: 0.12, energy: 0.10, attention: 0.04 },
  shield: { latency: 0.06, bandwidth: 0.08, energy: 0.14, attention: 0.02 },
  strike: { latency: 0.14, bandwidth: 0.16, energy: 0.20, attention: 0.10 }
};

export default function App() {
  const [formation, setFormation] = useState<FormationType>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SimulationStats>({
    coverage: 0, networkStatus: 'nominal', threatLevel: 'low', latency: 12, trust: 98,
    budgets: { latency: 92, bandwidth: 88, energy: 90, attention: 80 }
  });
  const [trustHistory, setTrustHistory] = useState<TrustHistoryItem[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [isAAROpen, setIsAAROpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string; description: string; action: () => void;
  } | null>(null);

  const [debugVisible, setDebugVisible] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [activeLoopCount, setActiveLoopCount] = useState(0);
  const lastTickTimeRef = useRef(Date.now());
  const tickHzRef = useRef(10);

  const mainStageRef = useRef<MainStageHandle>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const statsRef = useRef(stats);
  const formationRef = useRef(formation);
  const tickCounterRef = useRef(0);

  useEffect(() => { formationRef.current = formation; }, [formation]);

  const trustPhase: TrustPhase =
    stats.trust >= 85 ? 'green' :
    stats.trust >= 70 ? 'yellow' :
    stats.trust >= 50 ? 'orange' : 'red';

  const handleLog = useCallback((message: string, type?: 'alert' | 'info' | 'success') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message, type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    if (type === 'alert') soundEngine.playAlert();
  }, []);

  const incurTrustDebt = useCallback((amount: number, reason: string) => {
    const newTrust = clamp(statsRef.current.trust - amount, 0, 100);
    statsRef.current = { ...statsRef.current, trust: newTrust };
    setStats(prev => ({ ...prev, trust: newTrust }));
    setTrustHistory(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      amount, reason
    }]);
    handleLog(`TRUST DEBT: -${amount} (${reason})`, 'alert');
  }, [handleLog]);

  const handleStatsUpdate = useCallback((newStats: Partial<SimulationStats>) => {
    statsRef.current = { ...statsRef.current, ...newStats };
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  const handleRestart = () => { window.location.reload(); };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setDebugVisible(prev => !prev); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  // SINGLE TICK LOOP
  useEffect(() => {
    if (tickIntervalRef.current !== null) return;
    setActiveLoopCount(c => c + 1);
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;
      tickHzRef.current = 1000 / (delta || 100);
      tickCounterRef.current++;
      setLoopCount(c => c + 1);

      const currentStats = statsRef.current;
      const currentFormation = formationRef.current;
      const costs = COST_MODELS[currentFormation];
      const jammingCosts = currentStats.networkStatus === 'jammed'
        ? { bandwidth: 0.22, latency: 0.10, attention: 0.06 }
        : { bandwidth: 0, latency: 0, attention: 0 };

      const newBudgets = {
        latency: clamp(currentStats.budgets.latency - costs.latency - jammingCosts.latency, 0, 100),
        bandwidth: clamp(currentStats.budgets.bandwidth - costs.bandwidth - jammingCosts.bandwidth, 0, 100),
        energy: clamp(currentStats.budgets.energy - costs.energy, 0, 100),
        attention: clamp(currentStats.budgets.attention - costs.attention - jammingCosts.attention, 0, 100)
      };

      let newTrust = currentStats.trust;
      if (tickCounterRef.current % 20 === 0) {
        if (currentStats.coverage < 60 && newTrust > 0) {
          newTrust = clamp(newTrust - 0.5, 0, 100);
        }
      }

      statsRef.current = { ...currentStats, budgets: newBudgets, trust: newTrust };
      if (tickCounterRef.current % 5 === 0) {
        setStats(prev => ({ ...prev, budgets: newBudgets, trust: newTrust }));
      }
    }, 100);

    tickIntervalRef.current = intervalId;
    return () => {
      if (tickIntervalRef.current !== null) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
        setActiveLoopCount(c => c - 1);
      }
    };
  }, []);

  const applyBudgetCost = (burst: Partial<Budgets>) => {
    const prev = statsRef.current;
    const newBudgets = {
      latency: clamp(prev.budgets.latency - (burst.latency || 0), 0, 100),
      bandwidth: clamp(prev.budgets.bandwidth - (burst.bandwidth || 0), 0, 100),
      energy: clamp(prev.budgets.energy - (burst.energy || 0), 0, 100),
      attention: clamp(prev.budgets.attention - (burst.attention || 0), 0, 100)
    };
    statsRef.current = { ...prev, budgets: newBudgets };
    setStats(s => ({ ...s, budgets: newBudgets }));
  };

  const executeActionWithTrust = (
    action: () => void, debtAmount: number, actionName: string,
    requireConfirmBelow: number = 70, burstCost?: Partial<Budgets>
  ) => {
    const lowAttention = statsRef.current.budgets.attention < 40;
    if (statsRef.current.trust < requireConfirmBelow || lowAttention) {
      setPendingAction({
        title: lowAttention ? "ATTENTION CRITICAL" : "TRUST DEGRADED",
        description: lowAttention
          ? `Attention is at ${Math.floor(statsRef.current.budgets.attention)}%. Manual confirmation required.`
          : `System confidence is ${Math.floor(statsRef.current.trust)}%. Action incurs -${debtAmount} debt. Authorize?`,
        action: () => {
          action(); incurTrustDebt(debtAmount, actionName);
          if (burstCost) applyBudgetCost(burstCost);
          setPendingAction(null);
        }
      });
      soundEngine.playAlert();
    } else {
      action(); incurTrustDebt(debtAmount, actionName);
      if (burstCost) applyBudgetCost(burstCost);
    }
  };

  const handleFormationChange = (f: FormationType) => {
    const s = statsRef.current;
    const lockReason = getFormationLockReason(f, s.trust, s.budgets);
    if (lockReason) { handleLog(`DENIED: ${lockReason}`, 'alert'); return; }
    if (f === 'strike') {
      executeActionWithTrust(() => setFormation(f), 6, "Kill Web", 70, { latency: 4, bandwidth: 6, energy: 10, attention: 8 });
    } else { setFormation(f); }
  };

  const handleSpawnHostile = () => {
    executeActionWithTrust(() => mainStageRef.current?.spawnHostile(), 3, "Spawn Hostile", 70, { attention: 6 });
  };
  const handleTriggerJamming = () => {
    executeActionWithTrust(() => mainStageRef.current?.triggerJamming(), 4, "Comms Jamming", 70, { bandwidth: 22, latency: 10, attention: 6 });
  };
  const handleTriggerFlashWar = () => {
    executeActionWithTrust(() => mainStageRef.current?.triggerFlashWar(), 10, "Flash War", 70, { attention: 18, latency: 8, bandwidth: 6 });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEngine.setEnabled(next);
    if (next) soundEngine.playClick();
    setSoundEnabled(next);
  };

  const elapsed = Math.floor((Date.now() - startTime) / 1000);

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-black flex flex-col">

      <DebugOverlay stats={stats} tickHz={tickHzRef.current} tickCount={loopCount} activeLoops={activeLoopCount} />

      {/* ═══ TOP BEAM — Title + Formation ═══ */}
      <div className="beam-h-heavy shrink-0 flex items-center justify-between px-6 text-white">
        <div className="flex items-center gap-6">
          <span className="font-black text-[13px] tracking-[0.15em]">AGENTIC WARFARE SIMULATION</span>
          <span className="text-[10px] opacity-60 tracking-wider hidden md:inline">DIAGRAM NO. 2</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tracking-wider">
          <span className="hidden md:inline opacity-60">T+{elapsed}S</span>
          <span className="font-black">{formation.toUpperCase()}</span>
          <button onClick={toggleSound} className="opacity-60 hover:opacity-100">
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="opacity-60 hover:opacity-100"><Menu size={14} /></button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] sm:w-[380px] p-0 overflow-y-auto bg-white">
                <SheetHeader className="p-4 border-b-[3px] border-black">
                  <SheetTitle className="text-left text-[11px] font-black uppercase tracking-widest">Control</SheetTitle>
                </SheetHeader>
                <ControlPanel
                  className="w-full"
                  currentFormation={formation}
                  setFormation={handleFormationChange}
                  spawnHostile={handleSpawnHostile}
                  triggerJamming={handleTriggerJamming}
                  triggerFlashWar={handleTriggerFlashWar}
                  onAction={() => setIsMobileMenuOpen(false)}
                  trust={stats.trust}
                  budgets={stats.budgets}
                />
                <StatsPanel stats={stats} className="w-full" />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* LEFT PANEL — Controls */}
        <div className="hidden md:flex flex-col w-[240px] shrink-0 border-r-[6px] border-black overflow-y-auto">
          <ControlPanel
            currentFormation={formation}
            setFormation={handleFormationChange}
            spawnHostile={handleSpawnHostile}
            triggerJamming={handleTriggerJamming}
            triggerFlashWar={handleTriggerFlashWar}
            trust={stats.trust}
            budgets={stats.budgets}
            onEndOperation={() => setIsAAROpen(true)}
          />
        </div>

        {/* CENTER — Canvas + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Stage */}
          <div className="flex-1 relative overflow-hidden">
            <ErrorBoundary>
              <MainStage
                ref={mainStageRef}
                formation={formation}
                selectedNode={selectedNode}
                onAgentClick={setSelectedNode}
                onStatsUpdate={handleStatsUpdate}
                onLog={handleLog}
                trust={stats.trust}
                budgets={stats.budgets}
              />
            </ErrorBoundary>
            <DataOverlay node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
          {/* Terminal */}
          <Terminal logs={logs} />
        </div>

        {/* RIGHT PANEL — Stats */}
        <div className="hidden md:flex flex-col w-[240px] shrink-0 border-l-[6px] border-black overflow-y-auto">
          <StatsPanel stats={stats} />
        </div>
      </div>

      {/* ═══ BOTTOM BEAM — Timeline bar ═══ */}
      <div className="timeline-bar shrink-0 h-[28px] flex items-center justify-between px-6 text-[10px] tracking-wider">
        <span>TRUST {Math.floor(stats.trust)}%</span>
        <span>NRG {Math.floor(stats.budgets.energy)}%</span>
        <span>BW {Math.floor(stats.budgets.bandwidth)}%</span>
        <span>LAT {Math.floor(stats.budgets.latency)}%</span>
        <span>ATN {Math.floor(stats.budgets.attention)}%</span>
        <span className="hidden md:inline">NET {stats.networkStatus === 'nominal' ? 'MESH' : stats.networkStatus === 'jammed' ? 'OFFLINE' : 'EDGE'}</span>
        <span className="hidden md:inline">COV {stats.coverage}%</span>
      </div>

      {/* ═══ DIALOGS ═══ */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="bg-white border-[4px] border-black rounded-none p-0 max-w-md">
          <div className="beam-h-heavy flex items-center px-4 text-white">
            <span className="font-black text-[11px] tracking-wider">{pendingAction?.title}</span>
          </div>
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="sr-only">{pendingAction?.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-black text-[12px] font-bold uppercase leading-relaxed">
                {pendingAction?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex justify-end gap-3">
              <AlertDialogCancel className="brut-btn">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={pendingAction?.action} className="brut-btn brut-btn-active">
                Authorize
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AfterActionReport
        open={isAAROpen}
        onOpenChange={setIsAAROpen}
        stats={{
          startingTrust: 98,
          endingTrust: stats.trust,
          durationSeconds: Math.floor((Date.now() - startTime) / 1000),
          endingBudgets: stats.budgets
        }}
        history={trustHistory}
        onRestart={handleRestart}
      />
    </div>
  );
}
