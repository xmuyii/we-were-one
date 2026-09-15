/**
 * Shadow Shot - Lobby & Matchmaker Screen
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Trophy,
  Volume2,
  Settings,
  Users,
  Compass,
  Crosshair,
  Award,
  Sparkles,
  ArrowRight,
  Radio,
  Database,
} from 'lucide-react';
import { RankTier, LeaderboardEntry, AccessibilitySettings } from '../types';

interface LobbyProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  playerRank: RankTier;
  playerXp: number;
  playerTitle: string;
  onSelectTitle: (title: string) => void;
  onStartMatch: (mode: 'solo' | 'ranked' | 'duo' | 'practice', customRoom?: string) => void;
  onStartOnboarding: () => void;
  onOpenSettings: () => void;
  onOpenSupabase?: () => void;
  settings: AccessibilitySettings;
}

export const Lobby: React.FC<LobbyProps> = ({
  playerName,
  onUpdatePlayerName,
  playerRank,
  playerXp,
  playerTitle,
  onSelectTitle,
  onStartMatch,
  onStartOnboarding,
  onOpenSettings,
  onOpenSupabase,
}) => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'leaderboards' | 'ranks' | 'titles'>('deploy');
  const [leaderboardTab, setLeaderboardTab] = useState<'daily' | 'weekly' | 'legendary'>('daily');
  const [leaderboards, setLeaderboards] = useState<{
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    legendary: LeaderboardEntry[];
  }>({
    daily: [],
    weekly: [],
    legendary: [],
  });
  const [customRoomCode, setCustomRoomCode] = useState<string>('');

  // Fetch real/live leaderboard stats from server
  useEffect(() => {
    fetch('/api/leaderboards')
      .then((res) => res.json())
      .then((data) => {
        if (data) setLeaderboards(data);
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  const ranksList: { rank: RankTier; xp: number; unlock: string }[] = [
    { rank: 'Whisper', xp: 0, unlock: 'Basic sniper, Pulse echolocation' },
    { rank: 'Shade', xp: 500, unlock: 'Decoy noisemakers, Crouch-silence' },
    { rank: 'Phantom', xp: 2000, unlock: 'Breath-hold mastery, Faster reload' },
    { rank: 'Wraith', xp: 6000, unlock: 'Second pulse charge' },
    { rank: 'Revenant', xp: 15000, unlock: 'Custom reticle, Tracer color' },
    { rank: 'Nightfall', xp: 30000, unlock: 'Legendary-eligible' },
    { rank: 'Eclipse', xp: 60000, unlock: 'Animated title, Lobby shadow aura' },
  ];

  const titlesList = [
    { title: 'Patient', requirement: 'Avg. time between shots > 30s' },
    { title: 'One Shot', requirement: 'Kills per shot > 80%' },
    { title: 'Ghost', requirement: '10+ silent stalker kills' },
    { title: 'Opportunist', requirement: '5+ kills within 3s of enemy reload' },
    { title: 'Stormchaser', requirement: '5+ kills during weather transitions' },
    { title: 'Blade', requirement: '10+ melee knife kills' },
    { title: 'Last Breath', requirement: 'Survive collapse zone to final 2' },
    { title: 'Blind Read', requirement: '5+ kills after wrong pulse + reposition' },
  ];

  // Calculate XP to next rank
  const currentRankIdx = ranksList.findIndex((r) => r.rank === playerRank);
  const nextRank = ranksList[currentRankIdx + 1];
  const prevRankXp = ranksList[currentRankIdx]?.xp || 0;
  const nextRankXp = nextRank ? nextRank.xp : 60000;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((playerXp - prevRankXp) / (nextRankXp - prevRankXp)) * 100)
  );

  return (
    <div className="relative w-full h-full bg-black text-zinc-100 flex flex-col justify-between p-4 md:p-8 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-zinc-100 uppercase">
              SHADOW SHOT
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-zinc-900 border border-zinc-700 text-zinc-400">
              FPS IN TOTAL DARKNESS
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400 tracking-wide mt-1">
            "You are blind. Listen."
          </p>
        </div>

        {/* Player Profile Box */}
        <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800/80 px-4 py-2.5 rounded-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => onUpdatePlayerName(e.target.value)}
                maxLength={14}
                className="bg-transparent border-b border-zinc-700 font-mono text-sm font-bold text-zinc-100 focus:outline-none focus:border-sky-400 w-28"
                placeholder="Callsign"
              />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 border border-sky-600 text-sky-300">
                {playerTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
              <span className="text-amber-400 font-bold">{playerRank}</span>
              <span>•</span>
              <span>{playerXp} XP</span>
            </div>

            {/* XP progress bar */}
            {nextRank && (
              <div className="w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenSupabase && (
              <button
                onClick={onOpenSupabase}
                className="px-2.5 py-1.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-700/60 flex items-center gap-1.5 text-xs font-mono"
                title="Supabase Backend & Cross-Game Operative Profile"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">CROSS-GAME</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800"
              title="Settings & Accessibility"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 my-4 border-b border-zinc-900 pb-2">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
            activeTab === 'deploy'
              ? 'bg-zinc-900 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Deploy (Matchmaking)
        </button>
        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
            activeTab === 'leaderboards'
              ? 'bg-zinc-900 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Leaderboards
        </button>
        <button
          onClick={() => setActiveTab('ranks')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
            activeTab === 'ranks'
              ? 'bg-zinc-900 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ranks & Arsenal
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
            activeTab === 'titles'
              ? 'bg-zinc-900 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Skill Titles
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 py-4">
        {/* TAB 1: DEPLOY MODES */}
        {activeTab === 'deploy' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
            {/* Solo Hunt */}
            <div className="flex flex-col justify-between p-6 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-sky-500/50 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-sky-950 text-sky-300 border border-sky-800">
                    CORE MODE
                  </span>
                  <Radio className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 transition-colors" />
                </div>
                <h3 className="text-lg font-mono font-bold text-zinc-100 group-hover:text-sky-300 transition-colors">
                  SOLO HUNT (FFA)
                </h3>
                <p className="text-xs font-mono text-zinc-400 leading-relaxed mt-2">
                  Drop into absolute blackness. 6 shadows stalk the map. Single-shot sniper rifle, 3 rounds in mag, pulse echolocation, collapsing zone. Last shadow standing wins.
                </p>
              </div>

              <button
                onClick={() => onStartMatch('solo')}
                className="mt-6 w-full py-3 rounded bg-zinc-900 hover:bg-sky-950 hover:border-sky-500 border border-zinc-700 text-zinc-100 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all"
              >
                <span>ENTER ARENA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Ranked Solo */}
            <div className="flex flex-col justify-between p-6 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-amber-950 text-amber-300 border border-amber-800">
                    COMPETITIVE
                  </span>
                  <Trophy className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 className="text-lg font-mono font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                  RANKED SOLO
                </h3>
                <p className="text-xs font-mono text-zinc-400 leading-relaxed mt-2">
                  Awareness ring disabled. Strict server-authoritative audio netcode. Earn competitive ELO towards Legendary tier and the Hall of Shadows.
                </p>
              </div>

              <button
                onClick={() => onStartMatch('ranked')}
                className="mt-6 w-full py-3 rounded bg-zinc-900 hover:bg-amber-950 hover:border-amber-500 border border-zinc-700 text-zinc-100 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all"
              >
                <span>DEPLOY RANKED</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calibration / Tutorial & Custom Room */}
            <div className="flex flex-col justify-between p-6 rounded-lg bg-zinc-950 border border-zinc-800">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-800">
                  TRAINING & PRIVATE
                </span>
                <h3 className="text-lg font-mono font-bold text-zinc-100 mt-3">
                  PRACTICE & ROOMS
                </h3>
                <p className="text-xs font-mono text-zinc-400 leading-relaxed mt-2">
                  Calibrate your headphones and practice HRTF binaural sound localization, pulse echolocation, and staged bolt-action reload cancels.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value)}
                    placeholder="Custom Room Code (Optional)"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                  {customRoomCode && (
                    <button
                      onClick={() => onStartMatch('solo', customRoomCode)}
                      className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs uppercase"
                    >
                      Join Room: {customRoomCode}
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={onStartOnboarding}
                className="mt-6 w-full py-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all"
              >
                <span>START TUTORIAL</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LEADERBOARDS */}
        {activeTab === 'leaderboards' && (
          <div className="flex flex-col max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setLeaderboardTab('daily')}
                className={`px-3 py-1 text-xs font-mono rounded ${
                  leaderboardTab === 'daily'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Daily (24h UTC)
              </button>
              <button
                onClick={() => setLeaderboardTab('weekly')}
                className={`px-3 py-1 text-xs font-mono rounded ${
                  leaderboardTab === 'weekly'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setLeaderboardTab('legendary')}
                className={`px-3 py-1 text-xs font-mono rounded ${
                  leaderboardTab === 'legendary'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Hall of Shadows (All-Time)
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Callsign</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Kills</th>
                    <th className="p-3">Accuracy</th>
                    <th className="p-3">Instinct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {(leaderboards[leaderboardTab] || []).map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-zinc-900/40">
                      <td className="p-3 text-zinc-500">#{idx + 1}</td>
                      <td className="p-3 font-bold text-zinc-200">{entry.name}</td>
                      <td className="p-3 text-amber-400">{entry.rank}</td>
                      <td className="p-3 text-sky-400">{entry.title}</td>
                      <td className="p-3">{entry.kills}</td>
                      <td className="p-3">{entry.accuracy}%</td>
                      <td className="p-3 text-emerald-400">{entry.instinctRating}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RANKS & ARSENAL */}
        {activeTab === 'ranks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {ranksList.map((r, i) => (
              <div
                key={r.rank}
                className={`p-4 rounded-lg border font-mono ${
                  playerXp >= r.xp
                    ? 'bg-zinc-950 border-amber-500/40 text-zinc-200'
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-400 uppercase">{r.rank}</span>
                  <span className="text-xs text-zinc-500">{r.xp} XP</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Unlocks: {r.unlock}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: SKILL TITLES */}
        {activeTab === 'titles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
            {titlesList.map((t) => (
              <div
                key={t.title}
                onClick={() => onSelectTitle(t.title)}
                className={`p-3 rounded-lg border font-mono cursor-pointer transition-all ${
                  playerTitle === t.title
                    ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">{t.title}</span>
                  {playerTitle === t.title && (
                    <span className="text-[10px] font-mono text-sky-400">EQUIPPED</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">{t.requirement}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="pt-4 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
        <div>
          Desktop Controls: <span className="text-zinc-300">WASD</span> move • <span className="text-zinc-300">Mouse</span> look • <span className="text-zinc-300">Space</span> Pulse • <span className="text-zinc-300">Left Click</span> Fire • <span className="text-zinc-300">Shift</span> Sprint • <span className="text-zinc-300">Ctrl</span> Hold Breath • <span className="text-zinc-300">R</span> Staged Reload
        </div>
        <div>
          Cross-platform • Web Audio HRTF • Server Authoritative
        </div>
      </div>
    </div>
  );
};
