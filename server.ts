/**
 * Shadow Shot - Server-Authoritative Netcode for Darkness
 * Express + WebSockets on port 3000
 * Master Implementation: L'ogigi War, Factions, TDM 60-Lives System, The Light War, Beacon, Light System, Player Roster
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  WeatherType,
  MapType,
  SurfaceType,
  ReloadStageName,
  MovementMode,
  PulseBlob,
  PulseBand,
  BlobSize,
  FactionType,
  GameMode,
  MatchPlayerInfo,
  LightSource,
  RankTier,
  MUZZLE_CONFIGS,
  PlacedMine,
  AmmoCacheEntity,
} from './src/types';
import {
  getSupabase,
  fetchPlayerProfile,
  recordMatchOutcome,
  SUPABASE_SQL_SETUP,
} from './server/supabase';

interface ServerPlayer {
  id: string;
  name: string;
  faction: FactionType;
  ws?: WebSocket;
  isBot: boolean;
  x: number;
  z: number;
  yaw: number; // in radians
  health: number;
  maxHealth: number;
  ammoMag: number;
  ammoReserve: number;
  isGhostMode: boolean;
  stamina: number;
  maxStamina: number;
  movementMode: MovementMode;
  isHoldingBreath: boolean;
  isCrouching: boolean;
  isAimingSteady: boolean;

  // Reload
  reloadingStage: ReloadStageName;
  reloadStageTimer: number;

  // Timers & Light resources
  lastShotTime: number;
  lastMoveTime: number;
  stillDuration: number;
  pulseCharges: number;
  pulseCooldownTimer: number;
  decoys: number;
  flares: number;
  glowSticks: number;
  veilActive: boolean;
  veilTimer: number;

  // Muzzle Progression System
  playerRank: RankTier;
  equippedMuzzleLevel: number;
  unlockedMuzzleLevel: number;

  // Killstreak System (per-life, resets on death)
  killstreakKills: number;
  personalTrackerTimer: number;
  hasActiveScan: boolean;
  carriedMines: number;
  hasUltimate: boolean;

  // Interactions (Cache scavenge & Mine plant)
  scavengingCacheId: string | null;
  scavengeTimer: number;
  isPlantingMine: boolean;
  plantMineTimer: number;

  // Stats & Respawns
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  pulsesUsed: number;
  instinctKills: number;
  lastPulsedTime: number;
  alive: boolean;
  respawnTimer: number; // For TDM (5s)

  // Bot AI state
  botTargetAngle?: number;
  botState?: 'patrol' | 'stalk' | 'hold' | 'charge';
  botNextActionTime?: number;
}

interface ServerAmmoCache {
  id: string;
  x: number;
  z: number;
  available: boolean;
  respawnTimer: number;
  discoveredBy: Set<string>;
}

interface ServerPlacedMine {
  id: string;
  ownerId: string;
  ownerFaction: FactionType;
  type: 'claymore' | 'snare';
  x: number;
  z: number;
  isArmed: boolean;
  armedAt: number;
  lastBeepTime: number;
  created: number;
}

interface GameRoom {
  id: string;
  mode: GameMode;
  phase: 'lobby' | 'deploy' | 'hunt' | 'collapse' | 'finale' | 'post';
  phaseTimer: number;
  weather: WeatherType;
  weatherTimer: number;
  weatherMasking: number;
  map: MapType;
  zoneRadius: number;
  zoneCenter: { x: number; z: number };
  players: Map<string, ServerPlayer>;
  nextDecoyId: number;
  decoys: { id: string; x: number; z: number; expireTime: number }[];
  ammoCaches: ServerAmmoCache[];
  mines: ServerPlacedMine[];
  lastTickTime: number;

  // TDM 60-Lives System (Prompt 12)
  tdmLivesLogigi: number;
  tdmLivesLotito: number;
  tdmTeamWipeCountdown: number | null; // 20s team wipe countdown
  tdmWipedTeam: FactionType | null;

  // TDM Shared Tracker (Prompt 14: 8s, max 16s stack)
  trackerTimerLogigi: number;
  trackerTimerLotito: number;
  lastTrackerBroadcastTime: number;

  // The Light War (Prompt 13)
  lightWarRound: number;
  lightWarScoreLogigi: number;
  lightWarScoreLotito: number;
  beaconStatus: 'carried' | 'planted' | 'defused' | 'detonated' | 'none';
  beaconSite: 'A' | 'B' | null;
  beaconTimer: number | null; // 45s countdown
  isBlindedByLight: boolean;
  blindnessTimer: number;

  // Light Sources
  lightSources: LightSource[];
}

const rooms = new Map<string, GameRoom>();

const RANK_INDEX_MAP: Record<RankTier, number> = {
  Whisper: 0,
  Shade: 1,
  Phantom: 2,
  Wraith: 3,
  Revenant: 4,
  Nightfall: 5,
  Eclipse: 6,
};

function computeUnlockedMuzzleLevel(
  rank: RankTier,
  faction: FactionType,
  isRanked: boolean
): { maxUnlocked: number; defaultEquipped: number } {
  const rankIdx = RANK_INDEX_MAP[rank] !== undefined ? RANK_INDEX_MAP[rank] : 0;
  let maxUnlocked = 0;

  // Faction differences:
  // L'ogigi: Muzzle unlocks later (starts at Phantom, level 2)
  // L'otito: Muzzle unlocks earlier (starts at Shade, level 1)
  if (faction === 'logigi') {
    if (rankIdx >= 2) maxUnlocked = rankIdx;
    else maxUnlocked = 0;
  } else {
    if (rankIdx >= 1) maxUnlocked = rankIdx;
    else maxUnlocked = 0;
  }

  // Ranked rules:
  // Muzzles are disabled below Phantom in ranked.
  // Ghost Muzzle and Silent Muzzle are disabled below Eclipse in ranked.
  if (isRanked) {
    if (rankIdx < 2) {
      maxUnlocked = 0;
    } else if (rankIdx < 6 && maxUnlocked > 5) {
      maxUnlocked = 5;
    }
  }

  return { maxUnlocked, defaultEquipped: maxUnlocked };
}

function generateDiverseAmmoCaches(): ServerAmmoCache[] {
  return [
    { id: 'cache_north', x: -2 + (Math.random() - 0.5) * 4, z: -18 + (Math.random() - 0.5) * 4, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_south', x: 2 + (Math.random() - 0.5) * 4, z: 18 + (Math.random() - 0.5) * 4, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_west_corridor', x: -20 + (Math.random() - 0.5) * 4, z: -2 + (Math.random() - 0.5) * 6, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_east_corridor', x: 20 + (Math.random() - 0.5) * 4, z: 2 + (Math.random() - 0.5) * 6, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_center_crossing', x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_nw_bunker', x: -14 + (Math.random() - 0.5) * 4, z: -14 + (Math.random() - 0.5) * 4, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_se_bunker', x: 14 + (Math.random() - 0.5) * 4, z: 14 + (Math.random() - 0.5) * 4, available: true, respawnTimer: 0, discoveredBy: new Set() },
    { id: 'cache_choke_point', x: -6 + (Math.random() - 0.5) * 6, z: 8 + (Math.random() - 0.5) * 4, available: true, respawnTimer: 0, discoveredBy: new Set() },
  ];
}

function getOrCreateRoom(roomId: string, mode: GameMode = 'tdm'): GameRoom {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      mode,
      phase: 'hunt',
      phaseTimer: 600,
      weather: 'clear',
      weatherTimer: 90,
      weatherMasking: 0,
      map: 'the_grove',
      zoneRadius: 30,
      zoneCenter: { x: 0, z: 0 },
      players: new Map(),
      nextDecoyId: 1,
      decoys: [],
      ammoCaches: generateDiverseAmmoCaches(),
      mines: [],
      lastTickTime: Date.now(),

      // TDM 60 Lives
      tdmLivesLogigi: 60,
      tdmLivesLotito: 60,
      tdmTeamWipeCountdown: null,
      tdmWipedTeam: null,

      // TDM Tracker
      trackerTimerLogigi: 0,
      trackerTimerLotito: 0,
      lastTrackerBroadcastTime: 0,

      // The Light War
      lightWarRound: 1,
      lightWarScoreLogigi: 0,
      lightWarScoreLotito: 0,
      beaconStatus: mode === 'light_war' ? 'carried' : 'none',
      beaconSite: null,
      beaconTimer: null,
      isBlindedByLight: false,
      blindnessTimer: 0,

      lightSources: [],
    };
    rooms.set(roomId, room);
  }
  return room;
}

// Spawn initial bot opponents balanced across L'ogigi and L'otito factions
function populateBots(room: GameRoom, targetCount: number = 6) {
  const currentCount = room.players.size;
  const needed = targetCount - currentCount;
  const botNames = ['Wraith-9', 'Phantom-04', 'Specter-X', 'Echo-Zero', 'Shade-K', 'Raven-7'];

  for (let i = 0; i < needed; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 14;
    const botId = `bot_${Date.now()}_${i}`;
    const faction: FactionType = i % 2 === 0 ? 'logigi' : 'lotito';

    const bot: ServerPlayer = {
      id: botId,
      name: botNames[i % botNames.length],
      faction,
      isBot: true,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      yaw: Math.random() * Math.PI * 2,
      health: 100,
      maxHealth: 100,
      ammoMag: 3,
      ammoReserve: 5,
      isGhostMode: false,
      stamina: 100,
      maxStamina: 100,
      movementMode: 'walk',
      isHoldingBreath: false,
      isCrouching: false,
      isAimingSteady: false,
      reloadingStage: 'none',
      reloadStageTimer: 0,
      lastShotTime: 0,
      lastMoveTime: Date.now(),
      stillDuration: 0,
      pulseCharges: 1,
      pulseCooldownTimer: 0,
      decoys: 2,
      flares: faction === 'logigi' ? 2 : 0,
      glowSticks: faction === 'lotito' ? 2 : 1,
      veilActive: false,
      veilTimer: 0,
      kills: 0,
      deaths: 0,
      shotsFired: 0,
      shotsHit: 0,
      pulsesUsed: 0,
      instinctKills: 0,
      lastPulsedTime: 0,
      alive: true,
      respawnTimer: 0,
      playerRank: 'Phantom',
      equippedMuzzleLevel: faction === 'logigi' ? 2 : 1,
      unlockedMuzzleLevel: faction === 'logigi' ? 2 : 1,
      killstreakKills: 0,
      personalTrackerTimer: 0,
      hasActiveScan: false,
      carriedMines: 0,
      hasUltimate: false,
      scavengingCacheId: null,
      scavengeTimer: 0,
      isPlantingMine: false,
      plantMineTimer: 0,
      botState: 'patrol',
      botNextActionTime: Date.now() + 1000 + Math.random() * 2000,
    };
    room.players.set(botId, bot);
  }
}

// Netcode for darkness: broadcast audio events only to players within audible range
function broadcastAudioEvent(
  room: GameRoom,
  event: {
    sound: string;
    x: number;
    z: number;
    volume: number;
    noiseRadius: number;
    surface?: SurfaceType;
    stageName?: ReloadStageName;
    sourcePlayerId?: string;
  }
) {
  // Apply weather masking
  const effectiveRadius = event.noiseRadius * (1 - room.weatherMasking * 0.8);

  for (const player of room.players.values()) {
    if (player.isBot || !player.ws || player.ws.readyState !== WebSocket.OPEN) continue;
    const dx = player.x - event.x;
    const dz = player.z - event.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const isSelf = player.id === event.sourcePlayerId;
    if (isSelf || dist <= effectiveRadius) {
      player.ws.send(
        JSON.stringify({
          type: 'audio_event',
          id: `snd_${Date.now()}_${Math.random()}`,
          sound: event.sound,
          x: event.x,
          z: event.z,
          dist: Math.round(dist * 10) / 10,
          volume: event.volume,
          noiseRadius: effectiveRadius,
          surface: event.surface,
          stageName: event.stageName,
          isSelf,
          timestamp: Date.now(),
        })
      );
    }
  }
}

// Tick loop for bot AI, zone, weather, TDM lives, Light War
function updateRoom(room: GameRoom, deltaSec: number) {
  const now = Date.now();

  // 1. Weather cycle
  room.weatherTimer -= deltaSec;
  if (room.weatherTimer <= 0) {
    const weathers: WeatherType[] = [
      'clear',
      'wind',
      'rain',
      'storm',
      'fog',
      'snow',
      'heat',
      'cold',
      'desert_storm',
    ];
    const nextWeather = weathers[Math.floor(Math.random() * weathers.length)];
    room.weather = nextWeather;
    room.weatherTimer = 75 + Math.random() * 45;

    let masking = 0;
    if (nextWeather === 'wind') masking = 0.5;
    else if (nextWeather === 'rain') masking = 0.7;
    else if (nextWeather === 'storm') masking = 0.9;
    else if (nextWeather === 'fog') masking = 0.3;
    else if (nextWeather === 'snow') masking = -0.3; // amplifies steps
    else if (nextWeather === 'desert_storm') masking = 0.8;
    room.weatherMasking = masking;

    // Broadcast weather change
    for (const p of room.players.values()) {
      if (!p.isBot && p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(
          JSON.stringify({
            type: 'weather_change',
            weather: room.weather,
            masking: room.weatherMasking,
          })
        );
      }
    }
  }

  // 2. Storm Lightning Flash
  if (room.weather === 'storm' && Math.random() < 0.015) {
    broadcastAudioEvent(room, {
      sound: 'lightning_thunder',
      x: 0,
      z: 0,
      volume: 1.0,
      noiseRadius: 200,
    });

    for (const p of room.players.values()) {
      if (!p.isBot && p.ws && p.ws.readyState === WebSocket.OPEN) {
        const silhouettes: { angle: number; distance: number }[] = [];
        for (const other of room.players.values()) {
          if (other.id === p.id || !other.alive) continue;
          const dx = other.x - p.x;
          const dz = other.z - p.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= 40) {
            const rawAngle = (Math.atan2(dx, -dz) - p.yaw) * (180 / Math.PI);
            silhouettes.push({
              angle: (rawAngle + 360) % 360,
              distance: Math.round(dist),
            });
          }
        }
        p.ws.send(
          JSON.stringify({
            type: 'lightning_flash',
            silhouettes,
          })
        );
      }
    }
  }

  // 3. TDM Mode Management (60 Lives & 20s Team Wipe Countdown)
  if (room.mode === 'tdm') {
    // Check living counts for each faction
    let livingLogigi = 0;
    let livingLotito = 0;

    for (const p of room.players.values()) {
      if (p.alive) {
        if (p.faction === 'logigi') livingLogigi++;
        else if (p.faction === 'lotito') livingLotito++;
      } else if (p.respawnTimer > 0) {
        // Countdown 5s respawn
        p.respawnTimer -= deltaSec;
        if (p.respawnTimer <= 0) {
          p.respawnTimer = 0;
          p.alive = true;
          p.health = 100;
          p.ammoMag = 3;
          p.ammoReserve = 5;
          p.isGhostMode = false;
          // Spawn in safe zone
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 12 + Math.random() * 10;
          p.x = Math.cos(angle) * spawnDist;
          p.z = Math.sin(angle) * spawnDist;
        }
      }
    }

    // Check team wipe countdown
    if (livingLogigi === 0 && room.tdmLivesLogigi > 0) {
      if (room.tdmTeamWipeCountdown === null) {
        room.tdmTeamWipeCountdown = 20.0;
        room.tdmWipedTeam = 'logigi';
        broadcastAudioEvent(room, {
          sound: 'team_wipe_hum',
          x: 0,
          z: 0,
          volume: 0.8,
          noiseRadius: 200,
        });
      } else {
        room.tdmTeamWipeCountdown -= deltaSec;
        if (room.tdmTeamWipeCountdown <= 0) {
          room.tdmLivesLogigi = 0; // Wipeout defeat
          room.tdmTeamWipeCountdown = null;
        }
      }
    } else if (livingLotito === 0 && room.tdmLivesLotito > 0) {
      if (room.tdmTeamWipeCountdown === null) {
        room.tdmTeamWipeCountdown = 20.0;
        room.tdmWipedTeam = 'lotito';
        broadcastAudioEvent(room, {
          sound: 'team_wipe_hum',
          x: 0,
          z: 0,
          volume: 0.8,
          noiseRadius: 200,
        });
      } else {
        room.tdmTeamWipeCountdown -= deltaSec;
        if (room.tdmTeamWipeCountdown <= 0) {
          room.tdmLivesLotito = 0; // Wipeout defeat
          room.tdmTeamWipeCountdown = null;
        }
      }
    } else {
      room.tdmTeamWipeCountdown = null;
      room.tdmWipedTeam = null;
    }
  }

  // 4. The Light War Mode Management (Beacon Plant & Detonation)
  if (room.mode === 'light_war') {
    if (room.beaconStatus === 'planted' && room.beaconTimer !== null) {
      room.beaconTimer -= deltaSec;
      if (room.beaconTimer <= 0) {
        // DETONATION: "LET THERE BE LIGHT"
        room.beaconStatus = 'detonated';
        room.beaconTimer = null;
        room.lightWarScoreLogigi += 1;
        room.isBlindedByLight = true;
        room.blindnessTimer = 5.0;

        broadcastAudioEvent(room, {
          sound: 'let_there_be_light',
          x: 0,
          z: 0,
          volume: 1.0,
          noiseRadius: 300,
        });
      }
    }

    if (room.isBlindedByLight) {
      room.blindnessTimer -= deltaSec;
      if (room.blindnessTimer <= 0) {
        room.isBlindedByLight = false;
        // Next round
        if (room.lightWarRound < 7) {
          room.lightWarRound += 1;
          room.beaconStatus = 'carried';
          room.beaconSite = null;
        }
      }
    }
  }

  // 5. Expire Light Sources
  room.lightSources = room.lightSources.filter((ls) => {
    return now - ls.created < ls.durationMs;
  });

  // 6. Bot AI Updates
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive) continue;

    if (now > (bot.botNextActionTime || 0)) {
      bot.botNextActionTime = now + 1500 + Math.random() * 2500;
      const roll = Math.random();

      // Check for nearby enemies within 20m to engage with sniper rifle
      let closestEnemy: ServerPlayer | null = null;
      let closestDist = 20;

      for (const target of room.players.values()) {
        if (target.id === bot.id || !target.alive) continue;
        if ((room.mode === 'tdm' || room.mode === 'light_war') && target.faction === bot.faction) continue;
        const d = Math.hypot(target.x - bot.x, target.z - bot.z);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = target;
        }
      }

      if (closestEnemy && Math.random() < 0.45 && now - (bot.lastShotTime || 0) > 2800) {
        // Bot aims towards enemy and takes a sniper shot!
        const dx = closestEnemy.x - bot.x;
        const dz = closestEnemy.z - bot.z;
        const aimError = (Math.random() - 0.5) * 0.18;
        bot.yaw = Math.atan2(dx, -dz) + aimError;
        bot.lastShotTime = now;
        bot.botNextActionTime = now + 2200 + Math.random() * 2000;

        broadcastAudioEvent(room, {
          sound: 'gunshot',
          x: bot.x,
          z: bot.z,
          volume: 1.0,
          noiseRadius: 75,
          sourcePlayerId: bot.id,
        });

        // Test if bot shot hits
        const angleDiff = Math.abs(normalizeAngle(bot.yaw - Math.atan2(dx, -dz)));
        if (angleDiff < 0.18) {
          closestEnemy.health -= 100;
          if (closestEnemy.health <= 0) {
            closestEnemy.alive = false;
            closestEnemy.deaths++;
            bot.kills++;

            if (room.mode === 'tdm') {
              if (closestEnemy.faction === 'logigi') {
                room.tdmLivesLogigi = Math.max(0, room.tdmLivesLogigi - 1);
              } else {
                room.tdmLivesLotito = Math.max(0, room.tdmLivesLotito - 1);
              }
              closestEnemy.respawnTimer = 5.0;
            }

            if (closestEnemy.ws && closestEnemy.ws.readyState === WebSocket.OPEN) {
              closestEnemy.ws.send(
                JSON.stringify({
                  type: 'killed',
                  killerName: bot.name,
                })
              );
            }
          }
        }
      } else if (roll < 0.35) {
        // Bot walks
        bot.botTargetAngle = Math.random() * Math.PI * 2;
        bot.yaw = bot.botTargetAngle;
        const stepDist = 3 + Math.random() * 4;
        bot.x += Math.cos(bot.yaw) * stepDist;
        bot.z += Math.sin(bot.yaw) * stepDist;
        bot.movementMode = 'walk';
        broadcastAudioEvent(room, {
          sound: 'footstep',
          x: bot.x,
          z: bot.z,
          volume: 0.3,
          noiseRadius: bot.faction === 'logigi' ? 10 : 6,
          surface: 'wood',
          sourcePlayerId: bot.id,
        });
      } else if (roll < 0.55) {
        // Bot pulses
        broadcastAudioEvent(room, {
          sound: 'pulse_ping',
          x: bot.x,
          z: bot.z,
          volume: 0.6,
          noiseRadius: 35,
          sourcePlayerId: bot.id,
        });
      } else if (roll < 0.7) {
        // Bot throws flare or glow stick
        if (bot.faction === 'logigi' && bot.flares > 0) {
          bot.flares--;
          room.lightSources.push({
            id: `ls_${Date.now()}`,
            type: 'flare',
            x: bot.x,
            z: bot.z,
            radius: 15,
            durationMs: 10000,
            created: Date.now(),
            color: '#f59e0b',
            intensity: 0.9,
          });
          broadcastAudioEvent(room, {
            sound: 'flare_ignite',
            x: bot.x,
            z: bot.z,
            volume: 0.5,
            noiseRadius: 20,
          });
        }
      }
    }
  }

  // 6b. Dynamic Ammo Cache Discovery & Scavenge Tick
  for (const cache of room.ammoCaches) {
    if (!cache.available && cache.respawnTimer > 0) {
      cache.respawnTimer -= deltaSec;
      if (cache.respawnTimer <= 0) {
        cache.available = true;
      }
    }

    // Proximity discovery: walk within 8m
    for (const player of room.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - cache.x, player.z - cache.z);
      if (dist <= 8) {
        const teamKey = `team_${player.faction}`;
        const alreadyDiscovered =
          cache.discoveredBy.has(player.id) ||
          (room.mode === 'tdm' && cache.discoveredBy.has(teamKey));

        if (!alreadyDiscovered) {
          cache.discoveredBy.add(player.id);
          if (room.mode === 'tdm') cache.discoveredBy.add(teamKey);

          if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(
              JSON.stringify({
                type: 'cache_discovered',
                cacheId: cache.id,
                x: cache.x,
                z: cache.z,
              })
            );
          }
        }
      }
    }
  }

  // Scavenging Progress
  for (const player of room.players.values()) {
    if (!player.alive) {
      player.scavengingCacheId = null;
      player.scavengeTimer = 0;
      player.isPlantingMine = false;
      continue;
    }

    if (player.scavengingCacheId) {
      const cache = room.ammoCaches.find((c) => c.id === player.scavengingCacheId);
      if (cache && cache.available && Math.hypot(player.x - cache.x, player.z - cache.z) <= 3.0) {
        const prevTimer = player.scavengeTimer;
        player.scavengeTimer += deltaSec;

        // Periodic metallic clatter and rummaging sound every 0.35s while actively scavenging
        if (Math.floor(player.scavengeTimer / 0.35) > Math.floor(prevTimer / 0.35)) {
          broadcastAudioEvent(room, {
            sound: 'cache_rummaging',
            x: cache.x,
            z: cache.z,
            volume: 0.65,
            noiseRadius: 9, // Acoustic footprint: nearby enemies hear the ammo crate rummaging!
            sourcePlayerId: player.id,
          });
        }

        if (player.scavengeTimer >= 1.5) {
          // Scavenge completed!
          cache.available = false;
          cache.respawnTimer = 45;
          player.ammoReserve = Math.min(10, player.ammoReserve + 2);
          player.isGhostMode = false;
          player.scavengingCacheId = null;
          player.scavengeTimer = 0;

          broadcastAudioEvent(room, {
            sound: 'cache_scavenged',
            x: cache.x,
            z: cache.z,
            volume: 0.85,
            noiseRadius: 14, // Heavy metallic latch snaps shut
            sourcePlayerId: player.id,
          });

          if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({ type: 'cache_scavenged_success' }));
          }
        }
      } else {
        player.scavengingCacheId = null;
        player.scavengeTimer = 0;
      }
    }

    // Mine planting progress (1.5s)
    if (player.isPlantingMine) {
      player.plantMineTimer -= deltaSec;
      if (player.plantMineTimer <= 0) {
        player.isPlantingMine = false;
        player.carriedMines = Math.max(0, player.carriedMines - 1);
        const isLogigi = player.faction === 'logigi';
        room.mines.push({
          id: `mine_${Date.now()}_${player.id}`,
          ownerId: player.id,
          ownerFaction: player.faction,
          type: isLogigi ? 'claymore' : 'snare',
          x: player.x,
          z: player.z,
          isArmed: false,
          armedAt: Date.now() + 3000, // 3s arming
          lastBeepTime: Date.now(),
          created: Date.now(),
        });

        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: 'mine_planted' }));
        }
      }
    }

    // Personal tracker timer
    if (player.personalTrackerTimer > 0) {
      player.personalTrackerTimer = Math.max(0, player.personalTrackerTimer - deltaSec);
    }
  }

  // 6c. Placed Mines: Arming, Beeps & Proximity Detonation
  const detonatedMineIds = new Set<string>();
  for (const mine of room.mines) {
    if (!mine.isArmed && now >= mine.armedAt) {
      mine.isArmed = true;
    }

    // Periodic sharp beep (Claymore: 2s) or soft pulse (Snare: 3s)
    const beepInterval = mine.type === 'claymore' ? 2000 : 3000;
    if (mine.isArmed && now - mine.lastBeepTime >= beepInterval) {
      mine.lastBeepTime = now;
      broadcastAudioEvent(room, {
        sound: 'claymore_beep',
        x: mine.x,
        z: mine.z,
        volume: 0.35,
        noiseRadius: mine.type === 'claymore' ? 15 : 12,
      });
    }

    // Proximity trigger (3m)
    if (mine.isArmed) {
      for (const target of room.players.values()) {
        if (!target.alive) continue;
        if ((room.mode === 'tdm' || room.mode === 'light_war') && target.faction === mine.ownerFaction) {
          continue;
        }

        const dist = Math.hypot(target.x - mine.x, target.z - mine.z);
        if (dist <= 3.0) {
          detonatedMineIds.add(mine.id);
          broadcastAudioEvent(room, {
            sound: 'mine_detonation',
            x: mine.x,
            z: mine.z,
            volume: 1.0,
            noiseRadius: 60,
          });

          // Kill radius: 2m (100 dmg), wound radius: 3-4m (50 dmg)
          const damage = dist <= 2.0 ? 100 : 50;
          target.health = Math.max(0, target.health - damage);
          if (target.health <= 0) {
            target.alive = false;
            target.deaths++;
            target.killstreakKills = 0;
            target.hasActiveScan = false;
            target.carriedMines = 0;
            target.hasUltimate = false;

            const owner = room.players.get(mine.ownerId);
            if (owner) {
              owner.kills++;
              owner.killstreakKills++;
            }

            if (room.mode === 'tdm') {
              if (target.faction === 'logigi') {
                room.tdmLivesLogigi = Math.max(0, room.tdmLivesLogigi - 1);
              } else {
                room.tdmLivesLotito = Math.max(0, room.tdmLivesLotito - 1);
              }
              target.respawnTimer = 5.0;
            }

            if (target.ws && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(
                JSON.stringify({
                  type: 'killed',
                  killerName: mine.type === 'claymore' ? 'L\'ogigi Claymore' : 'L\'otito Snare',
                })
              );
            }
          }
          break;
        }
      }
    }
  }
  if (detonatedMineIds.size > 0) {
    room.mines = room.mines.filter((m) => !detonatedMineIds.has(m.id));
  }

  // 6d. TDM Shared Tracker Tick
  if (room.trackerTimerLogigi > 0) {
    room.trackerTimerLogigi = Math.max(0, room.trackerTimerLogigi - deltaSec);
  }
  if (room.trackerTimerLotito > 0) {
    room.trackerTimerLotito = Math.max(0, room.trackerTimerLotito - deltaSec);
  }

  // 7. Sync all living clients
  const livingTotal = Array.from(room.players.values()).filter((p) => p.alive).length;

  // Build complete player roster for Tab Scoreboard
  const roster: MatchPlayerInfo[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    faction: p.faction,
    isAlive: p.alive,
    isSelf: false, // overridden per recipient
    isTeammate: false,
    kills: p.kills,
    deaths: p.deaths,
    ping: Math.round(20 + Math.random() * 15),
    respawnTimeRemaining: p.respawnTimer > 0 ? p.respawnTimer : undefined,
    x: p.x,
    z: p.z,
  }));

  for (const player of room.players.values()) {
    if (player.isBot || !player.ws || player.ws.readyState !== WebSocket.OPEN) continue;

    // Check shared heartbeat (enemy within 10m and both still)
    let sharedHeartbeat = false;
    let warmVignette = false;

    for (const other of room.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      const dist = Math.hypot(player.x - other.x, player.z - other.z);
      if (dist <= 1.5) warmVignette = true;
      if (dist <= 10 && player.movementMode === 'still' && other.movementMode === 'still') {
        sharedHeartbeat = true;
      }
    }

    // Decorate roster for this specific player
    const playerRoster = roster.map((r) => ({
      ...r,
      isSelf: r.id === player.id,
      isTeammate: r.faction === player.faction,
      x: r.id === player.id || r.faction === player.faction ? r.x : undefined,
      z: r.id === player.id || r.faction === player.faction ? r.z : undefined,
    }));

    // Discovered caches for this player or their team (in TDM)
    const teamKey = `team_${player.faction}`;
    const knownCaches = room.ammoCaches
      .filter((c) => c.discoveredBy.has(player.id) || (room.mode === 'tdm' && c.discoveredBy.has(teamKey)))
      .map((c) => ({ id: c.id, x: c.x, z: c.z, available: c.available }));

    // Find nearby cache to open (dist <= 2.5m)
    let nearbyCacheToOpen: { id: string; x: number; z: number } | null = null;
    for (const c of room.ammoCaches) {
      if (c.available && Math.hypot(player.x - c.x, player.z - c.z) <= 2.5) {
        nearbyCacheToOpen = { id: c.id, x: c.x, z: c.z };
        break;
      }
    }

    // Tracker status & enemy blips
    const isTeamTrackerActive =
      room.mode === 'tdm' &&
      (player.faction === 'logigi' ? room.trackerTimerLogigi > 0 : room.trackerTimerLotito > 0);
    const isPersonalTrackerActive = player.personalTrackerTimer > 0;
    const trackerActive = isTeamTrackerActive || isPersonalTrackerActive;
    const trackerRemaining = isTeamTrackerActive
      ? (player.faction === 'logigi' ? room.trackerTimerLogigi : room.trackerTimerLotito)
      : player.personalTrackerTimer;

    const trackerEnemies: { x: number; z: number }[] = [];
    if (trackerActive) {
      // Find enemy positions within 15m of teammates (or self in solo)
      for (const enemy of room.players.values()) {
        if (!enemy.alive || enemy.id === player.id) continue;
        if ((room.mode === 'tdm' || room.mode === 'light_war') && enemy.faction === player.faction) continue;

        let withinRadius = false;
        if (room.mode === 'tdm') {
          for (const tm of room.players.values()) {
            if (tm.alive && tm.faction === player.faction) {
              if (Math.hypot(enemy.x - tm.x, enemy.z - tm.z) <= 15) {
                withinRadius = true;
                break;
              }
            }
          }
        } else {
          withinRadius = Math.hypot(enemy.x - player.x, enemy.z - player.z) <= 15;
        }

        if (withinRadius) {
          trackerEnemies.push({ x: enemy.x, z: enemy.z });
        }
      }
    }

    // Placed Mines visible to player (own, teammates, or enemies within 5m glint)
    const visibleMines = room.mines
      .filter((m) => {
        if (m.ownerId === player.id || (room.mode === 'tdm' && m.ownerFaction === player.faction)) return true;
        return Math.hypot(player.x - m.x, player.z - m.z) <= 5.0;
      })
      .map((m) => ({
        id: m.id,
        x: m.x,
        z: m.z,
        type: m.type,
        isArmed: m.isArmed,
        isFriendly: m.ownerFaction === player.faction,
      }));

    player.ws.send(
      JSON.stringify({
        type: 'player_sync',
        health: player.health,
        stamina: player.stamina,
        ammoMag: player.ammoMag,
        ammoReserve: player.ammoReserve,
        isGhostMode: player.isGhostMode,
        pulseCooldown: player.pulseCooldownTimer,
        aliveCount: livingTotal,
        zoneRadius: room.zoneRadius,
        warmVignette,
        sharedHeartbeat,
        alive: player.alive,
        players: playerRoster,

        // Muzzle Progression
        equippedMuzzleLevel: player.equippedMuzzleLevel,
        unlockedMuzzleLevel: player.unlockedMuzzleLevel,

        // Killstreak System
        killstreak: {
          currentKills: player.killstreakKills,
          unlockedTracker: player.killstreakKills >= 2,
          trackerActive,
          trackerRemaining,
          unlockedActiveScan: player.hasActiveScan,
          carriedMines: player.carriedMines,
          unlockedUltimate: player.hasUltimate,
        },
        trackerEnemies,

        // Ammo Cache Discovery
        knownAmmoCaches: knownCaches,
        nearbyCacheToOpen,
        isScavenging: player.scavengingCacheId !== null,
        scavengeProgress: player.scavengeTimer / 1.5,
        isPlantingMine: player.isPlantingMine,
        placedMines: visibleMines,

        // TDM
        tdmLivesLogigi: room.tdmLivesLogigi,
        tdmLivesLotito: room.tdmLivesLotito,
        tdmTeamWipeCountdown: room.tdmTeamWipeCountdown,
        tdmWipedTeam: room.tdmWipedTeam,

        // Light War
        lightWarRound: room.lightWarRound,
        lightWarScoreLogigi: room.lightWarScoreLogigi,
        lightWarScoreLotito: room.lightWarScoreLotito,
        beaconStatus: room.beaconStatus,
        beaconSite: room.beaconSite,
        beaconTimerRemaining: room.beaconTimer,
        isBlindedByLight: room.isBlindedByLight,
        blindnessRemaining: room.blindnessTimer,

        // Active Lights
        activeLightSources: room.lightSources,
      })
    );
  }
}

function normalizeAngle(angle: number) {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      totalPlayers: Array.from(rooms.values()).reduce((acc, r) => acc + r.players.size, 0),
    });
  });

  // Supabase Cross-Game Integration API
  app.get('/api/supabase/status', (req, res) => {
    const sb = getSupabase();
    res.json({
      connected: sb !== null,
      url: process.env.SUPABASE_URL || null,
      hasTables: true,
      message: sb
        ? 'Connected to Supabase. Cross-game player synchronization active.'
        : 'Running standalone local persistence. Add SUPABASE_URL & SUPABASE_ANON_KEY to enable cross-game backend sync.',
    });
  });

  app.get('/api/supabase/profile', async (req, res) => {
    const id = (req.query.id as string) || 'player_guest';
    const name = (req.query.name as string) || 'Operative';
    const profile = await fetchPlayerProfile(id, name);
    res.json(profile);
  });

  app.post('/api/supabase/sync-match', async (req, res) => {
    try {
      await recordMatchOutcome(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  app.get('/api/supabase/schema', (req, res) => {
    res.json({ sql: SUPABASE_SQL_SETUP });
  });

  // WebSocket Connection Handlers
  wss.on('connection', (ws) => {
    let currentRoom: GameRoom | null = null;
    let player: ServerPlayer | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // JOIN MATCH
        if (data.type === 'join_match') {
          const roomId = data.roomId || 'sector_7';
          const mode = (data.mode as GameMode) || 'tdm';
          const faction: FactionType = (data.faction as FactionType) || 'lotito';

          currentRoom = getOrCreateRoom(roomId, mode);

          const playerId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 10 + Math.random() * 20;

          const rank: RankTier = (data.playerRank as RankTier) || 'Phantom';
          const { maxUnlocked, defaultEquipped } = computeUnlockedMuzzleLevel(
            rank,
            faction,
            mode === 'ranked'
          );

          player = {
            id: playerId,
            name: data.playerName || (faction === 'logigi' ? 'Dawn-1' : 'Hollow-7'),
            faction,
            ws,
            isBot: false,
            x: Math.cos(angle) * spawnDist,
            z: Math.sin(angle) * spawnDist,
            yaw: 0,
            health: 100,
            maxHealth: 100,
            ammoMag: 3,
            ammoReserve: 5,
            isGhostMode: false,
            stamina: 100,
            maxStamina: 100,
            movementMode: 'still',
            isHoldingBreath: false,
            isCrouching: false,
            isAimingSteady: false,
            reloadingStage: 'none',
            reloadStageTimer: 0,
            lastShotTime: 0,
            lastMoveTime: Date.now(),
            stillDuration: 0,
            pulseCharges: 1,
            pulseCooldownTimer: 0,
            decoys: 2,
            flares: faction === 'logigi' ? 2 : 0,
            glowSticks: faction === 'lotito' ? 2 : 1,
            veilActive: false,
            veilTimer: 0,
            kills: 0,
            deaths: 0,
            shotsFired: 0,
            shotsHit: 0,
            pulsesUsed: 0,
            instinctKills: 0,
            lastPulsedTime: 0,
            alive: true,
            respawnTimer: 0,
            playerRank: rank,
            equippedMuzzleLevel: defaultEquipped,
            unlockedMuzzleLevel: maxUnlocked,
            killstreakKills: 0,
            personalTrackerTimer: 0,
            hasActiveScan: false,
            carriedMines: 0,
            hasUltimate: false,
            scavengingCacheId: null,
            scavengeTimer: 0,
            isPlantingMine: false,
            plantMineTimer: 0,
          };

          currentRoom.players.set(playerId, player);
          populateBots(currentRoom, 6);

          ws.send(
            JSON.stringify({
              type: 'joined',
              playerId,
              roomId: currentRoom.id,
              weather: currentRoom.weather,
              zoneRadius: currentRoom.zoneRadius,
              faction,
              equippedMuzzleLevel: defaultEquipped,
              unlockedMuzzleLevel: maxUnlocked,
            })
          );
        }

        // SET MUZZLE ATTACHMENT
        if (data.type === 'set_muzzle' && player && player.alive) {
          const level = Number(data.level);
          if (level >= 0 && level <= player.unlockedMuzzleLevel) {
            player.equippedMuzzleLevel = level;
            ws.send(JSON.stringify({ type: 'muzzle_changed', level }));
          }
        }

        // USE ACTIVE SCAN (3-Killstreak)
        if (data.type === 'use_active_scan' && player && currentRoom && player.alive && player.hasActiveScan) {
          player.hasActiveScan = false;
          broadcastAudioEvent(currentRoom, {
            sound: 'active_scan_ping',
            x: player.x,
            z: player.z,
            volume: 1.0,
            noiseRadius: 40,
            sourcePlayerId: player.id,
          });

          const scanBlobs: PulseBlob[] = [];
          for (const target of currentRoom.players.values()) {
            if (target.id === player.id || !target.alive) continue;
            const dx = target.x - player.x;
            const dz = target.z - player.z;
            const dist = Math.hypot(dx, dz);
            if (dist <= 30) {
              const rawAngle = (Math.atan2(dx, -dz) - player.yaw) * (180 / Math.PI);
              const normAngle = (rawAngle + 360) % 360;
              scanBlobs.push({
                id: `scan_${Date.now()}_${target.id}`,
                angle: normAngle,
                band: dist <= 10 ? 'near' : dist <= 20 ? 'mid' : 'far',
                distance: Math.round(dist),
                size: 'human',
                created: Date.now(),
              });
            }
          }
          ws.send(
            JSON.stringify({
              type: 'active_scan_result',
              blobs: scanBlobs,
              origin: { x: player.x, z: player.z },
            })
          );
        }

        // PLANT MINE (4-Killstreak: Claymore / Snare)
        if (
          data.type === 'plant_mine' &&
          player &&
          currentRoom &&
          player.alive &&
          player.carriedMines > 0 &&
          !player.isPlantingMine
        ) {
          player.isPlantingMine = true;
          player.plantMineTimer = 1.5;
          const isLogigi = player.faction === 'logigi';
          broadcastAudioEvent(currentRoom, {
            sound: 'claymore_place',
            x: player.x,
            z: player.z,
            volume: 0.7,
            noiseRadius: isLogigi ? 15 : 12,
            sourcePlayerId: player.id,
          });
        }

        // USE ULTIMATE (7-Killstreak: Light Bomb / Dark Pulse)
        if (data.type === 'use_ultimate' && player && currentRoom && player.alive && player.hasUltimate) {
          player.hasUltimate = false;
          broadcastAudioEvent(currentRoom, {
            sound: 'let_there_be_light',
            x: player.x,
            z: player.z,
            volume: 1.0,
            noiseRadius: 200,
            sourcePlayerId: player.id,
          });

          // Stun bomb: blinds/silences within 40m
          for (const target of currentRoom.players.values()) {
            if (target.id === player.id || !target.alive) continue;
            if ((currentRoom.mode === 'tdm' || currentRoom.mode === 'light_war') && target.faction === player.faction) continue;
            const dist = Math.hypot(target.x - player.x, target.z - player.z);
            if (dist <= 40) {
              if (target.ws && target.ws.readyState === WebSocket.OPEN) {
                target.ws.send(JSON.stringify({ type: 'blinded_by_ultimate', duration: 5000 }));
              }
            }
          }

          ws.send(JSON.stringify({ type: 'ultimate_activated', duration: 3000 }));
          player.lastShotTime = Date.now() + 3000;
        }

        // SCAVENGE CACHE
        if (data.type === 'start_scavenge_cache' && player && currentRoom && player.alive) {
          const cacheId = data.cacheId;
          const cache = currentRoom.ammoCaches.find((c) => c.id === cacheId && c.available);
          if (cache && Math.hypot(player.x - cache.x, player.z - cache.z) <= 3.0) {
            player.scavengingCacheId = cache.id;
            player.scavengeTimer = 0;
            broadcastAudioEvent(currentRoom, {
              sound: 'cache_rummaging',
              x: cache.x,
              z: cache.z,
              volume: 0.7,
              noiseRadius: 8,
              sourcePlayerId: player.id,
            });
          }
        }

        if (data.type === 'cancel_scavenge_cache' && player) {
          player.scavengingCacheId = null;
          player.scavengeTimer = 0;
        }

        // PLAYER INPUT
        if (data.type === 'player_input' && player && currentRoom && player.alive) {
          player.yaw = data.yaw;
          player.movementMode = data.movementMode;
          player.isHoldingBreath = !!data.isHoldingBreath;
          player.isCrouching = !!data.isCrouching;
          player.isAimingSteady = !!data.isAimingSteady;
        }

        // FOOTSTEP
        if (data.type === 'footstep' && player && currentRoom && player.alive) {
          // If veil active, footsteps are silent
          if (!player.veilActive) {
            const surface = data.surface || 'wood';
            const radius =
              player.movementMode === 'crouch'
                ? 4
                : player.movementMode === 'sprint'
                ? 18
                : player.faction === 'logigi'
                ? 10
                : 6;

            broadcastAudioEvent(currentRoom, {
              sound: 'footstep',
              x: player.x,
              z: player.z,
              volume: player.movementMode === 'sprint' ? 0.8 : 0.4,
              noiseRadius: radius,
              surface,
              sourcePlayerId: player.id,
            });
          }
        }

        // PULSE
        if (data.type === 'pulse' && player && currentRoom && player.alive) {
          const now = Date.now();
          player.lastPulsedTime = now;
          player.pulsesUsed++;
          player.pulseCooldownTimer = player.faction === 'logigi' ? 12 : 8;

          // Sound emission of the pulse
          broadcastAudioEvent(currentRoom, {
            sound: 'pulse_ping',
            x: player.x,
            z: player.z,
            volume: 0.8,
            noiseRadius: 40,
            sourcePlayerId: player.id,
          });

          // Compute blobs within horizontal slice
          const blobs: PulseBlob[] = [];
          const pulseRadius = player.faction === 'logigi' ? 20 : 30;

          for (const target of currentRoom.players.values()) {
            if (target.id === player.id || !target.alive) continue;
            // If target has veil active, invisible to pulse!
            if (target.veilActive) continue;

            const dx = target.x - player.x;
            const dz = target.z - player.z;
            const dist = Math.hypot(dx, dz);

            if (dist <= pulseRadius) {
              const rawAngle = (Math.atan2(dx, -dz) - player.yaw) * (180 / Math.PI);
              const normAngle = (rawAngle + 360) % 360;
              const quantizedAngle = Math.round(normAngle / 22.5) * 22.5;

              let band: PulseBand = 'edge';
              if (dist <= 6) band = 'near';
              else if (dist <= 14) band = 'mid';
              else if (dist <= 22) band = 'far';

              blobs.push({
                id: `blob_${Date.now()}_${Math.random()}`,
                angle: quantizedAngle,
                band,
                distance: Math.round(dist),
                size: 'human',
                created: Date.now(),
              });
            }
          }

          ws.send(
            JSON.stringify({
              type: 'pulse_result',
              blobs,
              origin: { x: player.x, z: player.z },
            })
          );
        }

        // FIRE WEAPON
        if (data.type === 'fire' && player && currentRoom && player.alive) {
          if (typeof data.yaw === 'number') {
            player.yaw = data.yaw;
          }
          if (typeof data.isAimingSteady === 'boolean') {
            player.isAimingSteady = data.isAimingSteady;
          }
          const now = Date.now();
          if (player.isGhostMode || player.ammoMag <= 0) {
            broadcastAudioEvent(currentRoom, {
              sound: 'empty_click',
              x: player.x,
              z: player.z,
              volume: 0.5,
              noiseRadius: 15,
              sourcePlayerId: player.id,
            });
            ws.send(JSON.stringify({ type: 'empty_click' }));
            return;
          }

          if (now - player.lastShotTime < 1800) return;
          player.lastShotTime = now;
          player.ammoMag--;
          player.shotsFired++;

          if (player.ammoMag === 0 && player.ammoReserve === 0) {
            player.isGhostMode = true;
          }

          // Compute muzzle modifiers
          const muzzleConfig = MUZZLE_CONFIGS[player.equippedMuzzleLevel] || MUZZLE_CONFIGS[0];
          const isLogigi = player.faction === 'logigi';
          // Faction modifiers:
          // L'ogigi: Trail +0.3s, Damage +2%
          // L'otito: Trail -0.2s, Damage -2%
          const effectiveDamagePercent = Math.max(1, muzzleConfig.damagePercent + (isLogigi ? 2 : -2));
          const effectiveRange = 45 * (muzzleConfig.rangePercent / 100);
          const effectiveNoiseRadius =
            muzzleConfig.humRadius === 0 ? 0 : Math.max(5, muzzleConfig.humRadius * 4);
          const flashRadius = muzzleConfig.flashRadius;
          const trailDuration = Math.max(0, muzzleConfig.trailDuration + (isLogigi ? 0.3 : -0.2));

          // Gunshot bloom sound (Silent muzzle prestige has 0 hum/noise radius)
          if (effectiveNoiseRadius > 0) {
            broadcastAudioEvent(currentRoom, {
              sound: 'gunshot',
              x: player.x,
              z: player.z,
              volume: effectiveNoiseRadius / 80,
              noiseRadius: effectiveNoiseRadius,
              sourcePlayerId: player.id,
            });
          }

          // Muzzle flash light (momentary 120ms burst)
          if (flashRadius > 0) {
            currentRoom.lightSources.push({
              id: `flash_${Date.now()}_${player.id}`,
              type: 'flare',
              x: player.x,
              z: player.z,
              radius: flashRadius * 6,
              durationMs: 120,
              created: Date.now(),
              color: '#fbbf24',
              intensity: muzzleConfig.trailLight === 'Bright' ? 1.0 : muzzleConfig.trailLight === 'Medium' ? 0.6 : 0.3,
            });
          }

          // Check if shot disarms a placed mine along the line of fire
          for (let i = 0; i < currentRoom.mines.length; i++) {
            const mine = currentRoom.mines[i];
            const dx = mine.x - player.x;
            const dz = mine.z - player.z;
            const dist = Math.hypot(dx, dz);
            if (dist <= effectiveRange) {
              const mineAngle = Math.atan2(dx, -dz);
              const angleDiff = Math.abs(normalizeAngle(player.yaw - mineAngle));
              if (angleDiff < 0.22 && dist * Math.sin(angleDiff) < 1.0) {
                // Disarmed mine!
                currentRoom.mines.splice(i, 1);
                broadcastAudioEvent(currentRoom, {
                  sound: 'empty_click',
                  x: mine.x,
                  z: mine.z,
                  volume: 0.6,
                  noiseRadius: 8,
                });
                break;
              }
            }
          }

          // Server-authoritative hitscan cone test
          let targetHit: ServerPlayer | null = null;
          let minAngleDiff = 999;
          const maxAngleTol = player.isAimingSteady ? 0.28 : 0.20;

          for (const target of currentRoom.players.values()) {
            if (target.id === player.id || !target.alive) continue;
            // No friendly fire in TDM / Light War
            if (
              (currentRoom.mode === 'tdm' || currentRoom.mode === 'light_war') &&
              target.faction === player.faction
            ) {
              continue;
            }

            const dx = target.x - player.x;
            const dz = target.z - player.z;
            const dist = Math.hypot(dx, dz);
            if (dist > effectiveRange) continue;

            // Accurate angle matching yaw in Sector 7 coordinates: (dx, -dz)
            const targetAngle = Math.atan2(dx, -dz);
            const angleDiff = Math.abs(normalizeAngle(player.yaw - targetAngle));
            const perpDist = dist * Math.sin(angleDiff);

            if (angleDiff < maxAngleTol || (angleDiff < 0.38 && perpDist < 2.4)) {
              if (angleDiff < minAngleDiff) {
                minAngleDiff = angleDiff;
                targetHit = target;
              }
            }
          }

          if (targetHit) {
            player.shotsHit++;
            const isInstinct = now - player.lastPulsedTime <= 1000;
            if (isInstinct) player.instinctKills++;

            const damageDealt = Math.round(100 * (effectiveDamagePercent / 100));
            targetHit.health = Math.max(0, targetHit.health - damageDealt);

            if (targetHit.health <= 0) {
              targetHit.alive = false;
              targetHit.deaths++;
              targetHit.killstreakKills = 0;
              targetHit.hasActiveScan = false;
              targetHit.carriedMines = 0;
              targetHit.hasUltimate = false;
              targetHit.personalTrackerTimer = 0;

              player.kills++;
              player.killstreakKills++;

              // Killstreak Unlocks:
              // 2-Kill: Tracker (8s, stacks to 16s)
              if (player.killstreakKills === 2) {
                if (currentRoom.mode === 'tdm') {
                  if (player.faction === 'logigi') {
                    currentRoom.trackerTimerLogigi = Math.min(16, currentRoom.trackerTimerLogigi + 8);
                  } else {
                    currentRoom.trackerTimerLotito = Math.min(16, currentRoom.trackerTimerLotito + 8);
                  }
                } else {
                  player.personalTrackerTimer = Math.min(16, player.personalTrackerTimer + 8);
                }
                broadcastAudioEvent(currentRoom, {
                  sound: 'pulse_ping',
                  x: player.x,
                  z: player.z,
                  volume: 0.7,
                  noiseRadius: 10,
                  sourcePlayerId: player.id,
                });
                ws.send(JSON.stringify({ type: 'killstreak_unlocked', streak: 2, name: 'Tracker' }));
              }
              // 3-Kill: Active Scan
              else if (player.killstreakKills === 3) {
                player.hasActiveScan = true;
                ws.send(JSON.stringify({ type: 'killstreak_unlocked', streak: 3, name: 'Active Scan' }));
              }
              // 4-Kill: Claymore / Snare
              else if (player.killstreakKills === 4) {
                player.carriedMines = 1;
                ws.send(
                  JSON.stringify({
                    type: 'killstreak_unlocked',
                    streak: 4,
                    name: isLogigi ? 'Claymore' : 'Snare',
                  })
                );
              }
              // 7-Kill: Light Bomb / Dark Pulse
              else if (player.killstreakKills === 7) {
                player.hasUltimate = true;
                ws.send(
                  JSON.stringify({
                    type: 'killstreak_unlocked',
                    streak: 7,
                    name: isLogigi ? 'Light Bomb' : 'Dark Pulse',
                  })
                );
              }

              // Handle TDM Lives decrement
              if (currentRoom.mode === 'tdm') {
                if (targetHit.faction === 'logigi') {
                  currentRoom.tdmLivesLogigi = Math.max(0, currentRoom.tdmLivesLogigi - 1);
                } else {
                  currentRoom.tdmLivesLotito = Math.max(0, currentRoom.tdmLivesLotito - 1);
                }
                targetHit.respawnTimer = 5.0;
              }

              ws.send(
                JSON.stringify({
                  type: 'hit_marker',
                  victimName: targetHit.name,
                  isKill: true,
                  instinct: isInstinct,
                  damage: damageDealt,
                })
              );

              if (targetHit.ws && targetHit.ws.readyState === WebSocket.OPEN) {
                targetHit.ws.send(
                  JSON.stringify({
                    type: 'killed',
                    killerName: player.name,
                  })
                );
              }
            } else {
              // Target wounded but alive (due to reduced damage of high muzzles)
              ws.send(
                JSON.stringify({
                  type: 'hit_marker',
                  victimName: targetHit.name,
                  isKill: false,
                  damage: damageDealt,
                })
              );
            }
          }
        }

        // RELOAD STAGE
        if (data.type === 'reload' && player && currentRoom && player.alive) {
          if (player.ammoMag >= 3 || player.ammoReserve <= 0) return;
          const stage = data.stage as ReloadStageName;
          player.reloadingStage = stage;

          let radius = 5;
          if (stage === 'mag_out') radius = 8;
          else if (stage === 'mag_in') radius = 12;
          else if (stage === 'bolt_pull') radius = 15;

          broadcastAudioEvent(currentRoom, {
            sound: 'reload_stage',
            x: player.x,
            z: player.z,
            volume: 0.4,
            noiseRadius: radius,
            stageName: stage,
            sourcePlayerId: player.id,
          });

          if (stage === 'ready') {
            const needed = 3 - player.ammoMag;
            const reloadCount = Math.min(needed, player.ammoReserve);
            player.ammoMag += reloadCount;
            player.ammoReserve -= reloadCount;
            player.reloadingStage = 'none';
            player.isGhostMode = false;
          }
        }

        // MELEE ATTACK
        if (data.type === 'melee' && player && currentRoom && player.alive) {
          const range = player.faction === 'lotito' ? 1.6 : 1.3;
          broadcastAudioEvent(currentRoom, {
            sound: 'melee_swing',
            x: player.x,
            z: player.z,
            volume: 0.4,
            noiseRadius: 4,
            sourcePlayerId: player.id,
          });

          for (const target of currentRoom.players.values()) {
            if (target.id === player.id || !target.alive) continue;
            if (
              (currentRoom.mode === 'tdm' || currentRoom.mode === 'light_war') &&
              target.faction === player.faction
            ) {
              continue;
            }

            const dist = Math.hypot(target.x - player.x, target.z - player.z);
            if (dist <= range) {
              target.health = 0;
              target.alive = false;
              target.deaths++;
              player.kills++;
              player.ammoReserve += 1;
              player.isGhostMode = false;

              if (currentRoom.mode === 'tdm') {
                if (target.faction === 'logigi') {
                  currentRoom.tdmLivesLogigi = Math.max(0, currentRoom.tdmLivesLogigi - 1);
                } else {
                  currentRoom.tdmLivesLotito = Math.max(0, currentRoom.tdmLivesLotito - 1);
                }
                target.respawnTimer = 5.0;
              }

              ws.send(JSON.stringify({ type: 'hit_marker', victimName: target.name, isKill: true }));
              break;
            }
          }
        }

        // THROW FLARE
        if (data.type === 'throw_flare' && player && currentRoom && player.alive) {
          if (player.flares > 0) {
            player.flares--;
            const throwDist = 12;
            const flareX = player.x - Math.sin(player.yaw) * throwDist;
            const flareZ = player.z - Math.cos(player.yaw) * throwDist;

            currentRoom.lightSources.push({
              id: `flare_${Date.now()}`,
              type: 'flare',
              x: flareX,
              z: flareZ,
              radius: 15,
              durationMs: 10000,
              created: Date.now(),
              color: '#f59e0b',
              intensity: 0.95,
            });

            broadcastAudioEvent(currentRoom, {
              sound: 'flare_ignite',
              x: flareX,
              z: flareZ,
              volume: 0.6,
              noiseRadius: 20,
            });
          }
        }

        // THROW GLOW STICK
        if (data.type === 'throw_glow_stick' && player && currentRoom && player.alive) {
          if (player.glowSticks > 0) {
            player.glowSticks--;
            const throwDist = 8;
            const glowX = player.x - Math.sin(player.yaw) * throwDist;
            const glowZ = player.z - Math.cos(player.yaw) * throwDist;

            currentRoom.lightSources.push({
              id: `glow_${Date.now()}`,
              type: 'glow_stick',
              x: glowX,
              z: glowZ,
              radius: 6,
              durationMs: 30000,
              created: Date.now(),
              color: '#10b981',
              intensity: 0.7,
            });

            broadcastAudioEvent(currentRoom, {
              sound: 'glow_throw',
              x: glowX,
              z: glowZ,
              volume: 0.2,
              noiseRadius: 5,
            });
          }
        }

        // ACTIVATE ABILITY (Illuminate vs Veil)
        if (data.type === 'activate_ability' && player && currentRoom && player.alive) {
          if (player.faction === 'lotito') {
            // L'otito Veil: 5s silent & pulse invisible
            player.veilActive = true;
            setTimeout(() => {
              if (player) player.veilActive = false;
            }, 5000);
          } else if (player.faction === 'logigi') {
            // L'ogigi Illuminate: reveals players within 15m
            broadcastAudioEvent(currentRoom, {
              sound: 'flare_ignite',
              x: player.x,
              z: player.z,
              volume: 0.8,
              noiseRadius: 30,
            });
          }
        }

        // DECOY
        if (data.type === 'decoy' && player && currentRoom && player.alive) {
          if (player.decoys > 0) {
            player.decoys--;
            const throwDist = 15;
            const decoyX = player.x - Math.sin(player.yaw) * throwDist;
            const decoyZ = player.z - Math.cos(player.yaw) * throwDist;

            broadcastAudioEvent(currentRoom, {
              sound: 'decoy',
              x: decoyX,
              z: decoyZ,
              volume: 0.6,
              noiseRadius: 25,
            });
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoom && player) {
        currentRoom.players.delete(player.id);
      }
    });
  });

  // Game tick loop (20 ticks/sec = 50ms)
  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const deltaSec = (now - room.lastTickTime) / 1000;
      room.lastTickTime = now;
      updateRoom(room, deltaSec);
    }
  }, 50);

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Shadow Shot Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
