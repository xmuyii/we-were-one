/**
 * Shadow Shot - Mobile Controls Layout Customizer
 * Interactive screen where players can drag buttons and configure their preferred HUD layout.
 */

import React, { useState, useRef } from 'react';
import {
  MobileControlsConfig,
  ControlPosition,
  DEFAULT_MOBILE_CONTROLS,
  CLAW_MOBILE_CONTROLS,
  LEFTY_MOBILE_CONTROLS,
} from '../types';
import {
  X,
  RotateCcw,
  Check,
  Crosshair,
  Radio,
  Move,
  Flame,
  Sparkles,
  Zap,
  Sliders,
  Shield,
  Eye,
  Hand,
} from 'lucide-react';

interface MobileControlsEditorProps {
  initialConfig?: MobileControlsConfig;
  onSave: (config: MobileControlsConfig) => void;
  onClose: () => void;
}

type ControlKey =
  | 'joystickPos'
  | 'firePos'
  | 'adsPos'
  | 'pulsePos'
  | 'crouchPos'
  | 'reloadPos'
  | 'meleePos'
  | 'flarePos'
  | 'abilityPos';

interface ControlDefinition {
  key: ControlKey;
  label: string;
  icon: string;
  color: string;
  borderColor: string;
  defaultSize: number;
}

const CONTROL_DEFS: ControlDefinition[] = [
  {
    key: 'joystickPos',
    label: 'MOVE PAD',
    icon: 'move',
    color: 'bg-zinc-900/80 text-zinc-200',
    borderColor: 'border-zinc-500',
    defaultSize: 110,
  },
  {
    key: 'firePos',
    label: 'FIRE',
    icon: 'fire',
    color: 'bg-rose-950/90 text-rose-100',
    borderColor: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
    defaultSize: 76,
  },
  {
    key: 'adsPos',
    label: 'ADS SCOPE',
    icon: 'scope',
    color: 'bg-amber-950/90 text-amber-200',
    borderColor: 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
    defaultSize: 66,
  },
  {
    key: 'pulsePos',
    label: 'PULSE',
    icon: 'pulse',
    color: 'bg-sky-950/90 text-sky-200',
    borderColor: 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]',
    defaultSize: 66,
  },
  {
    key: 'crouchPos',
    label: 'CROUCH',
    icon: 'crouch',
    color: 'bg-zinc-900/90 text-zinc-300',
    borderColor: 'border-zinc-600',
    defaultSize: 54,
  },
  {
    key: 'reloadPos',
    label: 'RELOAD',
    icon: 'reload',
    color: 'bg-emerald-950/90 text-emerald-200',
    borderColor: 'border-emerald-500',
    defaultSize: 54,
  },
  {
    key: 'meleePos',
    label: 'MELEE',
    icon: 'melee',
    color: 'bg-red-950/90 text-red-200',
    borderColor: 'border-red-600',
    defaultSize: 50,
  },
  {
    key: 'flarePos',
    label: 'FLARE',
    icon: 'flare',
    color: 'bg-amber-950/80 text-amber-300',
    borderColor: 'border-amber-600',
    defaultSize: 50,
  },
  {
    key: 'abilityPos',
    label: 'ABILITY',
    icon: 'ability',
    color: 'bg-indigo-950/80 text-indigo-200',
    borderColor: 'border-indigo-500',
    defaultSize: 50,
  },
];

