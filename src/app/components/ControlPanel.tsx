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
  const strikeLock = getFormationLockReason('strike', trust, b);
  const shieldLock = getFormationLockReason('shield', trust, b);
  const searchLock = getFormationLockReason('search', trust, b);

  return (
    <div className={clsx("flex flex-col h-full bg-white text-black", className)}>

      {/* Section: Doctrine */}
      <div className="p-5 border-b-[3px] border-black">
        <div className="node-label mb-3">Doctrine</div>
        <div className="space-y-2">
          <FormationRow
            active={currentFormation === 'idle'}
            onClick={() => handleFormation('idle')}
            label="Net Idle"
            code="01"
          />
          <FormationRow
            active={currentFormation === 'search'}
            onClick={() => handleFormation('search')}
            label="Sensing Grid"
            code="02"
            locked={!!searchLock}
          />
          <FormationRow
            active={currentFormation === 'shield'}
            onClick={() => handleFormation('shield')}
            label="A2AD Wall"
            code="03"
            locked={!!shieldLock}
          />
          <FormationRow
            active={currentFormation === 'strike'}
            onClick={() => handleFormation('strike')}
            label="Kill Web"
            code="04"
            locked={!!strikeLock}
          />
        </div>
      </div>

      {/* Beam separator */}
      <div className="beam-h" />

      {/* Section: Inject */}
      <div className="p-5 border-b-[3px] border-black">
        <div className="node-label mb-3">Injection</div>
        <div className="space-y-2">
          <button onClick={handleSpawn} className="brut-btn w-full text-left text-[11px]">
            + Spawn Hostile
            {trust < 70 && <span className="inv-inline ml-2 text-[8px]">CONFIRM</span>}
          </button>
          <button onClick={handleJamming} className="brut-btn w-full text-left text-[11px]">
            ~ Comms Jamming
            {trust < 70 && <span className="inv-inline ml-2 text-[8px]">CONFIRM</span>}
          </button>
          <button onClick={handleFlash} className="brut-btn w-full text-left text-[11px]">
            ! Flash War
            {trust < 70 && <span className="inv-inline ml-2 text-[8px]">CONFIRM</span>}
          </button>
        </div>
      </div>

      {/* Beam separator */}
      <div className="beam-h" />

      {/* Section: Cost Reference */}
      <div className="p-5 flex-1">
        <div className="node-label mb-2">Cost / Tick</div>
        <div className="text-[9px] font-bold uppercase leading-[1.8] tracking-wide opacity-40">
          <div>Idle — Low</div>
          <div>Sensing — BW Heavy</div>
          <div>A2AD — NRG Heavy</div>
          <div>Kill Web — All Channels</div>
        </div>
      </div>

      {/* End Operation */}
      {onEndOperation && (
        <div className="p-5 border-t-[3px] border-black">
          <button onClick={onEndOperation} className="brut-btn brut-btn-active w-full text-center text-[11px]">
            End Operation
          </button>
        </div>
      )}
    </div>
  );
};

interface FormationRowProps {
  active: boolean;
  onClick: () => void;
  label: string;
  code: string;
  locked?: boolean;
}

const FormationRow: React.FC<FormationRowProps> = ({ active, onClick, label, code, locked }) => (
  <button
    onClick={locked ? undefined : onClick}
    disabled={locked}
    className={clsx(
      "w-full flex items-center gap-3 py-2 px-3 text-left transition-all duration-75 border-[3px]",
      locked
        ? "opacity-15 cursor-not-allowed border-black"
        : active
          ? "bg-black text-white border-black"
          : "bg-white text-black border-black hover:bg-black hover:text-white"
    )}
  >
    <span className="text-[18px] font-black leading-none w-[28px]">{code}</span>
    <div>
      <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
    </div>
  </button>
);
