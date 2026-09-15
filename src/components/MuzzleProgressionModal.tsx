/**
 * Shadow Shot - Muzzle Progression Attachment System
 * "The muzzle is the progression arc. You start loud. You end silent."
 *
 * Displays all 8 muzzle levels with stats, visual preview, rank unlocks,
 * faction-specific modifiers, and allows equipping/downgrading.
 */

import React from 'react';
import { MUZZLE_CONFIGS, MuzzleConfig, FactionType, RankTier } from '../types';
import { Shield, Volume2, Flame, Eye, Lock, CheckCircle, ArrowDownCircle, X } from 'lucide-react';

interface MuzzleProgressionModalProps {
  currentMuzzleLevel: number;
  unlockedMuzzleLevel: number;
  faction: FactionType;
  playerRank: RankTier;
  onSelectMuzzle: (level: number) => void;
  onClose: () => void;
}

export const MuzzleProgressionModal: React.FC<MuzzleProgressionModalProps> = ({
  currentMuzzleLevel,
  unlockedMuzzleLevel,
  faction,
  playerRank,
  onSelectMuzzle,
  onClose,
}) => {
  const isLogigi = faction === 'logigi';
  const factionDamageMod = isLogigi ? 2 : -2;
  const factionHumMod = isLogigi ? 2 : -2;

  // Render SVG barrel preview for each muzzle level
  const renderMuzzlePreview = (level: number) => {
    const accentColor = isLogigi ? '#f59e0b' : '#38bdf8';
    return (
      <svg width="72" height="28" viewBox="0 0 72 28" className="drop-shadow-sm">
        {/* Base barrel body */}
        <polygon points="28,8 72,12 72,20 28,18" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
        <line x1="30" y1="13" x2="72" y2="15" stroke="#3f3f46" strokeWidth="0.6" />

        {level === 0 && (
          // Bare muzzle
          <g>
            <polygon points="18,7 28,8 28,18 18,17" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />
            <line x1="20" y1="8" x2="20" y2="17" stroke="#52525b" strokeWidth="0.8" />
            <line x1="24" y1="8" x2="24" y2="18" stroke="#52525b" strokeWidth="0.8" />
          </g>
        )}

        {(level === 1 || level === 2) && (
          // Mk. I - II
          <g>
            <rect x="8" y="7" width="20" height="12" rx="1.5" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />
            <line x1="14" y1="7" x2="14" y2="19" stroke={accentColor} strokeWidth="1" opacity="0.8" />
            <circle cx="10" cy="13" r="1.5" fill="#09090b" />
          </g>
        )}

        {(level === 3 || level === 4) && (
          // Mk. III - IV Ribbed Suppressor
          <g>
            <rect x="4" y="6" width="24" height="14" rx="2" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            {[8, 12, 16, 20, 24].map((x) => (
              <line key={x} x1={x} y1="7" x2={x} y2="19" stroke="#3f3f46" strokeWidth="1" />
            ))}
            <line x1="4" y1="13" x2="28" y2="13" stroke={accentColor} strokeWidth="0.8" opacity="0.6" />
          </g>
        )}

        {level === 5 && (
          // Mk. V Sleek Shroud
          <g>
            <polygon points="2,6 28,5 28,21 2,20" fill="#09090b" stroke="#3f3f46" strokeWidth="1.2" />
            <line x1="2" y1="6" x2="28" y2="5" stroke={accentColor} strokeWidth="1.2" />
            <circle cx="6" cy="13" r="2" fill="#27272a" stroke={accentColor} strokeWidth="0.5" />
          </g>
        )}

        {level === 6 && (
          // Ghost Muzzle - Carbon Wrap
          <g>
            <polygon points="0,5 28,4 28,22 0,21" fill="#09090b" stroke="#27272a" strokeWidth="1" />
            <line x1="0" y1="5" x2="28" y2="4" stroke="#52525b" strokeWidth="0.6" strokeDasharray="2 2" />
            <polygon points="0,8 6,10 6,16 0,18" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5" />
          </g>
        )}

        {level === 7 && (
          // Silent Muzzle - Monolithic void
          <g>
            <polygon points="-2,5 28,4 28,22 -2,21" fill="#000000" stroke="#18181b" strokeWidth="1" />
            <line x1="-2" y1="5" x2="28" y2="4" stroke="#27272a" strokeWidth="0.5" opacity="0.4" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md">
      <div
        id="muzzle-progression-modal"
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-mono font-bold tracking-wider text-zinc-100 uppercase">
                Weapon Attachment — Muzzle Progression Arc
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                Rank: {playerRank}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-0.5 italic">
              "The muzzle is the progression arc. You start loud. You end silent."
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Close [ESC / M]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Faction Modifier Banner */}
        <div className="px-6 py-2.5 bg-black/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="text-zinc-400">FACTION SPEC:</span>
            <span
              className={`font-bold uppercase ${
                isLogigi ? 'text-amber-400' : 'text-sky-400'
              }`}
            >
              {faction === 'logigi' ? "L'ogigi (Solar Empire)" : "L'otito (Eclipse Resistance)"}
            </span>
            <span className="text-zinc-400">
              {isLogigi
                ? '+2% Lethal Damage, +2m Gunshot Hum'
                : '-2% Lethal Damage, -2m Gunshot Hum (Quieter)'}
            </span>
          </div>
          <div className="text-zinc-400">
            Current Muzzle: <span className="text-zinc-100 font-bold">Lvl {currentMuzzleLevel} ({MUZZLE_CONFIGS[currentMuzzleLevel]?.name})</span>
          </div>
        </div>

        {/* Muzzle Table Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          {MUZZLE_CONFIGS.map((muzzle: MuzzleConfig) => {
            const isEquipped = muzzle.level === currentMuzzleLevel;
            const isUnlocked = muzzle.level <= unlockedMuzzleLevel;
            const effectiveDmg = muzzle.damagePercent + factionDamageMod;
            const effectiveHum = Math.max(0, muzzle.humRadius + factionHumMod);

            return (
              <div
                key={muzzle.level}
                className={`p-3.5 rounded-lg border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isEquipped
                    ? 'bg-zinc-900/90 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : isUnlocked
                    ? 'bg-black/60 border-zinc-800 hover:border-zinc-600'
                    : 'bg-black/30 border-zinc-900 opacity-60'
                }`}
              >
                {/* Left: Level, Visual Model, Name & Rank Requirement */}
                <div className="flex items-center gap-4 min-w-[240px]">
                  {/* Barrel Preview SVG */}
                  <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800 flex items-center justify-center">
                    {renderMuzzlePreview(muzzle.level)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-400">
                        LVL {muzzle.level}
                      </span>
                      <span className="font-mono text-sm font-bold text-zinc-100">
                        {muzzle.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                      {isUnlocked ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 inline" /> Unlocked ({muzzle.rankUnlock})
                        </span>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 inline" /> Requires Rank: {muzzle.rankUnlock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Performance Metrics (Trail, Flash, Dmg, Range, Hum) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono flex-1 w-full md:w-auto">
                  {/* Gunshot Hum Radius */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                      <Volume2 className="w-3 h-3" /> Hum Footprint
                    </span>
                    <span className={`font-bold ${effectiveHum === 0 ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {effectiveHum} meters {effectiveHum === 0 && '(SILENT)'}
                    </span>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-sky-400 h-full"
                        style={{ width: `${(effectiveHum / 22) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Damage Output */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                      <Shield className="w-3 h-3" /> Lethal Damage
                    </span>
                    <span className="font-bold text-zinc-200">
                      {effectiveDmg}% {isLogigi ? '(+2%)' : '(-2%)'}
                    </span>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(effectiveDmg / 102) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Bullet Trail Duration */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                      <Flame className="w-3 h-3" /> Trail Duration
                    </span>
                    <span className="font-bold text-zinc-200">
                      {muzzle.trailDuration.toFixed(1)}s ({muzzle.trailLight})
                    </span>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-orange-400 h-full"
                        style={{ width: `${(muzzle.trailDuration / 2.0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Muzzle Flash Radius */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                      <Eye className="w-3 h-3" /> Flash Radius
                    </span>
                    <span className="font-bold text-zinc-200">
                      {muzzle.flashRadius > 0 ? `${muzzle.flashRadius.toFixed(1)}m` : '0m (Zero Flash)'}
                    </span>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-yellow-400 h-full"
                        style={{ width: `${(muzzle.flashRadius / 1.5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Equip / Downgrade Action */}
                <div className="w-full md:w-36 flex items-center justify-end">
                  {isEquipped ? (
                    <div className="w-full text-center px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-xs font-bold">
                      EQUIPPED
                    </div>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => onSelectMuzzle(muzzle.level)}
                      className="w-full px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {muzzle.level < currentMuzzleLevel ? (
                        <>
                          <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>DOWNGRADE</span>
                        </>
                      ) : (
                        <span>EQUIP</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-full text-center px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-600 font-mono text-xs cursor-not-allowed">
                      LOCKED
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>* Downgrading allows higher damage and range in exchange for a louder sound footprint.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