export const MobileControlsEditor: React.FC<MobileControlsEditorProps> = ({
  initialConfig,
  onSave,
  onClose,
}) => {
  const [config, setConfig] = useState<MobileControlsConfig>(
    initialConfig || DEFAULT_MOBILE_CONTROLS
  );
  const [selectedKey, setSelectedKey] = useState<ControlKey>('firePos');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleSelectPreset = (preset: 'default' | 'claw' | 'lefty') => {
    if (preset === 'default') setConfig({ ...DEFAULT_MOBILE_CONTROLS });
    else if (preset === 'claw') setConfig({ ...CLAW_MOBILE_CONTROLS });
    else if (preset === 'lefty') setConfig({ ...LEFTY_MOBILE_CONTROLS });
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.min(95, Math.max(5, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.min(95, Math.max(5, Math.round(((clientY - rect.top) / rect.height) * 100)));

    setConfig((prev) => ({
      ...prev,
      preset: 'custom',
      [selectedKey]: {
        ...prev[selectedKey],
        x: xPct,
        y: yPct,
      },
    }));
  };

  const handlePointerDown = (key: ControlKey, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedKey(key);
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-mono select-none overflow-hidden animate-fadeIn">
      {/* Top Bar with Presets & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950 border-b border-zinc-800 z-20">
        <div className="flex items-center gap-2">
          <Hand className="w-5 h-5 text-amber-400" />
          <h2 className="text-xs md:text-sm font-bold tracking-wider text-zinc-100 uppercase">
            MOBILE CONTROLS LAYOUT EDITOR
          </h2>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-zinc-500 hidden sm:inline">PRESET:</span>
          {(['default', 'claw', 'lefty'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleSelectPreset(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                config.preset === p
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p === 'default' ? '2-Thumb' : p === 'claw' ? '3-Finger Claw' : 'Lefty'}
            </button>
          ))}
        </div>

        {/* Scale & Opacity */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Scale:</span>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={config.buttonScale}
              onChange={(e) =>
                setConfig((c) => ({ ...c, buttonScale: parseFloat(e.target.value) }))
              }
              className="w-16 accent-amber-400"
            />
            <span className="text-zinc-300">{Math.round(config.buttonScale * 100)}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Opacity:</span>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={config.buttonOpacity}
              onChange={(e) =>
                setConfig((c) => ({ ...c, buttonOpacity: parseFloat(e.target.value) }))
              }
              className="w-16 accent-amber-400"
            />
            <span className="text-zinc-300">{Math.round(config.buttonOpacity * 100)}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectPreset('default')}
            className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1"
            title="Reset to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={() => {
              onSave(config);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>SAVE LAYOUT</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 bg-zinc-950/90 overflow-hidden cursor-crosshair touch-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(39, 39, 42, 0.25) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Subtle Guidelines & Landscape Phone Frame */}
        <div className="absolute inset-4 border border-dashed border-zinc-800/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
          <div className="flex justify-between items-center text-[10px] text-zinc-600">
            <span>[TOP-LEFT: MINI-MAP / COMPASS]</span>
            <span className="text-amber-400 font-bold">
              TAP OR DRAG ANY CONTROL TO POSITION IT
            </span>
            <span>[TOP-RIGHT: STATUS]</span>
          </div>

          <div className="flex justify-center items-center pointer-events-none">
            <span className="text-zinc-800 font-mono text-sm tracking-widest uppercase">
              DRAG BUTTONS FREELY ACROSS SCREEN
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-600">
            <span>LEFT THUMB ZONE</span>
            <span>AIM & SWIPE CENTER ZONE</span>
            <span>RIGHT THUMB ZONE</span>
          </div>
        </div>

        {/* Draggable Buttons */}
        {CONTROL_DEFS.map((def) => {
          const pos: ControlPosition = config[def.key] || {
            x: 50,
            y: 50,
            size: def.defaultSize,
          };
          const baseSize = pos.size || def.defaultSize;
          const actualSize = Math.round(baseSize * config.buttonScale);
          const isSelected = selectedKey === def.key;

          return (
            <div
              key={def.key}
              onPointerDown={(e) => handlePointerDown(def.key, e)}
              className={`absolute flex flex-col items-center justify-center rounded-full border-2 cursor-grab active:cursor-grabbing select-none transition-transform active:scale-105 shadow-xl ${
                def.color
              } ${def.borderColor} ${
                isSelected
                  ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-105 z-30'
                  : 'z-20'
              }`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${actualSize}px`,
                height: `${actualSize}px`,
                transform: 'translate(-50%, -50%)',
                opacity: config.buttonOpacity,
              }}
            >
              {def.key === 'joystickPos' && <Move className="w-7 h-7 text-zinc-400" />}
              {def.key === 'firePos' && <Crosshair className="w-7 h-7 text-rose-300" />}
              {def.key === 'adsPos' && <Eye className="w-6 h-6 text-amber-300" />}
              {def.key === 'pulsePos' && <Radio className="w-6 h-6 text-sky-300" />}
              {def.key === 'crouchPos' && <Shield className="w-5 h-5 text-zinc-400" />}
              {def.key === 'reloadPos' && <RotateCcw className="w-5 h-5 text-emerald-300" />}
              {def.key === 'meleePos' && <Zap className="w-5 h-5 text-red-300" />}
              {def.key === 'flarePos' && <Flame className="w-5 h-5 text-amber-400" />}
              {def.key === 'abilityPos' && <Sparkles className="w-5 h-5 text-indigo-300" />}

              <span className="text-[9px] font-extrabold tracking-wider mt-0.5 pointer-events-none">
                {def.label}
              </span>

              {isSelected && (
                <div className="absolute -bottom-5 bg-black/90 px-1.5 py-0.5 rounded text-[8px] text-amber-300 border border-amber-500/50 whitespace-nowrap pointer-events-none">
                  X:{pos.x}% Y:{pos.y}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Hint */}
      <div className="p-2.5 bg-zinc-950 border-t border-zinc-900 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-4">
        <span>Selected: <strong className="text-amber-400">{CONTROL_DEFS.find((d) => d.key === selectedKey)?.label}</strong></span>
        <span>•</span>
        <span>Drag the circle to your preferred thumb position</span>
        <span>•</span>
        <span>Tap "Save Layout" when satisfied</span>
      </div>
    </div>
  );
};
