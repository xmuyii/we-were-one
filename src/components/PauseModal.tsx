/**
 * Shadow Shot - In-Game Pause & Leave Match Modal
 * Allows players to resume, adjust controls/settings, or leave the match and return to the main menu.
 */

import React from 'react';
import { Play, Settings, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';
import { GameMode } from '../types';

interface PauseModalProps {
  isOpen: boolean;
  gameMode: GameMode;
  onResume: () => void;
  onOpenSettings: () => void;
  onLeaveMatch: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  gameMode,
  onResume,
  onOpenSettings,
  onLeaveMatch,
}) => {
  if (!isOpen) return null;

  const modeTitle =
    gameMode === 'practice'
      ? 'PRACTICE ARENA'
      : gameMode === 'tdm'
      ? 'TEAM DEATHMATCH'
      : gameMode === 'light_war'
      ? 'THE LIGHT WAR'
      : gameMode === 'ranked'
      ? 'RANKED SOLO'
      : 'BATTLE ARENA';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex flex-col items-center text-center border-b border-zinc-900 pb-4">
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
            MATCH PAUSED
          </span>
          <h2 className="text-xl font-bold tracking-wider text-zinc-100 mt-1">
            {modeTitle}
          </h2>
          <span className="text-xs text-zinc-500 mt-0.5">
            Sound and simulation suspended
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Resume */}
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-400/80 text-sky-100 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-sky-400 text-sky-400" />
            <span>Resume Match</span>
          </button>

          {/* Settings & Controls */}
          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Controls & Settings</span>
          </button>

          {/* Leave Match & Return to Menu */}
          <button
            onClick={onLeaveMatch}
            className="w-full py-3 px-4 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-600/80 text-rose-200 text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Leave Match & Return to Menu</span>
          </button>
        </div>

        {/* Hint */}
        <div className="pt-2 text-center text-[10px] text-zinc-600 border-t border-zinc-900">
          Press [ESC] on desktop or tap Resume to continue playing.
        </div>
      </div>
    </div>
  );
};
