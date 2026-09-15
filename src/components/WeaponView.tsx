/**
 * Shadow Shot - High-Definition Sniper Rifle & ADS Optical System
 * Authentic military-grade precision sniper rifle in first-person view.
 * Features realistic hip position and true Aim Down Sights (ADS) with NO crosshairs.
 */

import React from 'react';
import { FactionType } from '../types';
import { CodSniperScope } from './CodSniperScope';

interface WeaponViewProps {
  faction: FactionType;
  isAimingSteady: boolean;
  isGhostMode: boolean;
  isRanked: boolean;
  reloading: boolean;
  targetInSights?: boolean;
  muzzleLevel?: number;
  isHoldingBreath?: boolean;
  stamina?: number;
  lastShotTime?: number;
}

export const WeaponView: React.FC<WeaponViewProps> = ({
  faction,
  isAimingSteady,
  isGhostMode,
  isRanked,
  reloading,
  targetInSights = false,
  muzzleLevel = 0,
  isHoldingBreath = false,
  stamina = 100,
  lastShotTime = 0,
}) => {
  const isLogigi = faction === 'logigi';
  const rimColor = isLogigi ? '#f59e0b' : '#38bdf8'; // Warm Solar Amber vs Cold Ion Cyan
  const rimAccent = isLogigi ? '#fbbf24' : '#7dd3fc';

  if (isGhostMode) {
    // In Ghost Mode (melee only), weapon is holstered / lowered
    return (
      <div className="absolute bottom-6 right-8 pointer-events-none select-none opacity-45">
        <svg width="140" height="70" viewBox="0 0 140 70">
          <defs>
            <linearGradient id="knifeBlade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="40%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
          </defs>
          {/* Tactical combat knife */}
          <path
            d="M 12 58 L 95 24 L 132 20 L 102 36 L 40 64 Z"
            fill="url(#knifeBlade)"
            stroke="#ef4444"
            strokeWidth="1.2"
          />
          {/* Serrated spine */}
          <path d="M 60 38 L 65 35 L 70 37 L 75 34 L 80 36" stroke="#ef4444" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* 1. CALL OF DUTY AUTHENTIC FULL-SCREEN SNIPER ADS OPTIC */}
      {isAimingSteady && (
        <CodSniperScope
          isAiming={isAimingSteady}
          isHoldingBreath={isHoldingBreath}
          stamina={stamina}
          faction={faction}
          targetInSights={targetInSights}
          lastShotTime={lastShotTime}
        />
      )}

      {/* ============================================================ */}
      {/* 2. FIRST-PERSON HIGH-DEFINITION SNIPER RIFLE (Hip Position) */}
      {/* Completely hidden during ADS for genuine sniper optical clarity */}
      {/* ============================================================ */}
      {!isAimingSteady && (
        <div
          className={`absolute bottom-0 right-0 pointer-events-none select-none transition-transform duration-200 ease-out z-20 ${
            reloading
              ? 'transform translate-y-20 rotate-12'
              : 'transform hover:scale-[1.01]'
          }`}
          style={{
            opacity: isRanked ? 0.75 : 0.95,
          }}
        >
        <svg
          width="480"
          height="320"
          viewBox="0 0 480 320"
          className="drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] overflow-visible"
        >
          <defs>
            {/* Matte Gunmetal Finish Gradient */}
            <linearGradient id="gunmetalDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="40%" stopColor="#27272a" />
              <stop offset="85%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Precision Match Barrel Brushed Metal */}
            <linearGradient id="barrelMetal" x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#52525b" />
              <stop offset="35%" stopColor="#27272a" />
              <stop offset="70%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Scope Cylinder Gradient */}
            <linearGradient id="scopeTube" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#52525b" />
              <stop offset="25%" stopColor="#27272a" />
              <stop offset="70%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Receiver Highlight Gradient */}
            <linearGradient id="receiverCarbon" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="50%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Faction Rim Ambient Light */}
            <linearGradient id="factionRim" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={rimAccent} stopOpacity="0.8" />
              <stop offset="40%" stopColor={rimColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Brass Cartridge Glint */}
            <linearGradient id="brassGlint" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
          </defs>

          {/* Group angled toward center-screen (tactical low-ready sniper grip) */}
          <g transform="translate(10, 20) rotate(-14, 260, 180)">
            {/* 1. Fluted Heavy Sniper Barrel */}
            <polygon
              points="40,94 280,186 276,202 36,110"
              fill="url(#barrelMetal)"
              stroke="#18181b"
              strokeWidth="1"
            />
            {/* Barrel Fluting Channels */}
            <line x1="60" y1="102" x2="260" y2="190" stroke="#09090b" strokeWidth="2" />
            <line x1="62" y1="106" x2="262" y2="194" stroke="#09090b" strokeWidth="1.5" />

            {/* Barrel Top Rim Faction Glow Line */}
            <line
              x1="38"
              y1="94"
              x2="278"
              y2="186"
              stroke={rimColor}
              strokeWidth="1"
              opacity="0.65"
            />

            {/* 2. Tactical Muzzle Attachment (Progressive Muzzle Levels 0–7) */}
            {muzzleLevel === 0 && (
              // Level 0: Bare Muzzle (no attachment, exposed barrel threads and crown)
              <g id="muzzle-bare">
                <polygon points="30,90 42,95 38,112 26,107" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />
                <line x1="32" y1="91" x2="30" y2="108" stroke="#52525b" strokeWidth="1" />
                <line x1="36" y1="93" x2="34" y2="110" stroke="#52525b" strokeWidth="1" />
                <line x1="40" y1="95" x2="38" y2="112" stroke="#52525b" strokeWidth="1" />
              </g>
            )}

            {(muzzleLevel === 1 || muzzleLevel === 2) && (
              // Level 1–2: Mk. I–II Small Suppressor, dark metal, knurled lock ring
              <g id="muzzle-mk1-mk2">
                <polygon points="12,83 42,95 38,112 8,100" fill="#18181b" stroke="#27272a" strokeWidth="1.2" />
                <polygon points="36,92 42,95 38,112 32,109" fill="#3f3f46" stroke="#52525b" strokeWidth="0.6" />
                <circle cx="10" cy="92" r="3" fill="#09090b" stroke="#3f3f46" strokeWidth="0.8" />
              </g>
            )}

            {(muzzleLevel === 3 || muzzleLevel === 4) && (
              // Level 3–4: Mk. III–IV Longer Suppressor, matte finish, heat dissipation ribs
              <g id="muzzle-mk3-mk4">
                <polygon points="-8,75 42,95 38,114 -12,94" fill="#0f0f12" stroke="#27272a" strokeWidth="1.2" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <line
                    key={`rib_${i}`}
                    x1={-2 + i * 8}
                    y1={77 + i * 3.2}
                    x2={-5 + i * 8}
                    y2={96 + i * 3.2}
                    stroke="#27272a"
                    strokeWidth="1.6"
                  />
                ))}
                <polygon points="-12,73 -6,75 -10,94 -16,92" fill="#18181b" stroke={rimColor} strokeWidth="0.8" opacity="0.7" />
              </g>
            )}

            {muzzleLevel === 5 && (
              // Level 5: Mk. V Integrated Suppressor, sleek shrouded front
              <g id="muzzle-mk5">
                <polygon points="-16,72 44,96 40,116 -20,92" fill="#18181b" stroke="#3f3f46" strokeWidth="1.4" />
                <line x1="-16" y1="72" x2="44" y2="96" stroke={rimColor} strokeWidth="1.2" opacity="0.8" />
                <polygon points="-24,69 -16,72 -20,92 -28,89" fill="#09090b" stroke="#27272a" strokeWidth="1" />
              </g>
            )}

            {muzzleLevel === 6 && (
              // Level 6: Ghost Muzzle, fully integrated, near-invisible seam with carbon wrap
              <g id="muzzle-ghost">
                <polygon points="-22,70 44,96 40,116 -26,90" fill="#09090b" stroke="#27272a" strokeWidth="0.8" />
                <line x1="-22" y1="70" x2="44" y2="96" stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="3 3" />
                <polygon points="-28,68 -22,70 -26,90 -32,88" fill="#050507" stroke="#18181b" strokeWidth="0.5" />
              </g>
            )}

            {muzzleLevel === 7 && (
              // Level 7: Silent Muzzle, monolithic unnatural shroud with zero ports
              <g id="muzzle-silent">
                <polygon points="-26,68 44,96 40,116 -30,88" fill="#030303" stroke="#18181b" strokeWidth="1" />
                <line x1="-26" y1="68" x2="44" y2="96" stroke="#52525b" strokeWidth="0.5" opacity="0.3" />
              </g>
            )}

            {/* 3. Folded Bipod Legs tucked under forearm */}
            <polygon points="120,145 220,185 218,192 118,152" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />
            <circle cx="120" cy="148" r="3.5" fill="#3f3f46" stroke="#18181b" strokeWidth="0.5" />

            {/* 4. Handguard / Chassis Forearm with M-LOK slots */}
            <polygon
              points="110,125 270,185 264,215 104,155"
              fill="url(#receiverCarbon)"
              stroke="#27272a"
              strokeWidth="1"
            />
            {/* M-LOK Negative Space Slots */}
            <rect x="140" y="145" width="22" height="6" rx="2" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" transform="rotate(21, 140, 145)" />
            <rect x="180" y="160" width="22" height="6" rx="2" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" transform="rotate(21, 180, 160)" />
            <rect x="220" y="175" width="22" height="6" rx="2" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" transform="rotate(21, 220, 175)" />

            {/* 5. Picatinny Tactical Top Rail with CNC cuts */}
            <polygon
              points="140,126 310,192 308,198 138,132"
              fill="#27272a"
              stroke="#18181b"
              strokeWidth="0.8"
            />
            {Array.from({ length: 12 }).map((_, idx) => (
              <line
                key={`rail_${idx}`}
                x1={150 + idx * 13}
                y1={130 + idx * 5.1}
                x2={148 + idx * 13}
                y2={136 + idx * 5.1}
                stroke="#09090b"
                strokeWidth="1.8"
              />
            ))}

            {/* 6. High-Magnification Precision Sniper Scope Assembly */}
            {/* Heavy-Duty Dual Scope Ring Mounts */}
            <polygon points="175,115 195,123 192,142 172,134" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />
            <polygon points="265,150 285,158 282,177 262,169" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />

            {/* Scope Main 34mm Tube */}
            <polygon
              points="155,95 315,157 310,180 150,118"
              fill="url(#scopeTube)"
              stroke="#18181b"
              strokeWidth="1.2"
            />

            {/* Front Objective Lens Bell with Sunshade */}
            <polygon
              points="120,78 160,95 155,122 115,105"
              fill="#18181b"
              stroke="#27272a"
              strokeWidth="1"
            />
            {/* Objective Lens Aperture Rim */}
            <polygon
              points="114,75 122,78 117,105 109,102"
              fill="#09090b"
              stroke={rimColor}
              strokeWidth="0.8"
              opacity="0.8"
            />

            {/* Tactical Elevation Turret (Top dial with knurled cap) */}
            <polygon points="220,105 242,114 240,94 218,85" fill="#3f3f46" stroke="#18181b" strokeWidth="1" />
            <line x1="222" y1="92" x2="238" y2="98" stroke={rimColor} strokeWidth="1.5" opacity="0.9" />

            {/* Windage Turret (Side dial) */}
            <polygon points="238,135 254,141 251,153 235,147" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />

            {/* Ocular Eyepiece Bell (Rear) */}
            <polygon
              points="300,150 338,165 334,196 296,181"
              fill="#18181b"
              stroke="#27272a"
              strokeWidth="1.2"
            />
            {/* Rubber Eye Relief Ring */}
            <polygon
              points="334,163 344,167 340,198 330,194"
              fill="#09090b"
              stroke="#3f3f46"
              strokeWidth="1"
            />

            {/* 7. Bolt-Action Mechanism & Receiver */}
            <polygon
              points="260,178 375,222 365,270 250,226"
              fill="url(#receiverCarbon)"
              stroke="#18181b"
              strokeWidth="1.2"
            />

            {/* Ejection Port opening */}
            <polygon points="280,188 335,210 330,224 275,202" fill="#09090b" stroke="#27272a" strokeWidth="1" />
            {/* Glimpse of Polished Brass Cartridge Case inside */}
            <polygon points="290,194 325,208 322,216 287,202" fill="url(#brassGlint)" opacity="0.85" />

            {/* Bolt Handle & Knurled Ball Grip */}
            <line x1="320" y1="202" x2="345" y2="185" stroke="#52525b" strokeWidth="5" strokeLinecap="round" />
            <circle cx="347" cy="184" r="7" fill="#27272a" stroke={rimColor} strokeWidth="1.2" />

            {/* 8. Magazine Well & 3-Round Detachable Box Magazine */}
            <polygon
              points="268,228 320,248 305,302 253,282"
              fill="#18181b"
              stroke="#27272a"
              strokeWidth="1.2"
            />
            {/* Magazine Grip Ridges */}
            <line x1="262" y1="255" x2="310" y2="273" stroke="#09090b" strokeWidth="2.5" />
            <line x1="260" y1="267" x2="308" y2="285" stroke="#09090b" strokeWidth="2.5" />
            <line x1="258" y1="279" x2="306" y2="297" stroke="#09090b" strokeWidth="2.5" />

            {/* 9. Trigger Guard & Curved Match-Grade Trigger */}
            <path
              d="M 326 250 C 342 258, 355 282, 345 292 L 332 286"
              fill="none"
              stroke="#27272a"
              strokeWidth="3.5"
            />
            {/* Skeletonized Match Trigger */}
            <path d="M 334 256 Q 340 270 335 278" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" />

            {/* 10. Ergonomic Pistol Grip & Chassis Stock */}
            <polygon
              points="340,252 410,280 395,340 330,310"
              fill="url(#gunmetalDark)"
              stroke="#18181b"
              strokeWidth="1.2"
            />
            {/* Tactical Grip Checkering Pattern */}
            <circle cx="360" cy="285" r="1.5" fill="#52525b" />
            <circle cx="366" cy="290" r="1.5" fill="#52525b" />
            <circle cx="372" cy="295" r="1.5" fill="#52525b" />
            <circle cx="362" cy="298" r="1.5" fill="#52525b" />
            <circle cx="368" cy="303" r="1.5" fill="#52525b" />

            {/* Faction Emblem / Serial Identification Stamping */}
            <text
              x="290"
              y="245"
              fill={rimColor}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              opacity="0.75"
              transform="rotate(21, 290, 245)"
            >
              {isLogigi ? "L'OGIGI MK-IV // 12.7MM" : "L'OTITO SPECTRE // 12.7MM"}
            </text>
          </g>
        </svg>
      </div>
      )}
    </>
  );
};
