/**
 * Shadow Shot - Canonical Lore Opening Screen
 * "We were all one. Suddenly, the L'ogigi came..."
 */

import React, { useState } from 'react';
import { Headphones, Shield, Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { FactionType, GameMode } from '../types';

interface OpeningScreenProps {
  onEnterSector7: (faction: FactionType, mode: GameMode) => void;
  onOpenTutorial: () => void;
  onOpenSpectator: () => void;
}

export const OpeningScreen: React.FC<OpeningScreenProps> = ({
  onEnterSector7,
  onOpenTutorial,
  onOpenSpectator,
}) => {
  const [stage, setStage] = useState<'lore' | 'setup'>('lore');
  const [selectedFaction, setSelectedFaction] = useState<FactionType>('lotito');
  const [selectedMode, setSelectedMode] = useState<GameMode>('tdm');

  const handleBegin = () => {
    soundEngine.init();
    soundEngine.resume();
    soundEngine.playPulseWhoomp(true);
    soundEngine.speakGuide('Put on headphones if you can. If not, the dark will still speak to you.');
    setStage('setup');
  };

  const handleLaunch = () => {
    soundEngine.init();
    soundEngine.resume();
    soundEngine.playPulseWhoomp(selectedFaction === 'lotito');
    onEnterSector7(selectedFaction, selectedMode);
  };

  return (
    <div className="relative w-full h-full bg-black text-zinc-100 flex flex-col items-center justify-center p-6 select-none cursor-default overflow-y-auto">
      {stage === 'lore' ? (
        /* STAGE 1: THE CANON L'OGIGI WAR LORE */
        <div className="flex flex-col items-center text-center max-w-2xl space-y-6 my-auto">
          {/* Subtle breathing glow */}
          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-ping mb-2" />

          <div className="space-y-4 font-mono text-zinc-300 text-sm md:text-base leading-relaxed tracking-wide">
            <p className="text-zinc-400 font-bold">We were all one.</p>
            <p>Suddenly, the L'ogigi came.</p>
            <p>They said the darkness was evil — that they were light-bringers.</p>
            <p className="text-zinc-100">
              But our ancestors said the darkness existed before the light.
            </p>
            <p>The L'ogigi did not agree.</p>
            <p className="text-sky-400 font-bold">
              And this was how the battle began — with our ancestors in the dark.
            </p>
          </div>

          {/* Audio advice */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 mt-6">
            <Headphones className="w-3.5 h-3.5 text-sky-400" />
            <span>"Put on headphones if you can. If not, the dark will still speak to you."</span>
          </div>

          {/* Enter Sector 7 Button */}
          <button
            onClick={handleBegin}
            className="mt-8 px-10 py-4 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.06)]"
          >
            <span>[ ENTER SECTOR 7 ]</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      ) : (
        /* STAGE 2: FACTION & MODE SELECTION */
        <div className="flex flex-col items-center max-w-3xl w-full space-y-6 my-auto">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-widest uppercase text-zinc-100">
              SECTOR 7 DEPLOYMENT
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              Choose your allegiance in the aftermath of the L'ogigi War
            </p>
          </div>

          {/* Faction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* L'ogigi (Light-Bringers) */}
            <div
              onClick={() => setSelectedFaction('logigi')}
              className={`p-5 rounded-xl border font-mono cursor-pointer transition-all ${
                selectedFaction === 'logigi'
                  ? 'bg-amber-950/30 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-zinc-100'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400 tracking-wider">
                  L'OGIGI (LIGHT-BRINGERS)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300">
                  FACTION
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                "Light is righteous. Darkness is evil." Uses light as a weapon. Aggressive, loud, bright.
              </p>
              <ul className="text-[11px] text-zinc-400 mt-3 space-y-1">
                <li>• Starting gear: 2 Flares, 1 Glow Stick</li>
                <li>• Ability: Illuminate (reveals enemies within 15m)</li>
                <li>• Warm gold bullet tracers, bright pulse wave</li>
                <li>• 12s pulse cooldown (20m radius)</li>
              </ul>
            </div>

            {/* L'otito (Truth-Keepers) */}
            <div
              onClick={() => setSelectedFaction('lotito')}
              className={`p-5 rounded-xl border font-mono cursor-pointer transition-all ${
                selectedFaction === 'lotito'
                  ? 'bg-sky-950/30 border-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.2)] text-zinc-100'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-400 tracking-wider">
                  L'OTITO (TRUTH-KEEPERS)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-300">
                  FACTION
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                "Darkness existed first. It is home." Uses darkness as a weapon. Patient, quiet, unseen.
              </p>
              <ul className="text-[11px] text-zinc-400 mt-3 space-y-1">
                <li>• Starting gear: 0 Flares, 2 Glow Sticks</li>
                <li>• Ability: Veil (silent & pulse-invisible for 5s)</li>
                <li>• Cool blue/violet tracers, +10% melee range</li>
                <li>• 8s pulse cooldown (30m radius)</li>
              </ul>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-mono">
            <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase block mb-3">
              SELECT OPERATION MODE
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <button
                onClick={() => setSelectedMode('tdm')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'tdm'
                    ? 'bg-zinc-800 border-sky-500 text-zinc-100 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div>TDM (60 LIVES)</div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1">
                  Team wipe 20s countdown
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('light_war')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'light_war'
                    ? 'bg-zinc-800 border-amber-500 text-zinc-100 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div>THE LIGHT WAR</div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1">
                  Best of 7 Beacon plant/defuse
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('ffa')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'ffa'
                    ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div>FREE-FOR-ALL</div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1">
                  Solo shadow hunt with respawn
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('br')}
                className={`p-3 rounded border text-left transition-all ${
                  selectedMode === 'br'
                    ? 'bg-zinc-800 border-rose-500 text-zinc-100 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div>BATTLE ROYALE</div>
                <div className="text-[10px] text-zinc-500 font-normal mt-1">
                  Permadeath • Shrinking zone
                </div>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTutorial}
                className="px-4 py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase"
              >
                Calibration & Tutorial
              </button>
              <button
                onClick={onOpenSpectator}
                className="px-4 py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase"
              >
                Spectator Mode
              </button>
            </div>

            <button
              onClick={handleLaunch}
              className="px-8 py-3 rounded-full bg-sky-950 hover:bg-sky-900 border border-sky-400 text-sky-100 font-mono text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              DEPLOY TO ARENA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
