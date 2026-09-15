/**
 * Shadow Shot - Client Game Controller & Networking
 * Master Implementation: L'ogigi War, Factions, TDM 60-Lives System, The Light War, Mini-Map Exploration, Weapon Control
 */

import { soundEngine } from '../audio/SoundEngine';
import {
  ClientGameState,
  MovementMode,
  PulseBlob,
  ReloadStageName,
  SubtitleCue,
  DirectionalGlow,
  SurfaceType,
  FactionType,
  GameMode,
  MatchPlayerInfo,
  LightSource,
} from '../types';

export class GameClient {
  private ws: WebSocket | null = null;
  public playerId: string = '';
  public playerName: string = 'Hollow-7';
  public roomId: string = 'sector_7';

  // Player position & orientation
  // Eye level 1.7m, horizontal yaw rotation only, NO vertical pitch (locked straight ahead)
  public x: number = 0;
  public z: number = 0;
  public yaw: number = 0; // radians
  public pitch: number = 0; // strictly locked to 0

  // Key states
  private keys: Record<string, boolean> = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ShiftLeft: false,
    ControlLeft: false,
  };

  // State
  public state: ClientGameState = {
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

    // Faction, Rank & Lore
    faction: 'lotito',
    rank: 'Phantom',
    equippedMuzzleLevel: 0,
    unlockedMuzzleLevel: 2,
    players: [],

    // TDM Lives System
    tdmLivesLogigi: 60,
    tdmLivesLotito: 60,
    tdmTeamWipeCountdown: null,
    tdmWipedTeam: null,

    // The Light War
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

    // Local player state
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

    // Light resources
    flaresAvailable: 0,
    glowSticksAvailable: 2,
    hasClownMaskDecoy: false,
    activeLightSources: [],

    // Faction Abilities
    veilActive: false,
    veilCooldownRemaining: 0,
    illuminateCooldownRemaining: 0,

    // Pulse state & Submarine Sonar Radar
    pulseCooldownRemaining: 0,
    maxPulseCooldown: 8,
    pulseCharges: 1,
    maxPulseCharges: 1,
    activePulseRingRadius: null,
    activeBlobs: [],
    radarContacts: [],
    targetInSights: false,

    // Reload state
    reloadingStage: 'none',
    reloadProgress: 0,

    // Decoys & Killstreaks
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

    // Cache scavenge interaction
    scavengingCacheId: null,
    scavengeProgress: 0,
    nearbyCacheToOpen: null,

    // Proximity alerts
    warmVignette: false,
    sharedHeartbeat: false,
    nearCampingGhost: false,

    // Combat feedback
    lastHitTime: 0,
    lastDamageTime: 0,
    lastLightningTime: 0,
    lightningSilhouettes: [],

    // Mini-map & Exploration
    exploredTiles: [],
    knownAmmoCaches: [
      { x: 20, z: 20 },
      { x: -20, z: -20 },
    ],
    supplyDrops: [{ x: 0, z: 30 }],
    audioEventPings: [],
  };

  // Subtitles & Audio glows for visual accessibility
  public subtitleCues: SubtitleCue[] = [];
  public directionalGlows: DirectionalGlow[] = [];

  // Reload timers
  private reloadTimeout: number | null = null;

  // Callbacks
  public onStateUpdate?: () => void;
  public onKillConfirm?: (victimName: string, instinct: boolean) => void;
  public onPlayerDeath?: (killerName: string) => void;

  // Movement loop
  private animFrameId: number | null = null;
  private lastStepSoundTime: number = 0;
  private lastTileCheckTime: number = 0;

  constructor() {
    this.startLoop();
  }

  public connect(
    faction: FactionType = 'lotito',
    mode: GameMode = 'tdm',
    roomId?: string,
    botCount?: number
  ) {
    this.state.faction = faction;
    this.state.mode = mode;
    this.state.flaresAvailable = faction === 'logigi' ? 2 : 0;
    this.state.glowSticksAvailable = faction === 'lotito' ? 2 : 1;
    this.state.maxPulseCooldown = faction === 'logigi' ? 12 : 8;

    if (roomId) this.roomId = roomId;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'join_match',
          roomId: this.roomId,
          mode: this.state.mode,
          faction: this.state.faction,
          playerName: this.playerName,
          botCount: typeof botCount === 'number' ? botCount : 3,
        })
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          // Reconnection attempt
        }
      }, 2000);
    };
  }

  private handleServerMessage(data: any) {
    if (data.type === 'joined') {
      this.playerId = data.playerId;
      this.state.matchId = data.roomId;
      this.state.weather = data.weather;
      this.state.zoneRadius = data.zoneRadius;
      if (data.faction) this.state.faction = data.faction;
      if (data.equippedMuzzleLevel !== undefined) this.state.equippedMuzzleLevel = data.equippedMuzzleLevel;
      if (data.unlockedMuzzleLevel !== undefined) this.state.unlockedMuzzleLevel = data.unlockedMuzzleLevel;
      soundEngine.setWeather(data.weather);
      this.notifyUpdate();
    } else if (data.type === 'player_sync') {
      this.state.health = data.health;
      this.state.stamina = data.stamina;
      this.state.ammoMag = data.ammoMag;
      this.state.ammoReserve = data.ammoReserve;
      this.state.isGhostMode = data.isGhostMode;
      this.state.pulseCooldownRemaining = data.pulseCooldown;
      this.state.aliveCount = data.aliveCount;
      this.state.zoneRadius = data.zoneRadius;
      this.state.warmVignette = data.warmVignette;
      this.state.sharedHeartbeat = data.sharedHeartbeat;

      // Muzzle Sync
      if (data.equippedMuzzleLevel !== undefined) {
        this.state.equippedMuzzleLevel = data.equippedMuzzleLevel;
      }
      if (data.unlockedMuzzleLevel !== undefined) {
        this.state.unlockedMuzzleLevel = data.unlockedMuzzleLevel;
      }

      // Killstreak Sync
      if (data.killstreak) {
        this.state.killstreak = {
          currentKills: data.killstreak.currentKills || 0,
          unlockedTracker: !!data.killstreak.unlockedTracker,
          unlockedActiveScan: !!data.killstreak.unlockedActiveScan,
          unlockedMine: !!data.killstreak.carriedMines,
          unlockedUltimate: !!data.killstreak.unlockedUltimate,
          carriedMine: data.killstreak.carriedMines > 0,
          trackerActiveTimeRemaining: data.killstreak.trackerRemaining || 0,
          activeScanTimeRemaining: 0,
        };
      }
      if (data.trackerEnemies) {
        this.state.trackerEnemies = data.trackerEnemies.map((e: any, idx: number) => ({
          id: `tr_${idx}`,
          x: e.x,
          z: e.z,
        }));
      }

      // Ammo Cache & Scavenging Sync
      if (data.knownAmmoCaches) {
        this.state.knownAmmoCaches = data.knownAmmoCaches;
      }
      this.state.nearbyCacheToOpen = data.nearbyCacheToOpen
        ? {
            id: data.nearbyCacheToOpen.id,
            x: data.nearbyCacheToOpen.x,
            z: data.nearbyCacheToOpen.z,
            dist: Math.hypot(this.x - data.nearbyCacheToOpen.x, this.z - data.nearbyCacheToOpen.z),
          }
        : null;
      this.state.scavengingCacheId = data.isScavenging ? 'scavenging' : null;
      this.state.scavengeProgress = data.scavengeProgress || 0;

      // Placed Mines Sync
      if (data.placedMines) {
        this.state.placedMines = data.placedMines.map((m: any) => ({
          id: m.id,
          ownerId: m.ownerId || '',
          ownerFaction: m.isFriendly ? this.state.faction : (this.state.faction === 'logigi' ? 'lotito' : 'logigi'),
          type: m.type,
          x: m.x,
          z: m.z,
          isArmed: m.isArmed,
          armedAt: 0,
          created: 0,
        }));
      }

      if (data.players) {
        this.state.players = data.players;
      }

      // TDM Sync
      if (data.tdmLivesLogigi !== undefined) {
        this.state.tdmLivesLogigi = data.tdmLivesLogigi;
        this.state.tdmLivesLotito = data.tdmLivesLotito;
        this.state.tdmTeamWipeCountdown = data.tdmTeamWipeCountdown;
        this.state.tdmWipedTeam = data.tdmWipedTeam;
      }

      // Light War Sync
      if (data.lightWarRound !== undefined) {
        this.state.lightWarRound = data.lightWarRound;
        this.state.lightWarScoreLogigi = data.lightWarScoreLogigi;
        this.state.lightWarScoreLotito = data.lightWarScoreLotito;
        this.state.beaconStatus = data.beaconStatus;
        this.state.beaconSite = data.beaconSite;
        this.state.beaconTimerRemaining = data.beaconTimerRemaining;
        this.state.isBlindedByLight = data.isBlindedByLight;
        this.state.blindnessRemaining = data.blindnessRemaining;
      }

      // Active Lights
      if (data.activeLightSources) {
        this.state.activeLightSources = data.activeLightSources;
      }

      if (data.sharedHeartbeat) {
        soundEngine.playHeartbeatBeat(110, true);
      }

      if (!data.alive && this.state.health <= 0) {
        this.onPlayerDeath?.('Enemy Shadow');
      }

      this.notifyUpdate();
    } else if (data.type === 'muzzle_changed') {
      this.state.equippedMuzzleLevel = data.level;
      this.notifyUpdate();
    } else if (data.type === 'killstreak_unlocked') {
      this.addSubtitle(`[KILLSTREAK UNLOCKED: ${data.name.toUpperCase()}!]`, 'ahead');
      soundEngine.playKillConfirm();
      this.notifyUpdate();
    } else if (data.type === 'active_scan_result') {
      this.handlePulseResult(data.blobs);
      this.addSubtitle(`[ACTIVE SCAN: ${data.blobs.length} contacts revealed!]`, 'ahead');
    } else if (data.type === 'cache_discovered') {
      this.addSubtitle('[AMMO CACHE DISCOVERED ON MAP]', 'ahead');
      this.state.knownAmmoCaches.push({ x: data.x, z: data.z });
      this.notifyUpdate();
    } else if (data.type === 'cache_scavenged_success') {
      this.addSubtitle('[AMMO SCAVENGED: +2 ROUNDS]', 'ahead');
      soundEngine.playReloadStage('mag_in', true);
      this.notifyUpdate();
    } else if (data.type === 'mine_planted') {
      this.addSubtitle('[MINE ARMED & PLANTED]', 'ahead');
      soundEngine.playReloadStage('bolt_pull', true);
      this.notifyUpdate();
    } else if (data.type === 'blinded_by_ultimate') {
      this.state.isBlindedByLight = true;
      this.state.blindnessRemaining = (data.duration || 5000) / 1000;
      this.notifyUpdate();
      setTimeout(() => {
        this.state.isBlindedByLight = false;
        this.notifyUpdate();
      }, data.duration || 5000);
    } else if (data.type === 'ultimate_activated') {
      this.state.seeSilhouettesRemaining = 3;
      this.addSubtitle('[LIGHT BOMB / DARK PULSE DETONATED!]', 'ahead');
      this.notifyUpdate();
    } else if (data.type === 'audio_event') {
      this.handleIncomingAudio(data);
    } else if (data.type === 'pulse_result') {
      this.handlePulseResult(data.blobs);
    } else if (data.type === 'hit_marker') {
      this.state.lastHitTime = Date.now();
      soundEngine.playKillConfirm();
      this.onKillConfirm?.(data.victimName, data.instinct);
      this.notifyUpdate();
    } else if (data.type === 'killed') {
      this.state.health = 0;
      this.onPlayerDeath?.(data.killerName);
      this.notifyUpdate();
    } else if (data.type === 'weather_change') {
      this.state.weather = data.weather;
      this.state.weatherMasking = data.masking;
      soundEngine.setWeather(data.weather, data.masking);
      this.notifyUpdate();
    } else if (data.type === 'lightning_flash') {
      this.state.lastLightningTime = Date.now();
      this.state.lightningSilhouettes = data.silhouettes || [];
      soundEngine.playThunder();
      this.notifyUpdate();
    } else if (data.type === 'empty_click') {
      soundEngine.playEmptyClick();
    }
  }

  private handleIncomingAudio(event: any) {
    const { sound, x, z, dist, isSelf, surface, stageName } = event;

    // Relative angle for visual cues & mini-map pings
    const dx = x - this.x;
    const dz = z - this.z;
    const soundAngle = (Math.atan2(dx, -dz) - this.yaw) * (180 / Math.PI);
    const normAngle = (soundAngle + 360) % 360;

    // Register audio event ping on mini-map edge
    if (!isSelf) {
      this.state.audioEventPings.push({
        angle: normAngle,
        isGunshot: sound === 'gunshot',
        created: Date.now(),
      });
      // Filter expired audio pings (1.5s)
      this.state.audioEventPings = this.state.audioEventPings.filter(
        (p) => Date.now() - p.created < 1500
      );
    }

    let dirLabel = 'ahead';
    if (normAngle > 45 && normAngle < 135) dirLabel = 'right';
    else if (normAngle >= 135 && normAngle <= 225) dirLabel = 'behind';
    else if (normAngle > 225 && normAngle < 315) dirLabel = 'left';

    const distLabel = dist < 6 ? 'near' : dist < 18 ? 'mid' : 'far';

    if (!isSelf) {
      let soundDesc = sound.replace('_', ' ');
      if (sound === 'footstep') soundDesc = 'Footsteps';
      else if (sound === 'gunshot') soundDesc = 'Gunshot crack';
      else if (sound === 'reload_stage') soundDesc = `Reload (${stageName || 'bolt'})`;
      else if (sound === 'pulse_ping') soundDesc = 'Pulse sonar ping';
      else if (sound === 'gasp') soundDesc = 'Exhausted gasp';
      else if (sound === 'flare_ignite') soundDesc = 'Flare ignited';
      else if (sound === 'let_there_be_light') soundDesc = '"LET THERE BE LIGHT" Detonation';
      else if (sound === 'cache_rummaging') soundDesc = 'Ammo crate rummaging (metallic clatter)';
      else if (sound === 'cache_scavenged') soundDesc = 'Ammo cache secured (latch snap)';

      this.addSubtitle(`[${soundDesc} — ${dirLabel}, ${distLabel}]`, dirLabel);
      this.addDirectionalGlow(normAngle, dist < 10 ? 1.0 : 0.6);
    }

    // Play synthesized Web Audio HRTF sound
    if (sound === 'footstep') {
      soundEngine.playFootstep(x, z, surface || 'gravel', false, false);
    } else if (sound === 'gunshot') {
      soundEngine.playGunshot(x, z, isSelf);
    } else if (sound === 'reload_stage') {
      soundEngine.playReloadStage(stageName || 'mag_in', isSelf);
    } else if (sound === 'pulse_ping') {
      soundEngine.playEnemyPulsePing(x, z);
    } else if (sound === 'gasp') {
      soundEngine.playGasp(x, z, isSelf);
    } else if (sound === 'empty_click') {
      soundEngine.playEmptyClick();
    } else if (sound === 'spectral_hum') {
      soundEngine.playGhostHum(x, z);
    } else if (sound === 'melee_swing') {
      soundEngine.playMeleeSwing();
    } else if (sound === 'decoy') {
      soundEngine.playDecoyTicking(x, z);
    } else if (sound === 'cache_rummaging') {
      soundEngine.playCacheRummaging(x, z, isSelf);
    } else if (sound === 'cache_scavenged') {
      soundEngine.playCacheScavenged(x, z, isSelf);
    }
  }

  private handlePulseResult(blobs: PulseBlob[]) {
    this.state.activeBlobs = blobs;
    this.state.activePulseRingRadius = 0;
    const ringStartTime = performance.now();
    const durationMs = 600;

    const animateRing = () => {
      const elapsed = performance.now() - ringStartTime;
      if (elapsed < durationMs) {
        this.state.activePulseRingRadius = (elapsed / durationMs) * 25;
        this.notifyUpdate();
        requestAnimationFrame(animateRing);
      } else {
        this.state.activePulseRingRadius = null;
        this.notifyUpdate();
      }
    };
    requestAnimationFrame(animateRing);

    for (const blob of blobs) {
      soundEngine.playBlobEcho(blob.angle, blob.distance);
    }

    // Fade blobs over 0.8s
    setTimeout(() => {
      this.state.activeBlobs = [];
      this.notifyUpdate();
    }, 800);
  }

  // --- ACTIONS ---
  public triggerPulse() {
    if (this.state.pulseCooldownRemaining > 0) return;
    this.state.pulseCooldownRemaining = this.state.faction === 'logigi' ? 12 : 8;
    soundEngine.playPulseWhoomp(this.state.faction === 'lotito');

    this.ws?.send(JSON.stringify({ type: 'pulse' }));
    this.notifyUpdate();
  }

  public fire() {
    if (this.state.reloadingStage !== 'none') {
      this.cancelReload();
      return;
    }

    if (this.state.isGhostMode || this.state.ammoMag <= 0) {
      soundEngine.playEmptyClick();
      this.ws?.send(JSON.stringify({ type: 'fire' }));
      return;
    }

    soundEngine.playGunshot(this.x, this.z, true);
    this.state.ammoMag = Math.max(0, this.state.ammoMag - 1);
    this.ws?.send(
      JSON.stringify({
        type: 'fire',
        yaw: this.yaw,
        isAimingSteady: this.state.isAimingSteady,
      })
    );
    this.notifyUpdate();
  }

  public melee() {
    soundEngine.playMeleeSwing();
    this.ws?.send(JSON.stringify({ type: 'melee' }));
  }

  public throwDecoy() {
    if (this.state.decoysAvailable <= 0) return;
    this.state.decoysAvailable--;
    this.ws?.send(JSON.stringify({ type: 'decoy' }));
    this.notifyUpdate();
  }

  public throwFlare() {
    if (this.state.flaresAvailable <= 0) return;
    this.state.flaresAvailable--;
    this.ws?.send(JSON.stringify({ type: 'throw_flare' }));
    this.notifyUpdate();
  }

  public throwGlowStick() {
    if (this.state.glowSticksAvailable <= 0) return;
    this.state.glowSticksAvailable--;
    this.ws?.send(JSON.stringify({ type: 'throw_glow_stick' }));
    this.notifyUpdate();
  }

  // --- MUZZLE & PROGRESSION ---
  public setMuzzle(level: number) {
    if (level < 0 || level > this.state.unlockedMuzzleLevel) return;
    this.state.equippedMuzzleLevel = level;
    this.ws?.send(JSON.stringify({ type: 'set_muzzle', level }));
    this.notifyUpdate();
  }

  // --- KILLSTREAKS ---
  public useActiveScan() {
    if (!this.state.killstreak.unlockedActiveScan) return;
    this.state.killstreak.unlockedActiveScan = false;
    soundEngine.playPulseWhoomp(false);
    this.ws?.send(JSON.stringify({ type: 'use_active_scan' }));
    this.notifyUpdate();
  }

  public plantMine() {
    if (!this.state.killstreak.carriedMine) return;
    this.state.killstreak.carriedMine = false;
    soundEngine.playReloadStage('bolt_pull', true);
    this.ws?.send(JSON.stringify({ type: 'plant_mine' }));
    this.notifyUpdate();
  }

  public useUltimate() {
    if (!this.state.killstreak.unlockedUltimate) return;
    this.state.killstreak.unlockedUltimate = false;
    this.ws?.send(JSON.stringify({ type: 'use_ultimate' }));
    this.notifyUpdate();
  }

  // --- AMMO CACHE SCAVENGING ---
  public startScavengeCache(cacheId: string) {
    this.ws?.send(JSON.stringify({ type: 'start_scavenge_cache', cacheId }));
  }

  public cancelScavengeCache() {
    this.ws?.send(JSON.stringify({ type: 'cancel_scavenge_cache' }));
  }

  public activateFactionAbility() {
    this.ws?.send(JSON.stringify({ type: 'activate_ability' }));
    if (this.state.faction === 'lotito') {
      this.state.veilActive = true;
      setTimeout(() => {
        this.state.veilActive = false;
        this.notifyUpdate();
      }, 5000);
    }
    this.notifyUpdate();
  }

  public startReload() {
    if (this.state.ammoMag >= 3 || this.state.ammoReserve <= 0 || this.state.reloadingStage !== 'none') {
      return;
    }

    this.advanceReloadStage('mag_release');
  }

  private advanceReloadStage(stage: ReloadStageName) {
    this.state.reloadingStage = stage;
    this.ws?.send(JSON.stringify({ type: 'reload', stage }));
    soundEngine.playReloadStage(stage, true);
    this.notifyUpdate();

    let duration = 200;
    let nextStage: ReloadStageName = 'mag_out';

    if (stage === 'mag_release') {
      duration = 200;
      nextStage = 'mag_out';
    } else if (stage === 'mag_out') {
      duration = 300;
      nextStage = 'mag_in';
    } else if (stage === 'mag_in') {
      duration = 400;
      nextStage = 'bolt_pull';
    } else if (stage === 'bolt_pull') {
      duration = 600;
      nextStage = 'ready';
    } else if (stage === 'ready') {
      this.state.reloadingStage = 'none';
      this.notifyUpdate();
      return;
    }

    this.reloadTimeout = window.setTimeout(() => {
      this.advanceReloadStage(nextStage);
    }, duration);
  }

  public cancelReload() {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
      this.reloadTimeout = null;
    }

    if (this.state.reloadingStage === 'bolt_pull') {
      soundEngine.playFootstep(this.x, this.z, 'metal', false, false);
      this.state.ammoReserve = Math.max(0, this.state.ammoReserve - 1);
    }

    this.state.reloadingStage = 'none';
    this.notifyUpdate();
  }

  // --- INPUT CONTROLS ---
  public setKey(code: string, isDown: boolean) {
    this.keys[code] = isDown;
    this.updateMovementState();
  }

  // Horizontal yaw only, vertical aim locked straight ahead
  public addMouseDelta(dx: number, _dy: number, sensitivity: number = 0.002) {
    this.yaw += dx * sensitivity;
    this.pitch = 0; // strictly locked to 0
    soundEngine.updateListener(this.x, this.z, this.yaw);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'player_input',
          yaw: this.yaw,
          movementMode: this.state.movementMode,
          moveVector: { x: 0, z: 0 },
          isHoldingBreath: this.state.isHoldingBreath,
          isCrouching: this.state.isCrouching,
          isAimingSteady: this.state.isAimingSteady,
        })
      );
    }
    this.notifyUpdate();
  }

  public setAimSteady(steady: boolean) {
    if (steady && !this.state.isAimingSteady) {
      soundEngine.playSniperScopeIn();
    } else if (!steady && this.state.isAimingSteady) {
      soundEngine.playSniperScopeOut();
    }
    this.state.isAimingSteady = steady;
    this.notifyUpdate();
  }

  public setHoldingBreath(holding: boolean) {
    this.state.isHoldingBreath = holding;
    this.updateMovementState();
  }

  public setCrouching(crouching: boolean) {
    this.state.isCrouching = crouching;
    this.updateMovementState();
  }

  private updateMovementState() {
    const isMoving = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
    if (!isMoving) {
      this.state.movementMode = 'still';
    } else if (this.state.isCrouching) {
      this.state.movementMode = 'crouch';
    } else if (this.keys['ShiftLeft']) {
      this.state.movementMode = 'sprint';
    } else {
      this.state.movementMode = 'walk';
    }
  }

  private startLoop() {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      // Handle local player movement vector
      let moveX = 0;
      let moveZ = 0;
      if (this.keys['KeyW']) moveZ -= 1;
      if (this.keys['KeyS']) moveZ += 1;
      if (this.keys['KeyA']) moveX -= 1;
      if (this.keys['KeyD']) moveX += 1;

      if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        moveX /= len;
        moveZ /= len;

        const speed = this.state.isGhostMode
          ? this.state.movementMode === 'sprint'
            ? 7.2
            : 3.6
          : this.state.movementMode === 'crouch'
          ? 1.5
          : this.state.movementMode === 'sprint'
          ? 6.0
          : 3.0;

        const cos = Math.cos(this.yaw);
        const sin = Math.sin(this.yaw);
        const worldDx = (moveX * cos - moveZ * sin) * speed * deltaSec;
        const worldDz = (moveX * sin + moveZ * cos) * speed * deltaSec;

        this.x += worldDx;
        this.z += worldDz;
        soundEngine.updateListener(this.x, this.z, this.yaw);

        // Record explored fog-of-war tiles (every 1s or 4m)
        if (now - this.lastTileCheckTime > 600) {
          this.lastTileCheckTime = now;
          const currentTileX = Math.round(this.x / 4) * 4;
          const currentTileZ = Math.round(this.z / 4) * 4;
          const exists = this.state.exploredTiles.some(
            (t) => Math.abs(t.x - currentTileX) < 3 && Math.abs(t.z - currentTileZ) < 3
          );
          if (!exists) {
            this.state.exploredTiles.push({ x: currentTileX, z: currentTileZ });
          }
        }

        // Footstep audio timing
        const stepInterval =
          this.state.movementMode === 'sprint'
            ? 320
            : this.state.movementMode === 'crouch'
            ? 650
            : 450;

        if (now - this.lastStepSoundTime > stepInterval) {
          this.lastStepSoundTime = now;
          soundEngine.playFootstep(
            this.x,
            this.z,
            'wood',
            this.state.movementMode === 'crouch',
            this.state.movementMode === 'sprint'
          );
          this.ws?.send(JSON.stringify({ type: 'footstep', surface: 'wood' }));
        }

        // Send input update to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'player_input',
              yaw: this.yaw,
              movementMode: this.state.movementMode,
              moveVector: { x: moveX, z: moveZ },
              isHoldingBreath: this.state.isHoldingBreath,
              isCrouching: this.state.isCrouching,
              isAimingSteady: this.state.isAimingSteady,
            })
          );
        }
      }

      // Decay directional glows
      this.directionalGlows = this.directionalGlows.filter((g) => now - g.timestamp < 1200);

      // Compute Submarine Radar contacts and ADS target alignment
      const contacts = [];
      let targetInSights = false;

      for (const p of this.state.players) {
        if (p.isSelf || !p.isAlive || p.x === undefined || p.z === undefined) continue;
        const dx = p.x - this.x;
        const dz = p.z - this.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 32) {
          const rawAngleDeg = (Math.atan2(dx, -dz) - this.yaw) * (180 / Math.PI);
          const normAngleDeg = ((rawAngleDeg % 360) + 360) % 360;

          contacts.push({
            id: p.id,
            angle: normAngleDeg,
            distance: dist,
            isHostile: !p.isTeammate,
            name: p.name,
            signalStrength: Math.max(0.2, 1 - dist / 32),
            lastDetected: now,
          });

          // In ADS: check if hostile enemy is directly aligned in front of scope
          if (this.state.isAimingSteady && !p.isTeammate) {
            const angleDiff = Math.abs(((rawAngleDeg + 180) % 360) - 180);
            if (angleDiff < 12) {
              targetInSights = true;
            }
          }
        }
      }

      this.state.radarContacts = contacts;

      if (targetInSights !== this.state.targetInSights) {
        this.state.targetInSights = targetInSights;
        if (targetInSights) {
          soundEngine.playTargetInSightWhisper();
        }
        this.notifyUpdate();
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private addSubtitle(text: string, direction: string) {
    const cue: SubtitleCue = {
      id: `sub_${Date.now()}_${Math.random()}`,
      text,
      direction,
      timestamp: Date.now(),
    };
    this.subtitleCues.unshift(cue);
    if (this.subtitleCues.length > 3) this.subtitleCues.pop();
    this.notifyUpdate();

    setTimeout(() => {
      this.subtitleCues = this.subtitleCues.filter((c) => c.id !== cue.id);
      this.notifyUpdate();
    }, 2500);
  }

  private addDirectionalGlow(angle: number, intensity: number) {
    this.directionalGlows.push({
      id: `glow_${Date.now()}_${Math.random()}`,
      angle,
      intensity,
      timestamp: performance.now(),
      type: 'sound',
    });
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.onStateUpdate?.();
  }

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
    if (this.ws) this.ws.close();
  }
}
