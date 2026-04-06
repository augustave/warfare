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
    <div className="h-screen w-screen overflow-hidden bg-[#D4D0C8] text-black font-sans grid grid-cols-1 md:grid-cols-[280px_1fr_280px] grid-rows-[60px_1fr_150px]">
      
      <DebugOverlay stats={stats} tickHz={tickHzRef.current} tickCount={loopCount} activeLoops={activeLoopCount} />

      {/* Header Left */}
      <div className="border-b-2 border-black p-4 md:p-6 flex flex-row items-center justify-between md:flex-col md:justify-center bg-[#D4D0C8] z-30 col-start-1 row-start-1 border-r border-black">
        <h1 className="text-[14px] uppercase tracking-[0.1em] font-bold leading-tight">
          ASCII Automata<br/>System v1.0 // CTRL
        </h1>
        
        {/* Mobile Menu Trigger */}
        <div className="flex md:hidden gap-2">
            <button onClick={toggleSound} className="p-2">
               {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} opacity={0.5} />}
            </button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <button className="p-2 border border-black hover:bg-black hover:text-white transition-colors">
                        <Menu size={18} />
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:w-[380px] p-0 overflow-y-auto bg-[#D4D0C8]">
                    <SheetHeader className="p-6 border-b border-black">
                        <SheetTitle className="text-left text-sm font-bold uppercase tracking-widest">
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
                    <div className="border-t border-black">
                        <StatsPanel stats={stats} className="border-none w-full" />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </div>

      {/* Header Right (Desktop Only) */}
      <div className="hidden md:flex border-b-2 border-black p-6 flex-col justify-center items-end bg-[#D4D0C8] z-30 col-start-3 row-start-1 border-l border-black text-[11px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-4">
             <button onClick={toggleSound} className="hover:opacity-50 transition-opacity">
               {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} opacity={0.5} />}
            </button>
            <div className="text-right">
                <span className="block">Ref: 2011fb7e</span>
                <span>Status: <span className={clsx(
                    formation === 'strike' ? "text-[#FF0000]" : "text-black"
                )}>{formation.toUpperCase()}</span></span>
            </div>
        </div>
      </div>

      {/* Left Panel (Controls - Desktop) */}
      <div className="hidden md:block row-start-2 row-span-2 col-start-1 h-full overflow-hidden z-20">
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

      {/* Main Stage (Spans full center column) */}
      <div className="row-start-1 row-span-3 col-start-1 md:col-start-2 h-full w-full relative z-0">
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

      {/* Right Panel (Stats) */}
      <div className="hidden md:block row-start-2 row-span-2 col-start-3 h-full overflow-hidden z-20">
        <StatsPanel stats={stats} />
      </div>

      {/* Terminal (Bottom Center Overlay) */}
      <div className="row-start-3 col-start-1 md:col-start-2 h-full w-full z-20 pointer-events-none flex flex-col justify-end">
        <div className="pointer-events-auto h-full w-full">
            <Terminal logs={logs} />
        </div>
      </div>
      
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="bg-[#D4D0C8] border-2 border-black rounded-none ">
            <AlertDialogHeader>
                <AlertDialogTitle className="uppercase font-bold tracking-widest text-[#FF0000] flex items-center gap-2">
                    <span className="text-xl">⚠️</span> {pendingAction?.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-black font-mono text-xs mt-2 border-l-2 border-black pl-4">
                    {pendingAction?.description}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
                <AlertDialogCancel className="rounded-none border-black hover:bg-black hover:text-white uppercase font-bold text-xs tracking-wider">
                    Abort
                </AlertDialogCancel>
                <AlertDialogAction 
                    onClick={pendingAction?.action}
                    className="rounded-none bg-[#FF0000] hover:bg-[#CC0000] text-white uppercase font-bold text-xs tracking-wider border-2 border-transparent"
                >
                    Authorize Action
                </AlertDialogAction>
            </AlertDialogFooter>
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
