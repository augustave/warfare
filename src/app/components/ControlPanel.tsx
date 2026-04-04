import React from 'react';
import { FormationType, Budgets } from '../types';
import { clsx } from 'clsx';
import { Crosshair, Shield, Activity, Radio, Zap, TriangleAlert, Lock } from 'lucide-react';

import { soundEngine } from '../utils/SoundEngine';
import { getFormationLockReason } from '../utils/guards';

interface ControlPanelProps {
  currentFormation: FormationType;
  setFormation: (f: FormationType) => void;
  spawnHostile: () => void;
  triggerJamming: () => void;
  triggerFlashWar: () => void;
  className?: string;
  onAction?: () => void; // Callback for mobile close
  trust: number;
  budgets?: Budgets;
  onEndOperation?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentFormation,
  setFormation,
  spawnHostile,
  triggerJamming,
  triggerFlashWar,
  className,
  onAction,
  trust,
  budgets,
  onEndOperation
}) => {
  const handleFormation = (f: FormationType) => {
      if (budgets && getFormationLockReason(f, trust, budgets)) return;

      soundEngine.playTransform();
      setFormation(f);
      onAction?.();
  };

  const handleSpawn = () => {
      soundEngine.playAlert();
      spawnHostile();
      onAction?.();
  };
  
  const handleJamming = () => {
      soundEngine.playJamming();
      triggerJamming();
      onAction?.();
  };

  const handleFlash = () => {
      soundEngine.playAlert();
      triggerFlashWar();
      onAction?.();
  };

  // Helper for tooltips
  const getTooltip = (type: string) => {
      if (!budgets) return "";
      switch(type) {
          case 'idle': return "Cost: Low per tick | Primary: None";
          case 'search': return "Cost: High Bandwidth/Lat | Primary: Bandwidth";
          case 'shield': return "Cost: High Energy | Primary: Endurance";
          case 'strike': return "Cost: +Burst / Very High | Primary: All";
          case 'spawn': return "Cost: +6 Attention | Burst";
          case 'jamming': return "Cost: +Bandwidth Drain | Burst";
          case 'flash': return "Cost: +18 Attention | Burst";
          default: return "";
      }
  };

  // Lock checks (single source of truth)
  const defaultBudgets = { latency: 100, bandwidth: 100, energy: 100, attention: 100 };
  const b = budgets || defaultBudgets;
  const strikeLockReason = getFormationLockReason('strike', trust, b);
  const shieldLockReason = getFormationLockReason('shield', trust, b);
  const searchLockReason = getFormationLockReason('search', trust, b);
  const isStrikeLocked = !!strikeLockReason;
  const isShieldLocked = !!shieldLockReason;
  const isSearchLocked = !!searchLockReason;

  return (
    <div className={clsx("flex flex-col p-8 gap-4 border-r border-black/10 h-full bg-[#F5F5F5] text-black w-full md:w-[280px]", className)}>
      <div className="mb-8">
        <span className="text-[10px] uppercase opacity-60 block mb-2 font-bold tracking-widest">
          Swarm Behavior (ROE)
        </span>
        <div className="flex flex-col gap-1.5">
          <FormationButton
            active={currentFormation === 'idle'}
            onClick={() => handleFormation('idle')}
            label="01_Net_Idle"
            icon={<Activity size={14} />}
            title={getTooltip('idle')}
          />
          <FormationButton
            active={currentFormation === 'search'}
            onClick={() => handleFormation('search')}
            label="02_Sensing_Grid"
            icon={<Radio size={14} />}
            locked={!!isSearchLocked}
            title={searchLockReason ? `LOCKED: ${searchLockReason}` : getTooltip('search')}
          />
          <FormationButton
            active={currentFormation === 'shield'}
            onClick={() => handleFormation('shield')}
            label="03_A2AD_Wall"
            icon={<Shield size={14} />}
            locked={!!isShieldLocked}
            title={shieldLockReason ? `LOCKED: ${shieldLockReason}` : getTooltip('shield')}
          />
          <FormationButton
            active={currentFormation === 'strike'}
            onClick={() => handleFormation('strike')}
            label="04_Kill_Web"
            icon={<Crosshair size={14} />}
            locked={!!isStrikeLocked}
            title={strikeLockReason ? `LOCKED: ${strikeLockReason}` : getTooltip('strike')}
          />
        </div>
      </div>

      <div className="mb-8">
        <span className="text-[10px] uppercase opacity-60 block mb-2 font-bold tracking-widest">
          Adversarial Simulation
        </span>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleSpawn}
            title={getTooltip('spawn')}
            className="w-full p-2.5 text-[11px] font-bold uppercase tracking-wider border border-[#FF3333] text-[#FF3333] hover:bg-[#FF3333] hover:text-white transition-all text-left flex items-center gap-2 relative group"
          >
            <Crosshair size={14} />
            [+] Spawn Hostile
            {trust < 70 && <span className="ml-auto text-[9px] bg-[#FF3333] text-white px-1">CONFIRM</span>}
          </button>
          
          <button
            onClick={handleJamming}
            title={getTooltip('jamming')}
            className="w-full p-2.5 text-[11px] font-bold uppercase tracking-wider border border-black text-black hover:bg-black hover:text-[#F5F5F5] transition-all text-left flex items-center gap-2"
          >
            <Zap size={14} />
            Sim: Comms Jamming
             {trust < 70 && <span className="ml-auto text-[9px] bg-black text-white px-1">CONFIRM</span>}
          </button>
          
          <button
            onClick={handleFlash}
            title={getTooltip('flash')}
            className="w-full p-2.5 text-[11px] font-bold uppercase tracking-wider border border-black text-black hover:bg-black hover:text-[#F5F5F5] transition-all text-left flex items-center gap-2"
          >
            <TriangleAlert size={14} />
            Sim: Flash War
             {trust < 70 && <span className="ml-auto text-[9px] bg-black text-white px-1">CONFIRM</span>}
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-black/10">
         <button
            onClick={onEndOperation}
            className="w-full p-2.5 text-[11px] font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-all text-center"
         >
            End Operation // Report
         </button>
      </div>
    </div>
  );
};

interface FormationButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
  title?: string;
}

const FormationButton: React.FC<FormationButtonProps> = ({ active, onClick, label, icon, locked, title }) => (
  <button
    onClick={locked ? undefined : onClick}
    disabled={locked}
    className={clsx(
      "w-full p-2.5 text-[11px] font-bold uppercase tracking-wider border transition-all text-left flex items-center gap-2",
      locked 
        ? "opacity-40 cursor-not-allowed border-black text-black bg-transparent"
        : active
            ? "bg-black text-[#F5F5F5] border-black"
            : "bg-transparent text-black border-black hover:bg-black hover:text-[#F5F5F5]"
    )}
    title={title || (locked ? "Trust level too low for this formation" : "")}
  >
    {locked ? <Lock size={14} /> : icon}
    {label}
  </button>
);
