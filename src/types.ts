/**
 * Shadow Shot - Core Types & State Definitions
 * Master Specification v2 (L'ogigi War, Factions, TDM Lives, The Light War, Mini-Map, Light System)
 */

export type FactionType = 'logigi' | 'lotito';

export type GameMode = 'ffa' | 'tdm' | 'br' | 'light_war' | 'spectator' | 'practice' | 'ranked';

export type WeatherType =
  | 'clear'
  | 'wind'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'snow'
  | 'heat'
  | 'cold'
  | 'desert_storm';

export type MapType =
  | 'the_foundry'
  | 'the_grove'
  | 'the_docks'
  | 'the_metro'
  | 'the_asylum'
  | 'the_wastes';

export type SurfaceType = 'gravel' | 'wood' | 'water' | 'grass' | 'metal' | 'sand';

export type ReloadStageName =
  | 'none'
  | 'mag_release'
  | 'mag_out'
  | 'mag_in'
  | 'bolt_pull'
  | 'ready';

export type MovementMode = 'crouch' | 'walk' | 'sprint' | 'still';

export type PulseBand = 'near' | 'mid' | 'far' | 'edge';

export type BlobSize = 'human' | 'non-human';

export interface RadarContact {
  id: string;
  angle: number; // in degrees relative to player yaw (0 = ahead, 90 = right, 180 = behind, 270 = left)
  distance: number; // in meters (0 to 30)
  isHostile: boolean;
  name?: string;
  signalStrength: number; // 0 to 1
  lastDetected: number;
}

export interface PulseBlob {
  id: string;
  angle: number; // in degrees relative to player yaw (0 = front, 90 = right, 180 = behind, 270 = left)
  band: PulseBand; // distance band: near (0-6m), mid (6-14m), far (14-22m), edge (22-30m)
  distance: number; // in meters
  size: BlobSize;
  created: number;
}

export interface LightSource {
  id: string;
  type: 'flare' | 'glow_stick' | 'clown_mask' | 'beacon' | 'muzzle_flash' | 'lightning' | 'let_there_be_light';
  x: number;
  z: number;
  radius: number;
  durationMs: number;
  created: number;
  color: string;
  intensity: number;
  revealsSilhouettes?: boolean;
}

