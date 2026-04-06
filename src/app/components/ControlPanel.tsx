import React from 'react';
import { FormationType, Budgets } from '../types';
import { clsx } from 'clsx';
import { soundEngine } from '../utils/SoundEngine';
import { getFormationLockReason } from '../utils/guards';

interface ControlPanelProps {
  currentFormation: FormationType;
  setFormation: (f: FormationType) => void;
  spawnHostile: () => void;
  triggerJamming: () => void;
  triggerFlashWar: () => void;
  className?: string;
  onAction?: () => void;
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

  const handleSpawn = () => { soundEngine.playAlert(); spawnHostile(); onAction?.(); };
  const handleJamming = () => { soundEngine.playJamming(); triggerJamming(); onAction?.(); };
  const handleFlash = () => { soundEngine.playAlert(); triggerFlashWar(); onAction?.(); };

  const defaultBudgets = { latency: 100, bandwidth: 100, energy: 100, attention: 100 };
  const b = budgets || defaultBudgets;
  const strikeLockReason = getFormationLockReason('strike', trust, b);
  const shieldLockReason = getFormationLockReason('shield', trust, b);
  const searchLockReason = getFormationLockReason('search', trust, b);

  return (
    <div className={clsx("flex flex-col gap-1 h-full bg-[#D4D0C8] text-black", className)}>

      {/* Formation Group Box */}
      <div className="win95-window p-0">
        <div className="win95-titlebar text-[10px] py-[2px]">
          <span>Doctrine Control</span>
        </div>
        <div className="p-2 space-y-1">
          <Win95Radio
            checked={currentFormation === 'idle'}
            onClick={() => handleFormation('idle')}
            label="01 Net_Idle"
            shortcut="F1"
          />
          <Win95Radio
            checked={currentFormation === 'search'}
            onClick={() => handleFormation('search')}
            label="02 Sensing_Grid"
            shortcut="F2"
            locked={!!searchLockReason}
            lockReason={searchLockReason || undefined}
          />
          <Win95Radio
            checked={currentFormation === 'shield'}
            onClick={() => handleFormation('shield')}
            label="03 A2AD_Wall"
            shortcut="F3"
            locked={!!shieldLockReason}
            lockReason={shieldLockReason || undefined}
          />
          <Win95Radio
            checked={currentFormation === 'strike'}
            onClick={() => handleFormation('strike')}
            label="04 Kill_Web"
            shortcut="F4"
            locked={!!strikeLockReason}
            lockReason={strikeLockReason || undefined}
          />
        </div>
      </div>

      {/* Injection Group Box */}
      <div className="win95-window p-0">
        <div className="win95-titlebar text-[10px] py-[2px]">
          <span>Injection Parameters</span>
        </div>
        <div className="p-2 space-y-1">
          <button onClick={handleSpawn} className="win95-btn w-full text-[11px] flex items-center gap-2 normal-case">
            <span className="text-[#FF0000]">▶</span> Spawn Hostile
            {trust < 70 && <span className="ml-auto text-[9px] bg-[#FF0000] text-white px-1">!</span>}
          </button>
          <button onClick={handleJamming} className="win95-btn w-full text-[11px] flex items-center gap-2 normal-case">
            <span>▶</span> Comms Jamming
            {trust < 70 && <span className="ml-auto text-[9px] bg-[#FF0000] text-white px-1">!</span>}
          </button>
          <button onClick={handleFlash} className="win95-btn w-full text-[11px] flex items-center gap-2 normal-case">
            <span className="text-[#FF0000]">▶</span> Flash War
            {trust < 70 && <span className="ml-auto text-[9px] bg-[#FF0000] text-white px-1">!</span>}
          </button>
        </div>
      </div>

      {/* Cost Reference */}
      <div className="win95-groupbox text-[9px] font-mono leading-relaxed text-black/60">
        <span className="win95-groupbox-label text-[9px]">Cost Table</span>
        <div className="space-y-[2px]">
          <div>IDLE.... LAT:0.02 BW:0.01 NRG:0.02</div>
          <div>SEARCH.. LAT:0.08 BW:0.12 NRG:0.10</div>
          <div>SHIELD.. LAT:0.06 BW:0.08 NRG:0.14</div>
          <div className="text-[#FF0000]">STRIKE.. LAT:0.14 BW:0.16 NRG:0.20</div>
        </div>
      </div>

      <div className="mt-auto pt-1">
        <button
          onClick={onEndOperation}
          className="win95-btn w-full text-[11px] font-bold text-center normal-case"
        >
          End Operation ▪ Report
        </button>
      </div>
    </div>
  );
};

interface Win95RadioProps {
  checked: boolean;
  onClick: () => void;
  label: string;
  shortcut?: string;
  locked?: boolean;
  lockReason?: string;
}

const Win95Radio: React.FC<Win95RadioProps> = ({ checked, onClick, label, shortcut, locked, lockReason }) => (
  <button
    onClick={locked ? undefined : onClick}
    disabled={locked}
    title={lockReason || ''}
    className={clsx(
      "w-full text-[11px] flex items-center gap-2 py-[3px] px-1 cursor-default normal-case",
      locked ? "opacity-40" : "hover:bg-[#000080] hover:text-white",
      checked && "font-bold"
    )}
  >
    {/* Win95-style radio button */}
    <span className="w-[12px] h-[12px] rounded-full border border-[#808080] border-r-white border-b-white bg-white flex items-center justify-center shrink-0">
      {checked && <span className="w-[6px] h-[6px] rounded-full bg-black" />}
    </span>
    {locked && <span className="text-[9px]">🔒</span>}
    <span>{label}</span>
    {shortcut && <span className="ml-auto text-[9px] opacity-40">{shortcut}</span>}
  </button>
);
