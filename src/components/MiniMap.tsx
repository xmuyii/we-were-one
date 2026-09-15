/**
 * Shadow Shot - Fog-of-War Mini-Map & Tactical Orientation System
 * Top-down tactical representation of Sector 7.
 * Coordinates are fixed North-Up: Pressing W moves UP, S moves DOWN, A moves LEFT, D moves RIGHT.
 * Player indicator rotates to show facing direction.
 */

import React, { useMemo } from 'react';
import { ClientGameState, MapObstacle } from '../types';

interface MiniMapProps {
  gameState: ClientGameState;
  playerX: number;
  playerZ: number;
  yaw: number; // in radians
  isExpanded: boolean;
  onToggleExpand: () => void;
  highContrast?: boolean;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  gameState,
  playerX,
  playerZ,
  yaw,
  isExpanded,
  onToggleExpand,
  highContrast = false,
}) => {
  const mapSize = isExpanded ? 320 : 130;
  const isRanked = gameState.mode === 'ranked';
  const arenaRadius = 32; // Sector 7 tactical boundary (meters)
  const drawRadius = mapSize / 2 - 10;

  // Fixed North-Up World-to-Map projection:
  // -X = Left (West), +X = Right (East)
  // -Z = Top (North - moving forward with KeyW), +Z = Bottom (South - moving backward with KeyS)
  const worldToMap = (wx: number, wz: number) => {
    const px = mapSize / 2 + (wx / arenaRadius) * drawRadius;
    const py = mapSize / 2 + (wz / arenaRadius) * drawRadius;
    const inBounds = px >= 4 && px <= mapSize - 4 && py >= 4 && py <= mapSize - 4;
    return { x: px, y: py, inBounds };
  };

  // Static Sector 7 walls and layout
  const staticObstacles: MapObstacle[] = useMemo(
    () => [
      // Central bunker cross
      { x1: -8, z1: -8, x2: 8, z2: -8 },
      { x1: -8, z1: 8, x2: 8, z2: 8 },
      { x1: -8, z1: -8, x2: -8, z2: 8 },
      { x1: 8, z1: -8, x2: 8, z2: 8 },
      // Flanking corridor partitions
      { x1: -20, z1: -14, x2: -10, z2: -14 },
      { x1: 10, z1: -14, x2: 20, z2: -14 },
      { x1: -20, z1: 14, x2: -10, z2: 14 },
      { x1: 10, z1: 14, x2: 20, z2: 14 },
      // Inner cover pillars
      { x1: -2, z1: -2, x2: 2, z2: -2 },
      { x1: -2, z1: 2, x2: 2, z2: 2 },
    ],
    []
  );

  // Player map position and rotation
  const playerPt = worldToMap(playerX, playerZ);
  // In our coordinates: yaw = 0 is looking North (-Z, or UP).
  // Standard SVG rotation around player center: (yaw * 180 / PI)
  const yawDeg = (yaw * 180) / Math.PI;

  return (
    <div
      id="shadow-shot-minimap"
      onClick={onToggleExpand}
      className={`relative cursor-pointer select-none transition-all duration-300 rounded-lg overflow-hidden border ${
        isExpanded
          ? 'bg-black/95 border-zinc-600 shadow-2xl backdrop-blur-md'
          : 'bg-black/85 border-zinc-800/90 shadow-lg hover:border-zinc-600'
      }`}
      style={{
        width: `${mapSize}px`,
        height: `${mapSize}px`,
      }}
      title={isExpanded ? 'Click or tap to minimize' : 'Click or hold Tab to expand map'}
    >
      <svg className="w-full h-full" viewBox={`0 0 ${mapSize} ${mapSize}`}>
        <defs>
          {/* Subtle tactical grid pattern */}
          <pattern
            id="tacticalGrid"
            width={isExpanded ? '20' : '12'}
            height={isExpanded ? '20' : '12'}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${isExpanded ? '20' : '12'} 0 L 0 0 0 ${isExpanded ? '20' : '12'}`}
              fill="none"
              stroke="#18181b"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* 1. Tactical Arena Background Grid */}
        <rect width={mapSize} height={mapSize} fill="#09090b" />
        <rect width={mapSize} height={mapSize} fill="url(#tacticalGrid)" opacity="0.65" />

        {/* Outer Arena Boundary */}
        <circle
          cx={mapSize / 2}
          cy={mapSize / 2}
          r={drawRadius}
          fill="none"
          stroke="#27272a"
          strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* Cardinal Direction Indicators */}
        <text
          x={mapSize / 2}
          y={10}
          fill="#71717a"
          fontSize="7"
          fontFamily="monospace"
          textAnchor="middle"
        >
          N
        </text>
        <text
          x={mapSize - 6}
          y={mapSize / 2 + 2.5}
          fill="#52525b"
          fontSize="7"
          fontFamily="monospace"
          textAnchor="middle"
        >
          E
        </text>
        <text
          x={mapSize / 2}
          y={mapSize - 4}
          fill="#52525b"
          fontSize="7"
          fontFamily="monospace"
          textAnchor="middle"
        >
          S
        </text>
        <text
          x={6}
          y={mapSize / 2 + 2.5}
          fill="#52525b"
          fontSize="7"
          fontFamily="monospace"
          textAnchor="middle"
        >
          W
        </text>

        {/* 2. Explored Fog-of-War Footstep Trail */}
        {gameState.exploredTiles.map((tile, i) => {
          const pt = worldToMap(tile.x, tile.z);
          if (!pt.inBounds) return null;
          return (
            <circle
              key={`exp_${i}`}
              cx={pt.x}
              cy={pt.y}
              r={isExpanded ? 3.5 : 2}
              fill={highContrast ? '#ffffff' : '#52525b'}
              opacity={0.4}
            />
          );
        })}

        {/* 3. Explored Obstacles / Walls */}
        {staticObstacles.map((wall, i) => {
          const p1 = worldToMap(wall.x1, wall.z1);
          const p2 = worldToMap(wall.x2, wall.z2);
          return (
            <line
              key={`wall_${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={highContrast ? '#e4e4e7' : '#3f3f46'}
              strokeWidth={isExpanded ? 2.5 : 1.5}
              strokeLinecap="round"
              opacity={0.65}
            />
          );
        })}

        {/* 4. Collapse Zone (Red perimeter ring) */}
        {(() => {
          const centerPt = worldToMap(gameState.zoneCenter.x, gameState.zoneCenter.z);
          const scale = drawRadius / arenaRadius;
          const zonePxRadius = gameState.zoneRadius * scale;
          return (
            <circle
              cx={centerPt.x}
              cy={centerPt.y}
              r={zonePxRadius}
              fill="none"
              stroke="#ef4444"
              strokeWidth={isExpanded ? 2 : 1.2}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          );
        })()}

        {/* 5. Discovered Ammo Caches (Green dots with crates) */}
        {gameState.knownAmmoCaches.map((cache, i) => {
          const pt = worldToMap(cache.x, cache.z);
          if (!pt.inBounds) return null;
          return (
            <g key={`cache_${i}`}>
              <rect
                x={pt.x - (isExpanded ? 4 : 2.5)}
                y={pt.y - (isExpanded ? 4 : 2.5)}
                width={isExpanded ? 8 : 5}
                height={isExpanded ? 8 : 5}
                fill="#22c55e"
                stroke="#15803d"
                strokeWidth="0.8"
                rx="1"
                opacity={0.9}
              />
              <line
                x1={pt.x - (isExpanded ? 3 : 2)}
                y1={pt.y}
                x2={pt.x + (isExpanded ? 3 : 2)}
                y2={pt.y}
                stroke="#052e16"
                strokeWidth="0.8"
              />
              {isExpanded && (
                <text
                  x={pt.x + 6}
                  y={pt.y + 3}
                  fill="#86efac"
                  fontSize="7"
                  fontFamily="monospace"
                >
                  CACHE
                </text>
              )}
            </g>
          );
        })}

        {/* 5b. Placed Mines (Claymores & Snares) */}
        {gameState.placedMines && gameState.placedMines.map((mine) => {
          const pt = worldToMap(mine.x, mine.z);
          if (!pt.inBounds) return null;
          const isFriendly = mine.ownerFaction === gameState.faction;
          return (
            <g key={`mine_${mine.id}`}>
              <polygon
                points={`${pt.x},${pt.y - (isExpanded ? 5 : 3)} ${pt.x + (isExpanded ? 4 : 2.5)},${pt.y + (isExpanded ? 4 : 2.5)} ${pt.x - (isExpanded ? 4 : 2.5)},${pt.y + (isExpanded ? 4 : 2.5)}`}
                fill={isFriendly ? '#38bdf8' : '#ef4444'}
                stroke="#000000"
                strokeWidth="0.8"
                className={!isFriendly ? 'animate-pulse' : undefined}
                opacity={0.9}
              />
              {isExpanded && (
                <text
                  x={pt.x + 5}
                  y={pt.y + 3}
                  fill={isFriendly ? '#7dd3fc' : '#fca5a5'}
                  fontSize="6.5"
                  fontFamily="monospace"
                >
                  {isFriendly ? 'MINE' : '!MINE!'}
                </text>
              )}
            </g>
          );
        })}

        {/* 5c. Tracker Revealed Enemies (2-Kill Tracker Streak) */}
        {gameState.trackerEnemies && gameState.trackerEnemies.map((enemy, idx) => {
          const pt = worldToMap(enemy.x, enemy.z);
          if (!pt.inBounds) return null;
          return (
            <g key={`track_${enemy.id || idx}`}>
              <polygon
                points={`${pt.x},${pt.y - (isExpanded ? 5 : 3.5)} ${pt.x + (isExpanded ? 5 : 3.5)},${pt.y} ${pt.x},${pt.y + (isExpanded ? 5 : 3.5)} ${pt.x - (isExpanded ? 5 : 3.5)},${pt.y}`}
                fill="#f59e0b"
                stroke="#fbbf24"
                strokeWidth="1.2"
                className="animate-ping"
                opacity={0.8}
              />
              <polygon
                points={`${pt.x},${pt.y - (isExpanded ? 4 : 2.5)} ${pt.x + (isExpanded ? 4 : 2.5)},${pt.y} ${pt.x},${pt.y + (isExpanded ? 4 : 2.5)} ${pt.x - (isExpanded ? 4 : 2.5)},${pt.y}`}
                fill="#f59e0b"
                opacity={0.95}
              />
              {isExpanded && (
                <text
                  x={pt.x + 6}
                  y={pt.y + 3}
                  fill="#fcd34d"
                  fontSize="6.5"
                  fontFamily="monospace"
                >
                  TRACKED
                </text>
              )}
            </g>
          );
        })}

        {/* 6. Teammates in Team Modes (Blue dots) */}
        {gameState.players
          .filter(
            (p) =>
              p.isTeammate && !p.isSelf && p.isAlive && p.x !== undefined && p.z !== undefined
          )
          .map((tm) => {
            const pt = worldToMap(tm.x!, tm.z!);
            if (!pt.inBounds) return null;
            return (
              <circle
                key={`tm_${tm.id}`}
                cx={pt.x}
                cy={pt.y}
                r={isExpanded ? 5 : 3}
                fill="#38bdf8"
                opacity={0.95}
              />
            );
          })}

        {/* 7. Active Radar Contacts / Pulse Blobs */}
        {!isRanked &&
          gameState.activeBlobs.map((blob) => {
            // Project blob from player position
            const angleRad = ((yaw * 180) / Math.PI + blob.angle) * (Math.PI / 180);
            const bx = playerX + Math.sin(angleRad) * blob.distance;
            const bz = playerZ - Math.cos(angleRad) * blob.distance;
            const pt = worldToMap(bx, bz);
            if (!pt.inBounds) return null;

            return (
              <circle
                key={blob.id}
                cx={pt.x}
                cy={pt.y}
                r={isExpanded ? 5 : 3}
                fill="#ef4444"
                className="animate-pulse"
                opacity={0.9}
              />
            );
          })}

        {/* 8. Player Indicator: Tactical Arrow located at playerPt, rotated by yaw */}
        <g transform={`translate(${playerPt.x}, ${playerPt.y}) rotate(${yawDeg})`}>
          {/* Subtle FOV Vision Cone (shows aiming direction) */}
          <path
            d={`M 0 0 L ${isExpanded ? -24 : -14} ${isExpanded ? -38 : -22} A ${
              isExpanded ? 45 : 26
            } ${isExpanded ? 45 : 26} 0 0 1 ${isExpanded ? 24 : 14} ${
              isExpanded ? -38 : -22
            } Z`}
            fill={gameState.faction === 'logigi' ? '#f59e0b' : '#38bdf8'}
            opacity="0.15"
          />
          {/* Sharp High-Visibility Player Triangle pointing Forward (▲) */}
          <polygon
            points={`0,${isExpanded ? -9 : -6} ${isExpanded ? -6 : -4},${
              isExpanded ? 6 : 4
            } ${isExpanded ? 6 : 4},${isExpanded ? 6 : 4}`}
            fill={gameState.faction === 'logigi' ? '#fbbf24' : '#38bdf8'}
            stroke="#000000"
            strokeWidth="1.2"
          />
        </g>
      </svg>

      {/* Header Tag */}
      <div className="absolute top-1 left-2 pointer-events-none text-[7.5px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        <span>{isExpanded ? 'SECTOR 7 (TACTICAL OVERVIEW)' : 'FOG OF WAR'}</span>
      </div>

      {isExpanded && (
        <div className="absolute bottom-1 right-2 pointer-events-none text-[8.5px] font-mono text-zinc-400">
          Click to minimize [TAB]
        </div>
      )}
    </div>
  );
};