export interface MapObstacle {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface SoundEventPayload {
  id: string;
  sound:
    | 'footstep'
    | 'breath'
    | 'gasp'
    | 'gunshot'
    | 'bullet_whiz'
    | 'reload_stage'
    | 'empty_click'
    | 'pulse_ping'
    | 'pulse_whoomp'
    | 'kill_thunk'
    | 'hit_wound'
    | 'decoy'
    | 'clown_laugh'
    | 'flare_ignite'
    | 'glow_throw'
    | 'beacon_plant'
    | 'beacon_defuse'
    | 'beacon_detonate'
    | 'let_there_be_light'
    | 'light_bomb'
    | 'dark_pulse'
    | 'melee_swing'
    | 'melee_hit'
    | 'ammo_pickup'
    | 'gear_rustle'
    | 'shared_heartbeat'
    | 'team_wipe_hum'
    | 'lightning_thunder'
    | 'spectral_hum';
  x: number;
  z: number;
  volume: number;
  noiseRadius: number;
  surface?: SurfaceType;
  stageName?: ReloadStageName;
  timestamp: number;
  isSelf?: boolean;
}

export interface SubtitleCue {
  id: string;
  text: string;
  direction: string; // "left", "right", "ahead", "behind", "near", "far"
  timestamp: number;
}

export interface DirectionalGlow {
  id: string;
  angle: number; // relative to player yaw
  intensity: number;
  timestamp: number;
  type: 'sound' | 'pulse' | 'threat' | 'light';
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  pulsesUsed: number;
  pulseAccurateKills: number;
  survivalSeconds: number;
  meleeKills: number;
  silentKills: number;
  flaresUsed: number;
  glowSticksUsed: number;
  beaconsPlanted: number;
  beaconsDefused: number;
  instinctRating: number; // percentage
}

export type RankTier =
  | 'Whisper'
  | 'Shade'
  | 'Phantom'
  | 'Wraith'
  | 'Revenant'
  | 'Nightfall'
  | 'Eclipse';

export interface MuzzleConfig {
  level: number;
  name: string;
  rankUnlock: RankTier | 'Prestige';
  trailDuration: number; // seconds
  flashRadius: number; // meters
  trailLight: 'Bright' | 'Medium' | 'Dim' | 'None';
  damagePercent: number; // 75 to 100
  rangePercent: number; // 75 to 100
  humRadius: number; // meters
}

export const MUZZLE_CONFIGS: MuzzleConfig[] = [
  { level: 0, name: 'Bare Muzzle', rankUnlock: 'Whisper', trailDuration: 2.0, flashRadius: 1.5, trailLight: 'Bright', damagePercent: 100, rangePercent: 100, humRadius: 20 },
  { level: 1, name: 'Muzzle Mk. I', rankUnlock: 'Shade', trailDuration: 1.7, flashRadius: 1.3, trailLight: 'Bright', damagePercent: 97, rangePercent: 97, humRadius: 18 },
  { level: 2, name: 'Muzzle Mk. II', rankUnlock: 'Phantom', trailDuration: 1.4, flashRadius: 1.1, trailLight: 'Medium', damagePercent: 94, rangePercent: 94, humRadius: 16 },
  { level: 3, name: 'Muzzle Mk. III', rankUnlock: 'Wraith', trailDuration: 1.1, flashRadius: 0.9, trailLight: 'Medium', damagePercent: 91, rangePercent: 91, humRadius: 14 },
  { level: 4, name: 'Muzzle Mk. IV', rankUnlock: 'Revenant', trailDuration: 0.8, flashRadius: 0.7, trailLight: 'Dim', damagePercent: 88, rangePercent: 88, humRadius: 12 },
  { level: 5, name: 'Muzzle Mk. V', rankUnlock: 'Nightfall', trailDuration: 0.5, flashRadius: 0.5, trailLight: 'Dim', damagePercent: 85, rangePercent: 85, humRadius: 10 },
  { level: 6, name: 'Ghost Muzzle', rankUnlock: 'Eclipse', trailDuration: 0.1, flashRadius: 0.2, trailLight: 'None', damagePercent: 80, rangePercent: 80, humRadius: 5 },
  { level: 7, name: 'Silent Muzzle', rankUnlock: 'Prestige', trailDuration: 0.0, flashRadius: 0.0, trailLight: 'None', damagePercent: 75, rangePercent: 75, humRadius: 0 },
];

export interface PlacedMine {
  id: string;
  ownerId: string;
  ownerFaction: FactionType;
  type: 'claymore' | 'snare';
  x: number;
  z: number;
  isArmed: boolean;
  armedAt: number;
  created: number;
}

export interface AmmoCacheEntity {
  id: string;
  x: number;
  z: number;
  isAvailable: boolean;
  isDiscovered: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  faction: FactionType;
  rank: RankTier;
  title: string;
  kills: number;
  accuracy: number;
  instinctRating: number;
  score: number;
}

export interface AccessibilitySettings {
  monoAudio: boolean;
  visualAudioCues: boolean; // edge glows and subtitles for deaf/hard-of-hearing
  awarenessRing: boolean; // Casual awareness ring (disabled in ranked)
  colorblindPulse: boolean; // Orange instead of cyan
  haptics: boolean; // Phone vibration & gamepad rumble
  volumeMaster: number;
  volumeSfx: number;
  volumeAmbient: number;
  mouseSensitivity: number;
  miniMapHighContrast: boolean;
}

export interface MatchPlayerInfo {
  id: string;
  name: string;
  faction: FactionType;
  isAlive: boolean;
  isSelf: boolean;
  isTeammate: boolean;
  kills: number;
  deaths: number;
  ping: number;
  respawnTimeRemaining?: number;
  x?: number; // only known if teammate, pulsed, or revealed
  z?: number;
}

export interface KillstreakStatus {
  currentKills: number;
  unlockedTracker: boolean; // 2 kills
  unlockedActiveScan: boolean; // 3 kills
  unlockedMine: boolean; // 4 kills (Claymore or Snare)
  unlockedUltimate: boolean; // 7 kills (Light Bomb or Dark Pulse)
  carriedMine: boolean; // has 1 Claymore/Snare ready to plant
  trackerActiveTimeRemaining: number; // in seconds (max 16s in TDM)
  activeScanTimeRemaining: number;
}

export interface ClientGameState {
  matchId: string;
  mode: GameMode;
  phase: 'lobby' | 'deploy' | 'hunt' | 'collapse' | 'finale' | 'post';
  phaseTimeRemaining: number;
  weather: WeatherType;
  weatherMasking: number;
  map: MapType;
  aliveCount: number;
  totalPlayers: number;
  zoneRadius: number;
  zoneCenter: { x: number; z: number };

