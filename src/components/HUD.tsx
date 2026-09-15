/**
 * Shadow Shot - Complete Tactical HUD
 * Minimalist, high-contrast interface for blindness with mini-map, compass, pulse radar & weapon view
 */

import React, { useState } from 'react';
import { ClientGameState, ReloadStageName, AccessibilitySettings, MUZZLE_CONFIGS } from '../types';
import { MiniMap } from './MiniMap';
import { PulseRadar } from './PulseRadar';
import { WeaponView } from './WeaponView';
import { MuzzleProgressionModal } from './MuzzleProgressionModal';
import { TouchControls } from './TouchControls';
import {
  Radio,
  Skull,
  ShieldAlert,
  Wind,
  CloudRain,
  Zap,
  EyeOff,
  Flame,
  Sparkles,
  Users,
  Compass,
  Crosshair,
  Package,
  Bomb,
  Radar,
  Sliders,
  Menu,
  LogOut,
} from 'lucide-react';

interface HUDProps {
  gameState: ClientGameState;
  playerX: number;
  playerZ: number;
  yaw: number; // in radians
  onTriggerPulse: () => void;
  onFire: () => void;
  onMelee: () => void;
  onReload: () => void;
  onCancelReload: () => void;
  onDecoy: () => void;
  onThrowFlare: () => void;
  onThrowGlowStick: () => void;
  onActivateAbility: () => void;
  onToggleCrouch: () => void;
  onToggleHoldBreath: () => void;
  onToggleScoreboard: () => void;
  onSetMuzzle: (level: number) => void;
  onUseActiveScan: () => void;
  onPlantMine: () => void;
  onUseUltimate: () => void;
  onStartScavengeCache: (id: string) => void;
  onCancelScavengeCache: () => void;
  onPauseMatch?: () => void;
  onOpenControlsEditor?: () => void;
  onMobileMoveChange?: (dx: number, dy: number, isSprint: boolean) => void;
  onMobileLookDelta?: (deltaYaw: number) => void;
  settings: AccessibilitySettings;
  isMobile: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  gameState,
  playerX,
  playerZ,
  yaw,
  onTriggerPulse,
  onFire,
  onMelee,
  onReload,
  onCancelReload,
  onDecoy,
  onThrowFlare,
  onThrowGlowStick,
  onActivateAbility,
  onToggleCrouch,
  onToggleHoldBreath,
  onToggleScoreboard,
  onSetMuzzle,
  onUseActiveScan,
  onPlantMine,
  onUseUltimate,
  onStartScavengeCache,
  onCancelScavengeCache,
  onPauseMatch,
  onOpenControlsEditor,
  onMobileMoveChange,
  onMobileLookDelta,
  settings,
  isMobile,
}) => {
  const [miniMapExpanded, setMiniMapExpanded] = useState(false);
  const [showMuzzleModal, setShowMuzzleModal] = useState(false);

  // Compass degrees (0 = N, 90 = E, 180 = S, 270 = W)
  const deg = ((yaw * 180) / Math.PI) % 360;
  const normalizedDeg = (deg + 360) % 360;

  const reloadLabels: Record<ReloadStageName, string> = {
    none: '',
    mag_release: '1. MAG RELEASE (CLICK)',
    mag_out: '2. MAG OUT (SHINK)',
    mag_in: '3. MAG IN (CLACK)',
    bolt_pull: '4. BOLT PULL (CHK-CHK)',
    ready: 'READY',
  };

  const isLogigi = gameState.faction === 'logigi';
  const currentMuzzle = MUZZLE_CONFIGS[gameState.equippedMuzzleLevel] || MUZZLE_CONFIGS[0];

  return (
    <div className="absolute inset-0 pointer-events-none p-3 md:p-6 flex flex-col justify-between z-10 select-none overflow-hidden">
      {/* Muzzle Progression Attachment Modal */}
      {showMuzzleModal && (
        <MuzzleProgressionModal
          currentMuzzleLevel={gameState.equippedMuzzleLevel}
          unlockedMuzzleLevel={gameState.unlockedMuzzleLevel}
          faction={gameState.faction}
          playerRank={gameState.rank}
          onSelectMuzzle={(lvl) => {
            onSetMuzzle(lvl);
          }}
          onClose={() => setShowMuzzleModal(false)}
        />
      )}

      {/* 1. TOP ROW: Mini-Map + Compass, Match/Lives Header, Pulse & Roster */}
      <div
        className={`flex items-start justify-between w-full transition-opacity duration-150 ${
          gameState.isAimingSteady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Top-Left: Mini-Map & Compass Strip */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <MiniMap
            gameState={gameState}
            playerX={playerX}
            playerZ={playerZ}
            yaw={yaw}
            isRanked={false}
            settings={settings}
            isExpanded={miniMapExpanded}
            onToggleExpand={() => setMiniMapExpanded(!miniMapExpanded)}
          />

          {/* Horizontal Compass Strip below mini-map (Prompt 1) */}
          <div className="relative w-32 md:w-36 h-5 overflow-hidden rounded bg-black/90 border border-zinc-800 flex items-center justify-center">
            <div className="absolute top-0 bottom-0 w-0.5 bg-sky-400 z-10" />
            <div
              className="flex items-center gap-6 text-[10px] font-mono text-zinc-400 whitespace-nowrap transition-transform duration-75"
              style={{
                transform: `translateX(${-((normalizedDeg / 360) * 260 - 65)}px)`,
              }}
            >
              <span>N</span>
              <span>·</span>
              <span>NE</span>
              <span>·</span>
              <span>E</span>
              <span>·</span>
              <span>SE</span>
              <span>·</span>
              <span>S</span>
              <span>·</span>
              <span>SW</span>
              <span>·</span>
              <span>W</span>
              <span>·</span>
              <span>NW</span>
              <span>·</span>
              <span>N</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Match Status / TDM Lives / Light War Score */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          {gameState.mode === 'tdm' ? (
            /* TDM Lives Tracker */
            <div className="flex items-center gap-4 px-4 py-1.5 rounded-lg bg-black/90 border border-zinc-800 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 font-bold">L'OGIGI:</span>
                <span className="text-sm font-mono font-extrabold text-amber-300">
                  {gameState.tdmLivesLogigi}
                </span>
              </div>
              <span className="text-zinc-600 font-mono">VS</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-sky-400 font-bold">L'OTITO:</span>
                <span className="text-sm font-mono font-extrabold text-sky-300">
                  {gameState.tdmLivesLotito}
                </span>
              </div>
            </div>
          ) : gameState.mode === 'light_war' ? (
            /* Light War Round & Beacon Tracker */
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-black/90 border border-zinc-800 shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                R{gameState.lightWarRound} [ {gameState.lightWarScoreLogigi} - {gameState.lightWarScoreLotito} ]
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span
                className={`text-[11px] font-mono font-bold uppercase ${
                  gameState.beaconStatus === 'planted'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-zinc-300'
                }`}
              >
                BEACON: {gameState.beaconStatus}
              </span>
            </div>
          ) : (
            /* Standard FFA / BR Alive & Zone Tracker */
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/90 border border-zinc-800 backdrop-blur-md">
              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-mono tracking-widest text-zinc-200">
                {gameState.aliveCount} SHADOWS ALIVE
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs font-mono text-zinc-400 uppercase">
                ZONE: {gameState.zoneRadius}m
              </span>
            </div>
          )}

          {/* Weather status */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
            {gameState.weather === 'rain' && <CloudRain className="w-3 h-3 text-sky-400" />}
            {gameState.weather === 'wind' && <Wind className="w-3 h-3 text-teal-400" />}
            {gameState.weather === 'storm' && <Zap className="w-3 h-3 text-yellow-400" />}
            <span>Weather: {gameState.weather}</span>
            {gameState.weatherMasking > 0 && (
              <span className="text-amber-400/80">({Math.round(gameState.weatherMasking * 100)}% Mask)</span>
            )}
          </div>
        </div>

        {/* Top-Right: Pulse, Muzzle & Scoreboard Tab Button */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* View Players / Tab Button, Menu/Quit & Muzzle Attachment Button */}
          <div className="flex items-center gap-2">
            {isMobile && onOpenControlsEditor && (
              <button
                onClick={onOpenControlsEditor}
                className="px-2.5 py-1.5 rounded bg-sky-950/90 hover:bg-sky-900 border border-sky-600/70 text-sky-200 font-mono text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                title="Customize mobile touch controls layout"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>EDIT HUD</span>
              </button>
            )}

            {onPauseMatch && (
              <button
                onClick={onPauseMatch}
                className="px-2.5 py-1.5 rounded bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white font-mono text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                title="Pause Game & Menu / Leave [ESC]"
              >
                <Menu className="w-3.5 h-3.5 text-zinc-300" />
                <span>MENU [ESC]</span>
              </button>
            )}

            <button
              onClick={() => setShowMuzzleModal(true)}
              className="px-2.5 py-1.5 rounded bg-zinc-950/90 border border-zinc-800 hover:border-amber-500/80 text-zinc-300 hover:text-amber-300 font-mono text-xs flex items-center gap-1.5 transition-all shadow-md"
              title="Weapon Attachments & Muzzle Progression [M]"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">MUZZLE [M]</span>
            </button>

            <button
              onClick={onToggleScoreboard}
              className="px-3 py-1.5 rounded bg-zinc-950/90 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 font-mono text-xs flex items-center gap-2 transition-all shadow-md"
              title="Press TAB to view players and stats"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">PLAYERS [TAB]</span>
            </button>
          </div>

          {/* Pulse Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded bg-black/90 border backdrop-blur-md transition-all ${
              gameState.pulseCooldownRemaining <= 0
                ? 'border-sky-500/60 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'border-zinc-800/60'
            }`}
          >
            <Radio
              className={`w-4 h-4 ${
                gameState.pulseCooldownRemaining <= 0 ? 'text-sky-400 animate-pulse' : 'text-zinc-600'
              }`}
            />
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono font-bold tracking-wider">
                {gameState.pulseCooldownRemaining <= 0 ? (
                  <span className="text-sky-300">PULSE READY</span>
                ) : (
                  <span className="text-zinc-500">
                    PULSE: {gameState.pulseCooldownRemaining.toFixed(1)}s
                  </span>
                )}
              </span>
              <span className="text-[9px] font-mono text-zinc-400">
                {isMobile ? 'Thumb button' : '[SPACE]'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ALERTS & INTERACTIONS */}
      <div className="flex flex-col items-center justify-center gap-2 pointer-events-auto">
        {/* Ammo Cache Scavenge Interaction (Hold E) */}
        {gameState.nearbyCacheToOpen && (
          <div className="px-5 py-3 rounded-lg bg-black/95 border border-emerald-500/80 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 text-center animate-pulse">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs font-bold tracking-wider">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>AMMO CACHE DETECTED ({gameState.nearbyCacheToOpen.dist.toFixed(1)}M)</span>
            </div>

            {gameState.scavengingCacheId ? (
              <div className="flex flex-col items-center gap-1 w-48">
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-100"
                    style={{ width: `${Math.round(gameState.scavengeProgress * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-emerald-200">
                  SCAVENGING... {Math.round(gameState.scavengeProgress * 100)}%
                </span>
                <button
                  onClick={onCancelScavengeCache}
                  className="mt-1 px-2 py-0.5 rounded text-[9px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 pointer-events-auto"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => onStartScavengeCache(gameState.nearbyCacheToOpen!.id)}
                className="px-3 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500 text-emerald-200 font-mono text-xs font-bold transition-all pointer-events-auto shadow-md"
              >
                HOLD [E] TO SCAVENGE (+2 ROUNDS)
              </button>
            )}
          </div>
        )}

        {/* TDM Team Wipe 20s Countdown */}
        {gameState.tdmTeamWipeCountdown !== null && (
          <div className="px-4 py-2 rounded-lg bg-rose-950/90 border-2 border-rose-500 text-rose-100 font-mono text-sm font-bold animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.4)]">
            TEAM WIPE COUNTDOWN: {gameState.tdmTeamWipeCountdown.toFixed(1)}s!
          </div>
        )}

        {/* Shared Heartbeat alert (<=10m & still) */}
        {gameState.sharedHeartbeat && (
          <div className="px-3 py-1 rounded bg-rose-950/90 border border-rose-600/80 text-rose-200 text-xs font-mono animate-bounce shadow-lg">
            SHARED HEARTBEAT — ENEMY WITHIN 10M
          </div>
        )}

        {/* Warm Vignette Proximity Alert (<=1.5m) */}
        {gameState.warmVignette && (
          <div className="px-3 py-1 rounded bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs font-mono animate-pulse shadow-lg">
            <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
            <span>PROXIMITY WARNING — SOMETHING BREATHES (1.5M)</span>
          </div>
        )}

        {/* "LET THERE BE LIGHT" Blinding Alert */}
        {gameState.isBlindedByLight && (
          <div className="px-6 py-2 rounded-full bg-white text-black font-mono text-sm font-extrabold tracking-widest animate-ping">
            "LET THERE BE LIGHT"
          </div>
        )}
      </div>

      {/* 2b. KILLSTREAK TACTICAL STATUS & CONTROLS */}
      <div className="flex items-center justify-center gap-2 mb-2 pointer-events-auto z-20">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-black/85 border border-zinc-800 text-xs font-mono text-zinc-300">
          <Skull className="w-3.5 h-3.5 text-rose-400" />
          <span>STREAK: {gameState.killstreak?.currentKills || 0}</span>
        </div>

        {gameState.killstreak?.trackerActiveTimeRemaining && gameState.killstreak.trackerActiveTimeRemaining > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/80 border border-amber-500 text-amber-200 text-xs font-mono animate-pulse">
            <Radar className="w-3.5 h-3.5 text-amber-400" />
            <span>TRACKER: {gameState.killstreak.trackerActiveTimeRemaining.toFixed(1)}s (15M ECHO)</span>
          </div>
        ) : null}

        {gameState.killstreak?.unlockedActiveScan && (
          <button
            onClick={onUseActiveScan}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-sky-950 border border-sky-400 text-sky-200 text-xs font-mono font-bold hover:bg-sky-900 transition-all shadow-[0_0_10px_rgba(56,189,248,0.3)] animate-pulse"
            title="Trigger 30m Active Sonar Sweep [3]"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>[3] ACTIVE SCAN</span>
          </button>
        )}

        {gameState.killstreak?.carriedMine && (
          <button
            onClick={onPlantMine}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-950 border border-rose-500 text-rose-200 text-xs font-mono font-bold hover:bg-rose-900 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
            title="Plant Claymore Mine [4]"
          >
            <Bomb className="w-3.5 h-3.5" />
            <span>[4] PLANT MINE</span>
          </button>
        )}

        {gameState.killstreak?.unlockedUltimate && (
          <button
            onClick={onUseUltimate}
            className="flex items-center gap-1.5 px-4 py-1 rounded bg-white text-black text-xs font-mono font-extrabold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.7)] animate-bounce"
            title="Detonate Light Bomb / Dark Pulse [7]"
          >
            <Zap className="w-3.5 h-3.5 text-black" />
            <span>[7] ULTIMATE</span>
          </button>
        )}
      </div>

      {/* 3. BOTTOM SECTION: Tactical Arsenal, Pulse Radar, Weapon View, Health & Stamina */}
      <div className="flex items-end justify-between w-full relative">
        {/* Bottom-Left: Ammo, Reload, Light Resources, Stamina */}
        <div
          className={`flex flex-col gap-2 pointer-events-auto z-20 transition-opacity duration-150 ${
            gameState.isAimingSteady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Ammo & Mag */}
          <div className="flex flex-col gap-1 px-3 py-1.5 rounded bg-black/90 border border-zinc-800/80 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider text-zinc-400">AMMO</span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={`mag_${i}`}
                      className={`w-2.5 h-4 rounded-xs transition-colors duration-150 ${
                        i < gameState.ammoMag
                          ? isLogigi
                            ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                            : 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
                          : 'bg-zinc-800 border border-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono text-zinc-400 ml-1">
                  / {gameState.ammoReserve}
                </span>
              </div>

              {/* Muzzle Attachment Badge */}
              <button
                onClick={() => setShowMuzzleModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                title="Click to view/change Muzzle progression attachment"
              >
                <Crosshair className="w-3 h-3 text-amber-400" />
                <span>{currentMuzzle.name} (Lvl {currentMuzzle.level})</span>
              </button>
            </div>

            {/* Staged Reload Indicator */}
            {gameState.reloadingStage !== 'none' && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-amber-300 animate-pulse">
                  {reloadLabels[gameState.reloadingStage]}
                </span>
                <button
                  onClick={onCancelReload}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Light Arsenal & Abilities */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Flares (F) */}
            <button
              onClick={onThrowFlare}
              disabled={gameState.flaresAvailable <= 0}
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                gameState.flaresAvailable > 0
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300 hover:bg-amber-900'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-600 opacity-50'
              }`}
              title="Throw Flare [F] - Illuminates 15m radius"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Flare: {gameState.flaresAvailable} [F]</span>
            </button>

            {/* Glow Sticks (G) */}
            <button
              onClick={onThrowGlowStick}
              disabled={gameState.glowSticksAvailable <= 0}
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                gameState.glowSticksAvailable > 0
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-600 opacity-50'
              }`}
              title="Throw Glow Stick [G] - Soft green glow 30s"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Glow: {gameState.glowSticksAvailable} [G]</span>
            </button>

            {/* Faction Ability (Illuminate or Veil) */}
            <button
              onClick={onActivateAbility}
              className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-[11px]"
              title={isLogigi ? 'Illuminate flare (15m scan)' : 'Veil (Silent & invisible 5s)'}
            >
              {isLogigi ? 'Illuminate [X]' : 'Veil [X]'}
            </button>
          </div>

          {/* Stamina bar */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/90 border border-zinc-800/80">
            <span className="text-xs font-mono text-zinc-400">STAMINA</span>
            <div className="w-24 md:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  gameState.stamina < 30 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${(gameState.stamina / gameState.maxStamina) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {Math.round(gameState.stamina)}%
            </span>
          </div>
        </div>

        {/* Bottom-Center: Pulse Radar Sweeper (Hidden during ADS to avoid blocking scope view) */}
        {!gameState.isAimingSteady && (
          <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 pointer-events-none z-20">
            <PulseRadar
              blobs={gameState.activeBlobs}
              activePulseRingRadius={gameState.activePulseRingRadius}
              highContrast={settings.colorblindPulse}
            />
          </div>
        )}

        {/* Bottom-Right: Health & First-Person Sniper Rifle View */}
        <div
          className={`flex flex-col items-end gap-2 pointer-events-auto z-20 transition-opacity duration-150 ${
            gameState.isAimingSteady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Health Bar */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/90 border border-zinc-800/80 backdrop-blur-md">
            <span className="text-xs font-mono text-zinc-400">HEALTH</span>
            <div className="w-24 md:w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  gameState.health < 40 ? 'bg-rose-600 animate-pulse' : 'bg-zinc-200'
                }`}
                style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {Math.round(gameState.health)}
            </span>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 pr-1">
            Faction: <span className="text-zinc-200 font-bold uppercase">{gameState.faction}</span>
          </div>
        </div>

        {/* First-Person Sniper Rifle View / Full-Screen COD Sniper Optic */}
        <WeaponView
          faction={gameState.faction}
          isAimingSteady={gameState.isAimingSteady}
          isGhostMode={gameState.isGhostMode}
          isRanked={false}
          reloading={gameState.reloadingStage !== 'none'}
          muzzleLevel={gameState.equippedMuzzleLevel}
          isHoldingBreath={gameState.isHoldingBreath}
          stamina={gameState.stamina}
        />
      </div>

      {/* Mobile Touch Controls Layer */}
      {isMobile && (
        <TouchControls
          gameState={gameState}
          settings={settings}
          onMoveChange={onMobileMoveChange || (() => {})}
          onLookDelta={onMobileLookDelta || (() => {})}
          onFire={onFire}
          onToggleADS={onToggleHoldBreath}
          onPulse={onTriggerPulse}
          onToggleCrouch={onToggleCrouch}
          onReload={onReload}
          onMelee={onMelee}
          onThrowFlare={onThrowFlare}
          onActivateAbility={onActivateAbility}
        />
      )}
    </div>
  );
};
