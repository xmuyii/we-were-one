/**
 * Shadow Shot - Post-Match Scoreboard & Instinct Analytics
 */

import React from 'react';
import { Trophy, Crosshair, Radio, Shield, RotateCcw, ArrowRight, Zap, Award } from 'lucide-react';
import { PlayerStats, RankTier } from '../types';

interface PostMatchProps {
  isVictory: boolean;
  killerName?: string;
  stats: PlayerStats;
  playerRank: RankTier;
  xpEarned: number;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const PostMatch: React.FC<PostMatchProps> = ({
  isVictory,
  killerName,
  stats,
  playerRank,
  xpEarned,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const pulseAcc = stats.pulsesUsed > 0 ? Math.round((stats.pulseAccurateKills / Math.max(1, stats.pulsesUsed)) * 100) : 0;

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center p-6 select-none z-40">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 flex flex-col shadow-2xl">
        {/* Victory or Defeat Banner */}
        <div className="text-center mb-6">
          <span className="text-xs font-mono tracking-widest text-zinc-500 uppercase">
            MATCH RESOLVED
          </span>
          <h2
            className={`text-3xl md:text-4xl font-mono font-bold tracking-widest mt-1 uppercase ${
              isVictory ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'text-zinc-200'
            }`}
          >
            {isVictory ? 'LAST SHADOW STANDING' : 'ELIMINATED IN DARKNESS'}
          </h2>
          {!isVictory && killerName && (
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Fell to unseen marksman: <span className="text-red-400 font-bold">{killerName}</span>
            </p>
          )}
        </div>

        {/* Instinct Rating (§11) */}
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 mb-6 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">INSTINCT RATING</span>
            <span className="text-emerald-400 font-bold">{stats.instinctRating}%</span>
          </div>
          <p className="text-xs font-mono text-zinc-300 italic leading-relaxed mt-1">
            "Your pulse accuracy: {pulseAcc}%. You trusted your gut {stats.pulsesUsed + stats.shotsFired} times. {stats.shotsHit + stats.pulseAccurateKills} were right."
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono mb-6">
          <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase">KILLS</span>
            <span className="text-lg font-bold text-zinc-100 mt-1">{stats.kills}</span>
          </div>

          <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase">ACCURACY</span>
            <span className="text-lg font-bold text-sky-400 mt-1">{accuracy}%</span>
          </div>

          <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase">SURVIVAL</span>
            <span className="text-lg font-bold text-amber-400 mt-1">{stats.survivalSeconds}s</span>
          </div>

          <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase">XP EARNED</span>
            <span className="text-lg font-bold text-emerald-400 mt-1">+{xpEarned}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Lobby</span>
          </button>

          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded bg-sky-950 hover:bg-sky-900 border border-sky-500 text-sky-100 font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-colors flex items-center justify-center gap-2"
          >
            <span>Play Again</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