  // Faction, Rank & Lore
  faction: FactionType;
  rank: RankTier;
  players: MatchPlayerInfo[];

  // Muzzle System
  equippedMuzzleLevel: number; // 0 to 7
  unlockedMuzzleLevel: number; // highest level unlocked by rank & faction

  // TDM Lives System
  tdmLivesLogigi: number; // e.g. 60
  tdmLivesLotito: number; // e.g. 60
  tdmTeamWipeCountdown: number | null; // 20s countdown if team wiped
  tdmWipedTeam: FactionType | null;

  // The Light War (Best of 7)
  lightWarRound: number;
  lightWarScoreLogigi: number;
  lightWarScoreLotito: number;
  beaconStatus: 'carried' | 'planted' | 'defused' | 'detonated' | 'none';
  beaconSite: 'A' | 'B' | null;
  beaconTimerRemaining: number | null; // 45s after plant
  isBlindedByLight: boolean; // 5s "LET THERE BE LIGHT" detonation / bomb
  blindnessRemaining: number; // seconds
  canShootDuringBlindness: boolean;
  seeSilhouettesRemaining: number; // 3s silhouette window

  // Local player state
  health: number;
  maxHealth: number;
  ammoMag: number;
  ammoReserve: number;
  maxMag: number;
  isGhostMode: boolean;
  stamina: number;
  maxStamina: number;
  isHoldingBreath: boolean;
  isCrouching: boolean;
  movementMode: MovementMode;
  isAimingSteady: boolean;

  // Inventory / Light resources
  flaresAvailable: number;
  glowSticksAvailable: number;
  hasClownMaskDecoy: boolean;
  activeLightSources: LightSource[];

  // Faction Abilities
  veilActive: boolean; // L'otito Veil ability
  veilCooldownRemaining: number; // 60s
  illuminateCooldownRemaining: number; // L'ogigi

  // Pulse state & Submarine Radar
  pulseCooldownRemaining: number;
  maxPulseCooldown: number;
  pulseCharges: number;
  maxPulseCharges: number;
  activePulseRingRadius: number | null; // 0 to 25/30m
  activeBlobs: PulseBlob[];
  radarContacts: RadarContact[];
  targetInSights: boolean;

  // Reload state
  reloadingStage: ReloadStageName;
  reloadProgress: number;

  // Decoys, Killstreaks, Mines
  decoysAvailable: number;
  maxDecoys: number;
  killstreak: KillstreakStatus;
  placedMines: PlacedMine[];
  trackerEnemies: { id: string; x: number; z: number }[];

  // Cache scavenge interaction
  scavengingCacheId: string | null;
  scavengeProgress: number; // 0 to 1
  nearbyCacheToOpen: { id: string; x: number; z: number; dist: number } | null;

  // Proximity alerts
  warmVignette: boolean; // <= 1.5m
  sharedHeartbeat: boolean; // <= 10m & still
  nearCampingGhost: boolean;

  // Combat feedback
  lastHitTime: number;
  lastDamageTime: number;
  lastLightningTime: number;
  lightningSilhouettes: { angle: number; distance: number }[];

  // Mini-map & Exploration
  exploredTiles: { x: number; z: number }[];
  knownAmmoCaches: { x: number; z: number }[];
  supplyDrops: { x: number; z: number }[];
  audioEventPings: { angle: number; isGunshot: boolean; created: number }[];
}
