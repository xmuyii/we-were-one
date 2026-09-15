/**
 * Shadow Shot - Main Application Component
 * A real-time multiplayer FPS where every player is blind.
 * L'ogigi War canon, Factions, TDM 60-Lives System, The Light War, Mini-Map & Tab Scoreboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameClient } from './game/GameClient';
import { soundEngine } from './audio/SoundEngine';
import { OpeningScreen } from './components/OpeningScreen';
import { Lobby } from './components/Lobby';
import { BlackoutViewport } from './components/BlackoutViewport';
import { HUD } from './components/HUD';
import { Onboarding } from './components/Onboarding';
import { PostMatch } from './components/PostMatch';
import { SettingsModal } from './components/SettingsModal';
import { PlayerRosterModal } from './components/PlayerRosterModal';
import { LandscapeEnforcer } from './components/LandscapeEnforcer';
import { SupabaseModal } from './components/SupabaseModal';
import { PauseModal } from './components/PauseModal';
import { MobileControlsEditor } from './components/MobileControlsEditor';
import { syncMatchToSupabase } from './lib/supabase';
import {
  RankTier,
  AccessibilitySettings,
  ClientGameState,
  PlayerStats,
  FactionType,
  GameMode,
  DEFAULT_MOBILE_CONTROLS,
} from './types';

export default function App() {
  // App view state
  const [currentView, setCurrentView] = useState<
    'opening' | 'lobby' | 'onboarding' | 'match' | 'post_match'
  >('opening');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [showSupabase, setShowSupabase] = useState<boolean>(false);
  const [showPause, setShowPause] = useState<boolean>(false);
  const [showControlsEditor, setShowControlsEditor] = useState<boolean>(false);

  // Player progression
  const [playerName, setPlayerName] = useState<string>('Specter-7');
  const [playerRank, setPlayerRank] = useState<RankTier>('Whisper');
  const [playerXp, setPlayerXp] = useState<number>(120);
  const [playerTitle, setPlayerTitle] = useState<string>('Patient');
  const [playerFaction, setPlayerFaction] = useState<FactionType>('lotito');

  // Accessibility & Audio Settings
  const [settings, setSettings] = useState<AccessibilitySettings>({
    monoAudio: false,
    visualAudioCues: true,
    awarenessRing: false,
    colorblindPulse: false,
    haptics: true,
    volumeMaster: 0.9,
    volumeSfx: 1.0,
    volumeAmbient: 0.6,
    mouseSensitivity: 0.002,
    miniMapHighContrast: false,
    mobileControls: DEFAULT_MOBILE_CONTROLS,
  });

  // Post match stats
  const [matchStats, setMatchStats] = useState<PlayerStats>({
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0,
    pulsesUsed: 0,
    pulseAccurateKills: 0,
    survivalSeconds: 0,
    meleeKills: 0,
    silentKills: 0,
    flaresUsed: 0,
    glowSticksUsed: 0,
    beaconsPlanted: 0,
    beaconsDefused: 0,
    instinctRating: 84,
  });
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [killerName, setKillerName] = useState<string>('');
  const [xpEarned, setXpEarned] = useState<number>(0);

  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // GameClient ref
  const gameClientRef = useRef<GameClient | null>(null);
  const [, setTick] = useState<number>(0);
  const matchContainerRef = useRef<HTMLDivElement>(null);
  const matchStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update sound engine settings when changed
  useEffect(() => {
    soundEngine.setSettings(settings);
  }, [settings]);

  // Initialize GameClient
  const getGameClient = useCallback(() => {
    if (!gameClientRef.current) {
      const client = new GameClient();
      client.playerName = playerName;
      client.onStateUpdate = () => {
        setTick((t) => (t + 1) % 10000);
      };
      client.onKillConfirm = (victimName, instinct) => {
        setMatchStats((prev) => ({
          ...prev,
          kills: prev.kills + 1,
          pulseAccurateKills: instinct ? prev.pulseAccurateKills + 1 : prev.pulseAccurateKills,
        }));
      };
      client.onPlayerDeath = (killer) => {
        setKillerName(killer);
        setMatchStats((prev) => ({ ...prev, deaths: prev.deaths + 1 }));
        if (client.state.mode === 'br' || client.state.mode === 'ffa') {
          handleMatchEnd(false);
        }
      };
      gameClientRef.current = client;
    }
    return gameClientRef.current;
  }, [playerName]);

  // Start a multiplayer match
  const handleStartMatch = (
    faction: FactionType = 'lotito',
    mode: GameMode = 'tdm',
    customRoom?: string,
    botCount?: number
  ) => {
    soundEngine.init();
    soundEngine.resume();
    setPlayerFaction(faction);

    const client = getGameClient();
    client.connect(faction, mode, customRoom, botCount);
    matchStartTimeRef.current = Date.now();

    setMatchStats({
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      shotsHit: 0,
      pulsesUsed: 0,
      pulseAccurateKills: 0,
      survivalSeconds: 0,
      meleeKills: 0,
      silentKills: 0,
      flaresUsed: 0,
      glowSticksUsed: 0,
      beaconsPlanted: 0,
      beaconsDefused: 0,
      instinctRating: 85,
    });

    setShowScoreboard(false);
    setShowPause(false);
    setShowControlsEditor(false);
    setCurrentView('match');

    if (!isMobile && matchContainerRef.current) {
      setTimeout(() => {
        try {
          matchContainerRef.current?.requestPointerLock?.();
        } catch {
          // Ignored
        }
      }, 100);
    }
  };

  // Leave active match and return to menu
  const handleLeaveMatch = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    const client = gameClientRef.current;
    if (client) {
      client.disconnect();
    }
    setShowPause(false);
    setShowScoreboard(false);
    setShowControlsEditor(false);
    setCurrentView('lobby');
  };

  // Resume active match from pause menu
  const handleResumeMatch = () => {
    setShowPause(false);
    if (!isMobile && matchContainerRef.current) {
      try {
        matchContainerRef.current.requestPointerLock?.();
      } catch {
        // Ignored
      }
    }
  };

  // Match ending handler
  const handleMatchEnd = (victory: boolean) => {
    const elapsedSec = Math.round((Date.now() - matchStartTimeRef.current) / 1000);
    setIsVictory(victory);

    const client = gameClientRef.current;
    const kills = client ? (client.state.ammoReserve < 5 ? 1 : 0) : 0;
    const gainedXp = (victory ? 500 : 150) + kills * 100;

    setXpEarned(gainedXp);
    setPlayerXp((prev) => {
      const updated = prev + gainedXp;
      if (updated >= 60000) setPlayerRank('Eclipse');
      else if (updated >= 30000) setPlayerRank('Nightfall');
      else if (updated >= 15000) setPlayerRank('Revenant');
      else if (updated >= 6000) setPlayerRank('Wraith');
      else if (updated >= 2000) setPlayerRank('Phantom');
      else if (updated >= 500) setPlayerRank('Shade');
      return updated;
    });

    setMatchStats((prev) => ({
      ...prev,
      survivalSeconds: elapsedSec,
      instinctRating: Math.min(99, Math.max(65, 75 + Math.floor(Math.random() * 20))),
    }));

    // Cross-Game Backend Synchronization (Supabase)
    syncMatchToSupabase({
      matchId: client?.state.matchId || `match_${Date.now()}`,
      mode: client?.state.mode || 'tdm',
      playerId: client?.id || 'player_' + playerName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      kills,
      deaths: victory ? 0 : 1,
      isVictory: victory,
      score: gainedXp,
      ratingDelta: victory ? 25 : -10,
    });

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    setCurrentView('post_match');
  };

  // Keyboard and mouse listener during active match
  useEffect(() => {
    if (currentView !== 'match') return;
    const client = gameClientRef.current;
    if (!client) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // TAB KEY: Toggle or view all players in the match
      if (e.key === 'Tab' || e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard((prev) => !prev);
        return;
      }

      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
        client.setKey(e.code, true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        client.triggerPulse();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        client.setKey('ShiftLeft', true);
      } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        client.setHoldingBreath(true);
      } else if (e.code === 'KeyC') {
        client.setCrouching(!client.state.isCrouching);
      } else if (e.code === 'KeyR') {
        client.startReload();
      } else if (e.code === 'KeyQ') {
        client.throwDecoy();
      } else if (e.code === 'KeyF') {
        client.throwFlare();
      } else if (e.code === 'KeyG') {
        client.throwGlowStick();
      } else if (e.code === 'KeyX') {
        client.activateFactionAbility();
      } else if (e.code === 'KeyV') {
        client.melee();
      } else if (e.code === 'KeyE') {
        if (client.state.nearbyCacheToOpen) {
          client.startScavengeCache(client.state.nearbyCacheToOpen.id);
        }
      } else if (e.code === 'Digit3') {
        client.useActiveScan();
      } else if (e.code === 'Digit4') {
        client.plantMine();
      } else if (e.code === 'Digit7') {
        client.useUltimate();
      } else if (e.code === 'Escape') {
        if (showScoreboard) {
          setShowScoreboard(false);
        } else if (showControlsEditor) {
          setShowControlsEditor(false);
        } else {
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          setShowPause((prev) => !prev);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
        client.setKey(e.code, false);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        client.setKey('ShiftLeft', false);
      } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        client.setHoldingBreath(false);
      } else if (e.code === 'KeyE') {
        client.cancelScavengeCache();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobile && document.pointerLockElement !== matchContainerRef.current) {
        matchContainerRef.current?.requestPointerLock?.();
      }

      if (e.button === 0) {
        if (client.state.isGhostMode) {
          client.melee();
        } else {
          client.fire();
        }
      } else if (e.button === 2) {
        client.setAimSteady(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        client.setAimSteady(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === matchContainerRef.current || !isMobile) {
        // Horizontal yaw only, vertical aim locked straight ahead
        client.addMouseDelta(e.movementX, 0, settings.mouseSensitivity);
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [currentView, isMobile, settings.mouseSensitivity, showScoreboard, showPause, showControlsEditor]);

  const client = gameClientRef.current;
  const currentGameState: ClientGameState = client?.state || {
    matchId: '',
    mode: 'tdm',
    phase: 'hunt',
    phaseTimeRemaining: 600,
    weather: 'clear',
    weatherMasking: 0,
    map: 'the_grove',
    aliveCount: 6,
    totalPlayers: 6,
    zoneRadius: 80,
    zoneCenter: { x: 0, z: 0 },
    faction: playerFaction,
    rank: playerRank,
    equippedMuzzleLevel: 0,
    unlockedMuzzleLevel: 2,
    players: [],
    tdmLivesLogigi: 60,
    tdmLivesLotito: 60,
    tdmTeamWipeCountdown: null,
    tdmWipedTeam: null,
    lightWarRound: 1,
    lightWarScoreLogigi: 0,
    lightWarScoreLotito: 0,
    beaconStatus: 'carried',
    beaconSite: null,
    beaconTimerRemaining: null,
    isBlindedByLight: false,
    blindnessRemaining: 0,
    canShootDuringBlindness: false,
    seeSilhouettesRemaining: 0,
    health: 100,
    maxHealth: 100,
    ammoMag: 3,
    ammoReserve: 5,
    maxMag: 3,
    isGhostMode: false,
    stamina: 100,
    maxStamina: 100,
    isHoldingBreath: false,
    isCrouching: false,
    movementMode: 'still',
    isAimingSteady: false,
    flaresAvailable: 0,
    glowSticksAvailable: 2,
    hasClownMaskDecoy: false,
    activeLightSources: [],
    veilActive: false,
    veilCooldownRemaining: 0,
    illuminateCooldownRemaining: 0,
    pulseCooldownRemaining: 0,
    maxPulseCooldown: 8,
    pulseCharges: 1,
    maxPulseCharges: 1,
    activePulseRingRadius: null,
    activeBlobs: [],
    reloadingStage: 'none',
    reloadProgress: 0,
    decoysAvailable: 2,
    maxDecoys: 2,
    killstreak: {
      currentKills: 0,
      unlockedTracker: false,
      unlockedActiveScan: false,
      unlockedMine: false,
      unlockedUltimate: false,
      carriedMine: false,
      trackerActiveTimeRemaining: 0,
      activeScanTimeRemaining: 0,
    },
    placedMines: [],
    trackerEnemies: [],
    scavengingCacheId: null,
    scavengeProgress: 0,
    nearbyCacheToOpen: null,
    warmVignette: false,
    sharedHeartbeat: false,
    nearCampingGhost: false,
    lastHitTime: 0,
    lastDamageTime: 0,
    lastLightningTime: 0,
    lightningSilhouettes: [],
    exploredTiles: [],
    knownAmmoCaches: [],
    supplyDrops: [],
    audioEventPings: [],
  };

  return (
    <main className="w-screen h-screen bg-black text-zinc-100 overflow-hidden font-sans relative">
      {/* 1. Canonical Opening Screen: "We were all one. Suddenly, the L'ogigi came..." */}
      {currentView === 'opening' && (
        <OpeningScreen
          onEnterSector7={(faction, mode) => handleStartMatch(faction, mode)}
          onOpenTutorial={() => setCurrentView('onboarding')}
          onOpenSpectator={() => handleStartMatch('lotito', 'spectator')}
        />
      )}

      {/* 2. Main Lobby */}
      {currentView === 'lobby' && (
        <Lobby
          playerName={playerName}
          onUpdatePlayerName={setPlayerName}
          playerRank={playerRank}
          playerXp={playerXp}
          playerTitle={playerTitle}
          onSelectTitle={setPlayerTitle}
          onStartMatch={(mode, room, botCount) =>
            handleStartMatch(playerFaction, mode as GameMode, room, botCount)
          }
          onStartOnboarding={() => setCurrentView('onboarding')}
          onOpenSettings={() => setShowSettings(true)}
          onOpenSupabase={() => setShowSupabase(true)}
          settings={settings}
        />
      )}

      {/* 3. Audio-First Onboarding Tutorial */}
      {currentView === 'onboarding' && (
        <Onboarding
          onComplete={() => setCurrentView('lobby')}
          onSkip={() => setCurrentView('lobby')}
        />
      )}

      {/* 4. Active Match: Pure Darkness Viewport, Weapon View, Mini-Map & HUD */}
      {currentView === 'match' && (
        <div
          ref={matchContainerRef}
          id="match-container"
          className="relative w-full h-full bg-black overflow-hidden"
        >
          <BlackoutViewport
            gameState={currentGameState}
            subtitleCues={client?.subtitleCues || []}
            directionalGlows={client?.directionalGlows || []}
            settings={settings}
            yaw={client?.yaw || 0}
          />

          <HUD
            gameState={currentGameState}
            playerX={client?.x || 0}
            playerZ={client?.z || 0}
            yaw={client?.yaw || 0}
            onTriggerPulse={() => client?.triggerPulse()}
            onFire={() => client?.fire()}
            onMelee={() => client?.melee()}
            onReload={() => client?.startReload()}
            onCancelReload={() => client?.cancelReload()}
            onDecoy={() => client?.throwDecoy()}
            onThrowFlare={() => client?.throwFlare()}
            onThrowGlowStick={() => client?.throwGlowStick()}
            onActivateAbility={() => client?.activateFactionAbility()}
            onToggleCrouch={() => client?.setCrouching(!currentGameState.isCrouching)}
            onToggleHoldBreath={() => client?.setHoldingBreath(!currentGameState.isHoldingBreath)}
            onToggleScoreboard={() => setShowScoreboard((prev) => !prev)}
            onSetMuzzle={(lvl) => client?.setMuzzle(lvl)}
            onUseActiveScan={() => client?.useActiveScan()}
            onPlantMine={() => client?.plantMine()}
            onUseUltimate={() => client?.useUltimate()}
            onStartScavengeCache={(id) => client?.startScavengeCache(id)}
            onCancelScavengeCache={() => client?.cancelScavengeCache()}
            onPauseMatch={() => {
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              setShowPause(true);
            }}
            onOpenControlsEditor={() => setShowControlsEditor(true)}
            onMobileMoveChange={(dx, dy, isSprint) => {
              if (!client) return;
              if (dy < -0.25) {
                client.setKey('KeyW', true);
                client.setKey('KeyS', false);
              } else if (dy > 0.25) {
                client.setKey('KeyS', true);
                client.setKey('KeyW', false);
              } else {
                client.setKey('KeyW', false);
                client.setKey('KeyS', false);
              }
              if (dx > 0.25) {
                client.setKey('KeyD', true);
                client.setKey('KeyA', false);
              } else if (dx < -0.25) {
                client.setKey('KeyA', true);
                client.setKey('KeyD', false);
              } else {
                client.setKey('KeyA', false);
                client.setKey('KeyD', false);
              }
              client.setKey('ShiftLeft', isSprint);
            }}
            onMobileLookDelta={(deltaYaw) => {
              if (!client) return;
              client.addMouseDelta(deltaYaw * 900, 0, settings.mouseSensitivity || 0.002);
            }}
            settings={settings}
            isMobile={isMobile}
          />

          {/* Player Roster Scoreboard Overlay (Press TAB) */}
          {showScoreboard && (
            <PlayerRosterModal
              gameState={currentGameState}
              onClose={() => setShowScoreboard(false)}
            />
          )}

          {/* Quick Exit / Menu Button */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
            <button
              onClick={() => {
                if (document.pointerLockElement) {
                  document.exitPointerLock();
                }
                setShowPause(true);
              }}
              className="px-2.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-100 bg-zinc-950/90 border border-zinc-800 hover:border-zinc-600 transition-colors shadow-sm"
            >
              [ESC] Menu / Leave Game
            </button>
          </div>
        </div>
      )}

      {/* 5. Post Match Scoreboard & Instinct Rating */}
      {currentView === 'post_match' && (
        <PostMatch
          isVictory={isVictory}
          killerName={killerName}
          stats={matchStats}
          playerRank={playerRank}
          xpEarned={xpEarned}
          onPlayAgain={() => handleStartMatch(playerFaction, currentGameState.mode)}
          onReturnToLobby={() => setCurrentView('lobby')}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowSettings(false)}
          onOpenMobileControlsEditor={() => setShowControlsEditor(true)}
        />
      )}

      {/* Cross-Game Supabase Persistent Backend & Deployment Modal */}
      <SupabaseModal
        isOpen={showSupabase}
        onClose={() => setShowSupabase(false)}
        playerId={'player_' + playerName.toLowerCase().replace(/[^a-z0-9]/g, '')}
        playerName={playerName}
      />

      {/* 6. In-Game Pause & Leave Match Modal */}
      {showPause && (
        <PauseModal
          mode={currentGameState.mode}
          isMobile={isMobile}
          onResume={handleResumeMatch}
          onLeaveMatch={handleLeaveMatch}
          onOpenSettings={() => {
            setShowPause(false);
            setShowSettings(true);
          }}
          onOpenControlsEditor={() => {
            setShowPause(false);
            setShowControlsEditor(true);
          }}
        />
      )}

      {/* 7. Mobile Controls Drag & Drop Layout Customizer */}
      {showControlsEditor && (
        <MobileControlsEditor
          currentConfig={settings.mobileControls || DEFAULT_MOBILE_CONTROLS}
          onSaveConfig={(newConfig) => {
            setSettings((prev) => ({
              ...prev,
              mobileControls: newConfig,
            }));
            setShowControlsEditor(false);
          }}
          onClose={() => setShowControlsEditor(false)}
        />
      )}

      {/* Mobile Landscape Orientation Lock & Rotator */}
      <LandscapeEnforcer />
    </main>
  );
}
