import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { Terminal } from './components/Terminal';
import { MainStage, MainStageHandle } from './components/MainStage';
import { DataOverlay } from './components/DataOverlay';
import { FormationType, LogEntry, SimulationStats, KnowledgeNode, TrustPhase, TrustHistoryItem, Budgets } from './types';
import { clsx } from 'clsx';
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
  search: { latency: 0.08, bandwidth: 0.12, energy: 0.10, attention: 0.04 }, // sensing_grid
  shield: { latency: 0.06, bandwidth: 0.08, energy: 0.14, attention: 0.02 }, // a2ad_wall
  strike: { latency: 0.14, bandwidth: 0.16, energy: 0.20, attention: 0.10 }  // kill_web
};

export default function App() {
  // State
  const [formation, setFormation] = useState<FormationType>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SimulationStats>({
    coverage: 0,
    networkStatus: 'nominal',
    threatLevel: 'low',
    latency: 12,
    trust: 98,
    budgets: {
        latency: 92,
        bandwidth: 88,
        energy: 90,
        attention: 80
    }
  });
  const [trustHistory, setTrustHistory] = useState<TrustHistoryItem[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [isAAROpen, setIsAAROpen] = useState(false);
  
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  // Debug State
  const [debugVisible, setDebugVisible] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [activeLoopCount, setActiveLoopCount] = useState(0); // Track active loops
  const lastTickTimeRef = useRef(Date.now());
  const tickHzRef = useRef(10);
  
  // Refs for logic loop (Single Source of Truth)
  const mainStageRef = useRef<MainStageHandle>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const statsRef = useRef(stats); // Authoritative State
  const formationRef = useRef(formation); // Stable Ref for loop
  const tickCounterRef = useRef(0);

  // Sync refs with state
  // We sync statsRef ONLY when stats changes from an external source (like MainStage updates or manual actions)
  // BUT the loop updates statsRef itself.
  useEffect(() => { formationRef.current = formation; }, [formation]);
  
  // Derived State
  const trustPhase: TrustPhase = 
    stats.trust >= 85 ? 'green' :
    stats.trust >= 70 ? 'yellow' :
    stats.trust >= 50 ? 'orange' : 'red';

  // Handlers
  const handleLog = useCallback((message: string, type?: 'alert' | 'info' | 'success') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    if (type === 'alert') soundEngine.playAlert();
  }, []);

  const incurTrustDebt = useCallback((amount: number, reason: string) => {
    // Immediate update
    const newTrust = clamp(statsRef.current.trust - amount, 0, 100);
    statsRef.current = { ...statsRef.current, trust: newTrust };
    setStats(prev => ({ ...prev, trust: newTrust })); // Sync React
    
    setTrustHistory(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        amount,
        reason
    }]);
    handleLog(`TRUST DEBT INCURRED: -${amount} (${reason})`, 'alert');
  }, [handleLog]);

  const handleStatsUpdate = useCallback((newStats: Partial<SimulationStats>) => {
    // Merge into Ref
    statsRef.current = { ...statsRef.current, ...newStats };
    // Merge into React State
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  const handleRestart = () => {
      window.location.reload(); 
  };

  // Toggle Debug
  useEffect(() => {
      const down = (e: KeyboardEvent) => {
          if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              setDebugVisible(prev => !prev);
          }
      };
      window.addEventListener('keydown', down);
      return () => window.removeEventListener('keydown', down);
  }, []);

  // SINGLE TICK LOOP
  useEffect(() => {
    // 1. Guard: If loop exists, abort
    if (tickIntervalRef.current !== null) {
        console.warn("Duplicate tick loop detected. Aborting.");
        return;
    }

    // 2. Start Loop
    setActiveLoopCount(c => c + 1);
    const intervalId = window.setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickTimeRef.current;
        lastTickTimeRef.current = now;
        tickHzRef.current = 1000 / (delta || 100);
        tickCounterRef.current++;
        setLoopCount(c => c + 1);

        // Simulation Step
        const currentStats = statsRef.current;
        const currentFormation = formationRef.current;
        const costs = COST_MODELS[currentFormation];
        
        // Jamming Costs
        const jammingCosts = currentStats.networkStatus === 'jammed' 
            ? { bandwidth: 0.22, latency: 0.10, attention: 0.06 } 
            : { bandwidth: 0, latency: 0, attention: 0 };
            
        const newBudgets = {
            latency: clamp(currentStats.budgets.latency - costs.latency - jammingCosts.latency, 0, 100),
            bandwidth: clamp(currentStats.budgets.bandwidth - costs.bandwidth - jammingCosts.bandwidth, 0, 100),
            energy: clamp(currentStats.budgets.energy - costs.energy, 0, 100),
            attention: clamp(currentStats.budgets.attention - costs.attention - jammingCosts.attention, 0, 100)
        };

        // Low Awareness Logic (every 20 ticks = 2s)
        let newTrust = currentStats.trust;
        if (tickCounterRef.current % 20 === 0) {
            if (currentStats.coverage < 60 && newTrust > 0) {
                newTrust = clamp(newTrust - 0.5, 0, 100);
            }
        }

        // Update Ref
        statsRef.current = {
            ...currentStats,
            budgets: newBudgets,
            trust: newTrust
        };

        // Throttle React Updates (Every 5 ticks = 500ms = 2Hz)
        if (tickCounterRef.current % 5 === 0) {
            setStats(prev => ({
                ...prev,
                budgets: newBudgets,
                trust: newTrust
            }));
        }

    }, 100);

    tickIntervalRef.current = intervalId;

    // 3. Cleanup
    return () => {
        if (tickIntervalRef.current !== null) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
            setActiveLoopCount(c => c - 1);
        }
    };
  }, []); // Empty dependency array = Runs once on mount

  const applyBudgetCost = (burst: Partial<Budgets>) => {
      // Apply to Ref immediately
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
      action: () => void, 
      debtAmount: number, 
      actionName: string, 
      requireConfirmBelow: number = 70,
      burstCost?: Partial<Budgets>
  ) => {
      const lowAttention = statsRef.current.budgets.attention < 40;
      
      if (statsRef.current.trust < requireConfirmBelow || lowAttention) {
          setPendingAction({
              title: lowAttention ? "ATTENTION CRITICAL: CONFIRM ACTION" : "TRUST DEGRADED: CONFIRM ACTION",
              description: lowAttention 
                  ? `Operator attention is low (${Math.floor(statsRef.current.budgets.attention)}%). Oversight capacity strained. Confirm manually.`
                  : `System confidence is low (${Math.floor(statsRef.current.trust)}%). This action will incur further debt (-${debtAmount}). Human authorization required.`,
              action: () => {
                  action();
                  incurTrustDebt(debtAmount, actionName);
                  if (burstCost) applyBudgetCost(burstCost);
                  setPendingAction(null);
              }
          });
          soundEngine.playAlert();
      } else {
          action();
          incurTrustDebt(debtAmount, actionName);
          if (burstCost) applyBudgetCost(burstCost);
      }
  };

  const handleFormationChange = (f: FormationType) => {
      const s = statsRef.current;
      const lockReason = getFormationLockReason(f, s.trust, s.budgets);
      if (lockReason) {
          handleLog(`ACCESS DENIED: ${lockReason}`, 'alert');
          return;
      }

      // Debt/Cost for Kill Web
      if (f === 'strike') {
          executeActionWithTrust(() => setFormation(f), 6, "Formation: Kill Web", 70, {
              latency: 4, bandwidth: 6, energy: 10, attention: 8
          });
      } else {
          setFormation(f);
      }
  };

  const handleSpawnHostile = () => {
      executeActionWithTrust(
          () => mainStageRef.current?.spawnHostile(),
          3,
          "Spawn Hostile",
          70,
          { attention: 6 }
      );
  };

  const handleTriggerJamming = () => {
      executeActionWithTrust(
          () => mainStageRef.current?.triggerJamming(),
          4,
          "Comms Jamming",
          70,
          { bandwidth: 22, latency: 10, attention: 6 }
      );
  };
  
  const handleTriggerFlashWar = () => {
      executeActionWithTrust(
          () => mainStageRef.current?.triggerFlashWar(),
          10,
          "Flash War",
          70,
          { attention: 18, latency: 8, bandwidth: 6 }
      );
  };

  const toggleSound = () => {
      const next = !soundEnabled;
      soundEngine.setEnabled(next);
      if (next) soundEngine.playClick();
      setSoundEnabled(next);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#008080] p-1 md:p-2 flex flex-col">

      <DebugOverlay stats={stats} tickHz={tickHzRef.current} tickCount={loopCount} activeLoops={activeLoopCount} />

      {/* ═══ MAIN WINDOW FRAME ═══ */}
      <div className="win95-window flex-1 flex flex-col overflow-hidden">

        {/* ─── Title Bar ─── */}
        <div className="win95-titlebar shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[8px]">■</span>
            <span>ASCII Automata System v1.0</span>
            <span className="text-[9px] opacity-60 ml-2 hidden md:inline">
              [{formation.toUpperCase()}] // PID:{Math.floor(stats.trust).toString(16).toUpperCase().padStart(2,'0')}h // T+{Math.floor((Date.now() - startTime) / 1000)}s
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleSound} className="win95-sys-btn" title={soundEnabled ? "Mute" : "Unmute"}>
              {soundEnabled ? '♪' : '×'}
            </button>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="win95-sys-btn" title="Menu">☰</button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:w-[380px] p-0 overflow-y-auto bg-[#D4D0C8]">
                    <SheetHeader className="p-4 border-b border-black">
                        <SheetTitle className="text-left text-[11px] font-bold">
                            System Control
                        </SheetTitle>
                    </SheetHeader>
                    <ControlPanel
                        className="border-none w-full"
                        currentFormation={formation}
                        setFormation={handleFormationChange}
                        spawnHostile={handleSpawnHostile}
                        triggerJamming={handleTriggerJamming}
                        triggerFlashWar={handleTriggerFlashWar}
                        onAction={() => setIsMobileMenuOpen(false)}
                        trust={stats.trust}
                        budgets={stats.budgets}
                    />
                    <StatsPanel stats={stats} className="border-none w-full" />
                </SheetContent>
              </Sheet>
            </div>

            <button className="win95-sys-btn hidden md:inline-flex" title="Minimize">_</button>
            <button className="win95-sys-btn hidden md:inline-flex" title="Maximize">□</button>
            <button className="win95-sys-btn hidden md:inline-flex" title="Close">×</button>
          </div>
        </div>

        {/* ─── Menu Bar ─── */}
        <div className="shrink-0 bg-[#D4D0C8] border-b border-[#808080] px-1 py-[2px] text-[11px] hidden md:flex gap-0 items-center">
          <span className="px-2 py-[1px] hover:bg-[#000080] hover:text-white cursor-default"><u>F</u>ile</span>
          <span className="px-2 py-[1px] hover:bg-[#000080] hover:text-white cursor-default"><u>V</u>iew</span>
          <span className="px-2 py-[1px] hover:bg-[#000080] hover:text-white cursor-default"><u>S</u>imulation</span>
          <span className="px-2 py-[1px] hover:bg-[#000080] hover:text-white cursor-default"><u>D</u>octrine</span>
          <span className="px-2 py-[1px] hover:bg-[#000080] hover:text-white cursor-default"><u>H</u>elp</span>
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-black/50">
            <span>Ref:2011fb7e</span>
            <span className={clsx(formation === 'strike' && "text-[#FF0000] font-bold")}>
              MODE:{formation.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ─── Main Content Area ─── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Left Panel (Controls) */}
          <div className="hidden md:flex flex-col w-[260px] shrink-0 bg-[#D4D0C8] p-1">
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

          {/* Center: Stage + Terminal */}
          <div className="flex-1 flex flex-col overflow-hidden p-1">
            {/* Main Stage */}
            <div className="flex-1 relative win95-inset overflow-hidden">
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
              <DataOverlay
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            </div>

            {/* Terminal */}
            <div className="shrink-0 mt-1">
              <Terminal logs={logs} />
            </div>
          </div>

          {/* Right Panel (Stats) */}
          <div className="hidden md:flex flex-col w-[260px] shrink-0 bg-[#D4D0C8] p-1">
            <StatsPanel stats={stats} />
          </div>
        </div>

        {/* ─── Status Bar ─── */}
        <div className="win95-statusbar shrink-0 flex items-center gap-2 text-[10px] font-mono">
          <span className="win95-statusbar-field flex-1">
            {formation === 'strike' ? '⚠ STRIKE MODE ACTIVE' : 'Ready'}
          </span>
          <span className="win95-statusbar-field">
            TRUST:{Math.floor(stats.trust)}%
          </span>
          <span className="win95-statusbar-field">
            NRG:{Math.floor(stats.budgets.energy)}%
          </span>
          <span className="win95-statusbar-field">
            BW:{Math.floor(stats.budgets.bandwidth)}%
          </span>
          <span className="win95-statusbar-field hidden md:inline">
            NET:{stats.networkStatus === 'nominal' ? 'MESH' : stats.networkStatus === 'jammed' ? 'OFFLINE' : 'EDGE'}
          </span>
          <span className="win95-statusbar-field hidden md:inline">
            COV:{stats.coverage}%
          </span>
        </div>
      </div>

      {/* ═══ DIALOGS ═══ */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="win95-window p-0 rounded-none border-none max-w-md">
            <div className="win95-titlebar">
              <span>⚠ {pendingAction?.title}</span>
              <button className="win95-sys-btn" onClick={() => setPendingAction(null)}>×</button>
            </div>
            <div className="p-4 bg-[#D4D0C8]">
              <AlertDialogHeader>
                <AlertDialogTitle className="sr-only">{pendingAction?.title}</AlertDialogTitle>
                <AlertDialogDescription className="text-black font-mono text-[11px] flex items-start gap-3">
                  <span className="text-3xl leading-none">⚠</span>
                  <span>{pendingAction?.description}</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                <AlertDialogCancel className="win95-btn text-[11px]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={pendingAction?.action}
                  className="win95-btn text-[11px] font-bold"
                >
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
