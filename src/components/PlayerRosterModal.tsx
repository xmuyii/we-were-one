/**
 * Shadow Shot - In-Game Player Roster & Tab Scoreboard
 * "Press TAB to see players in-game"
 */

import React from 'react';
import { ClientGameState, MatchPlayerInfo } from '../types';
import { Users, Skull, ShieldAlert, Sparkles, Radio, Zap, X } from 'lucide-react';

interface PlayerRosterModalProps {
  gameState: ClientGameState;
  onClose: () => void;
}

export const PlayerRosterModal: React.FC<PlayerRosterModalProps> = ({ gameState, onClose }) => {
  const logigiPlayers = gameState.players.filter((p) => p.faction === 'logigi');
  const lotitoPlayers = gameState.players.filter((p) => p.faction === 'lotito');

  const renderPlayerRow = (p: MatchPlayerInfo) => (
    <tr
      key={p.id}
      className={`font-mono text-xs transition-colors ${
        p.isSelf ? 'bg-zinc-800/60 font-bold' : 'hover:bg-zinc-900/40'
      }`}
    >
      <td className="p-2.5 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            p.isAlive ? 'bg-emerald-400' : 'bg-rose-600 animate-pulse'
          }`}
        />
        <span className={p.isSelf ? 'text-sky-300' : 'text-zinc-200'}>
          {p.name} {p.isSelf && '(YOU)'}
        </span>
      </td>
      <td className="p-2.5 text-zinc-400 uppercase">
        {p.isAlive ? (
          <span className="text-emerald-400">ALIVE</span>
        ) : p.respawnTimeRemaining !== undefined && p.respawnTimeRemaining > 0 ? (
          <span className="text-amber-400">RESPAWNING ({p.respawnTimeRemaining.toFixed(0)}s)</span>
        ) : (
          <span className="text-rose-500">ELIMINATED</span>
        )}
      </td>
      <td className="p-2.5 text-zinc-200">{p.kills}</td>
      <td className="p-2.5 text-zinc-400">{p.deaths}</td>
      <td className="p-2.5 text-zinc-500">{p.ping}ms</td>
    </tr>
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-100 font-mono">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100">
                SECTOR 7 — ROSTER & MATCH STATUS
              </h2>
              <span className="text-[11px] text-zinc-500">
                MODE: {gameState.mode.toUpperCase()} • MAP: {gameState.map.replace('_', ' ').toUpperCase()} • WEATHER: {gameState.weather.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Close [TAB or ESC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TDM Mode Header: Team Lives & Team Wipe Countdown */}
        {gameState.mode === 'tdm' && (
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
            {/* L'ogigi Lives */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-amber-400 tracking-wider">
                L'OGIGI LIVES (LIGHT-BRINGERS)
              </span>
              <span className="text-3xl font-extrabold text-amber-300 mt-1">
                {gameState.tdmLivesLogigi} / 60
              </span>
            </div>

            {/* L'otito Lives */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-sky-400 tracking-wider">
                L'OTITO LIVES (TRUTH-KEEPERS)
              </span>
              <span className="text-3xl font-extrabold text-sky-300 mt-1">
                {gameState.tdmLivesLotito} / 60
              </span>
            </div>

            {/* Active Team Wipe Countdown Banner */}
            {gameState.tdmTeamWipeCountdown !== null && (
              <div className="col-span-2 p-2 rounded bg-rose-950/80 border border-rose-600 text-center animate-pulse">
                <span className="text-xs font-bold text-rose-300 tracking-widest">
                  TEAM WIPE WARNING: {gameState.tdmWipedTeam?.toUpperCase()} HAS NO PLAYERS ALIVE!
                  COUNTDOWN: {gameState.tdmTeamWipeCountdown.toFixed(1)}s TO DEFEAT!
                </span>
              </div>
            )}
          </div>
        )}

        {/* The Light War Status */}
        {gameState.mode === 'light_war' && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-400">ROUND {gameState.lightWarRound} / 7 (FIRST TO 4):</span>
              <div className="flex items-center gap-3 mt-1 font-bold">
                <span className="text-amber-400">L'ogigi: {gameState.lightWarScoreLogigi}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-sky-400">L'otito: {gameState.lightWarScoreLotito}</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-zinc-400">LIGHT BEACON OBJECTIVE:</span>
              <span className="font-bold text-amber-300 uppercase mt-1">
                {gameState.beaconStatus === 'planted'
                  ? `PLANTED AT SITE ${gameState.beaconSite} (${gameState.beaconTimerRemaining?.toFixed(0)}s DETONATION)`
                  : gameState.beaconStatus === 'detonated'
                  ? 'DETONATED: "LET THERE BE LIGHT"'
                  : gameState.beaconStatus === 'defused'
                  ? 'DEFUSED BY L\'OTITO'
                  : 'CARRIED BY L\'OGIGI'}
              </span>
            </div>
          </div>
        )}

        {/* Player Tables */}
        {gameState.mode === 'tdm' || gameState.mode === 'light_war' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* L'ogigi Roster */}
            <div className="border border-amber-900/40 rounded-lg overflow-hidden bg-zinc-950/60">
              <div className="bg-amber-950/40 p-2.5 border-b border-amber-900/40 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span>FACTION: L'OGIGI (LIGHT)</span>
                <span>{logigiPlayers.filter((p) => p.isAlive).length} ALIVE</span>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] text-zinc-500 border-b border-zinc-900 bg-zinc-900/30">
                  <tr>
                    <th className="p-2">Player</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">K</th>
                    <th className="p-2">D</th>
                    <th className="p-2">Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {logigiPlayers.map(renderPlayerRow)}
                </tbody>
              </table>
            </div>

            {/* L'otito Roster */}
            <div className="border border-sky-900/40 rounded-lg overflow-hidden bg-zinc-950/60">
              <div className="bg-sky-950/40 p-2.5 border-b border-sky-900/40 flex items-center justify-between text-xs text-sky-300 font-bold">
                <span>FACTION: L'OTITO (DARKNESS)</span>
                <span>{lotitoPlayers.filter((p) => p.isAlive).length} ALIVE</span>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] text-zinc-500 border-b border-zinc-900 bg-zinc-900/30">
                  <tr>
                    <th className="p-2">Player</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">K</th>
                    <th className="p-2">D</th>
                    <th className="p-2">Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {lotitoPlayers.map(renderPlayerRow)}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* FFA / Battle Royale Roster */
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/60">
            <table className="w-full text-left">
              <thead className="text-[10px] text-zinc-500 border-b border-zinc-900 bg-zinc-900/40">
                <tr>
                  <th className="p-2.5">Player</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Kills</th>
                  <th className="p-2.5">Deaths</th>
                  <th className="p-2.5">Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {gameState.players.map(renderPlayerRow)}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
          <span>Press [TAB] or click close to return to the darkness</span>
          <span>Tactical Map is available in the top-left HUD corner</span>
        </div>
      </div>
    </div>
  );
};
