/**
 * Shadow Shot - Submarine Echolocation Sonar Radar
 * Authentic 360-degree continuous sweeping active/passive sonar.
 * Sweeps like a submarine CRT display, illuminating contacts as bright phosphor blips with persistence decay.
 */

import React, { useEffect, useRef, useState } from 'react';
import { PulseBlob, RadarContact } from '../types';
import { soundEngine } from '../audio/SoundEngine';

interface PulseRadarProps {
  blobs: PulseBlob[];
  contacts?: RadarContact[];
  activePulseRingRadius: number | null;
  highContrast: boolean;
  faction?: 'logigi' | 'lotito';
}

export const PulseRadar: React.FC<PulseRadarProps> = ({
  blobs,
  contacts = [],
  activePulseRingRadius,
  highContrast,
  faction = 'lotito',
}) => {
  const size = 200;
  const radius = size / 2;

  // Sweep angle state (0 to 360 degrees)
  const [sweepAngle, setSweepAngle] = useState(0);
  // Track contact last illuminated timestamp
  const contactHitsRef = useRef<Map<string, number>>(new Map());
  const lastChimeTimeRef = useRef<number>(0);

  // Phosphor colors based on contrast & faction
  const phosphorColor = highContrast
    ? '#f97316' // Vibrant tactical orange
    : faction === 'logigi'
    ? '#fbbf24' // Warm amber phosphor
    : '#22d3ee'; // Cold electric cyan/sonar phosphor

  const phosphorCore = highContrast ? '#ffedd5' : '#ffffff';

  // Sonar Continuous 360° Sweep Loop (3.2 seconds per rotation)
  useEffect(() => {
    let animId: number;
    const SWEEP_PERIOD_MS = 3200;

    const tick = () => {
      const now = performance.now();
      const currentAngle = ((now % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS) * 360;
      setSweepAngle(currentAngle);

      // Check for contacts swept by the beam
      const allTargets: Array<{ id: string; angle: number; distance: number; isHostile?: boolean }> = [
        ...contacts,
        ...blobs.map((b) => ({ id: b.id, angle: b.angle, distance: b.distance, isHostile: true })),
      ];

      for (const target of allTargets) {
        // Normalize angles to 0..360
        const normTargetAngle = ((target.angle % 360) + 360) % 360;
        const diff = Math.abs(currentAngle - normTargetAngle);
        const angularDistance = Math.min(diff, 360 - diff);

        // If sweep beam is passing within 7 degrees of the target
        if (angularDistance < 7) {
          const lastHit = contactHitsRef.current.get(target.id) || 0;
          if (now - lastHit > 2000) {
            contactHitsRef.current.set(target.id, now);

            // Play authentic submarine sonar ping
            if (now - lastChimeTimeRef.current > 400) {
              lastChimeTimeRef.current = now;
              soundEngine.playSubmarineSweepPing(target.isHostile, target.angle);
            }
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [contacts, blobs]);

  // Generate SVG path for the fading phosphor sweep wedge
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const sweepTrailAngle = sweepAngle - 32; // 32-degree fading tail
  const trailRad = (sweepTrailAngle * Math.PI) / 180;
  const sweepR = radius - 6;

  const sweepX = radius + Math.sin(sweepRad) * sweepR;
  const sweepY = radius - Math.cos(sweepRad) * sweepR;
  const trailX = radius + Math.sin(trailRad) * sweepR;
  const trailY = radius - Math.cos(trailRad) * sweepR;

  const wedgePath = `M ${radius} ${radius} L ${trailX} ${trailY} A ${sweepR} ${sweepR} 0 0 1 ${sweepX} ${sweepY} Z`;

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none pointer-events-none"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg className="w-full h-full drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Submarine Sonar CRT Screen Gradient */}
          <radialGradient id="sonarGlass" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#05070a" stopOpacity="0.88" />
            <stop offset="92%" stopColor="#0b131d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020408" stopOpacity="0.99" />
          </radialGradient>

          {/* Sweeping Phosphor Beam Fade Tail */}
          <linearGradient id="beamTrail" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={phosphorColor} stopOpacity="0.0" />
            <stop offset="70%" stopColor={phosphorColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={phosphorColor} stopOpacity="0.28" />
          </linearGradient>

          {/* Blip Glow Filter */}
          <filter id="sonarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer Heavy Submarine Housing Ring */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="url(#sonarGlass)"
          stroke="#1e293b"
          strokeWidth="2.5"
        />
        <circle cx={radius} cy={radius} r={radius - 6} fill="none" stroke="#0f172a" strokeWidth="1" />

        {/* 2. Range Bands (10m, 20m, 30m) */}
        {/* 10m Ring (33%) */}
        <circle
          cx={radius}
          cy={radius}
          r={sweepR * 0.33}
          fill="none"
          stroke="#1e293b"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
        {/* 20m Ring (66%) */}
        <circle
          cx={radius}
          cy={radius}
          r={sweepR * 0.66}
          fill="none"
          stroke="#1e293b"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        {/* 30m Perimeter Ring (100%) */}
        <circle
          cx={radius}
          cy={radius}
          r={sweepR}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* 3. Submarine Compass Radial Ticks every 30 degrees */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const rad = (angle * Math.PI) / 180;
          const isMajor = angle % 90 === 0;
          const len = isMajor ? 8 : 4;
          const x1 = radius + Math.sin(rad) * (sweepR - len);
          const y1 = radius - Math.cos(rad) * (sweepR - len);
          const x2 = radius + Math.sin(rad) * sweepR;
          const y2 = radius - Math.cos(rad) * sweepR;

          return (
            <line
              key={`tick_${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#64748b' : '#334155'}
              strokeWidth={isMajor ? 1.4 : 0.8}
            />
          );
        })}

        {/* 4. Crosshair Reticle Axes */}
        <line x1={radius} y1={6} x2={radius} y2={size - 6} stroke="#0f172a" strokeWidth="1" />
        <line x1={6} y1={radius} x2={size - 6} y2={radius} stroke="#0f172a" strokeWidth="1" />

        {/* 5. Range Labels */}
        <text x={radius + 3} y={radius - sweepR * 0.33 + 3} fill="#475569" fontSize="6.5" fontFamily="monospace">
          10M
        </text>
        <text x={radius + 3} y={radius - sweepR * 0.66 + 3} fill="#475569" fontSize="6.5" fontFamily="monospace">
          20M
        </text>
        <text x={radius + 3} y={radius - sweepR + 8} fill="#64748b" fontSize="6.5" fontFamily="monospace">
          30M
        </text>

        {/* 6. Continuous Sweeping Phosphor Beam Wedge (Trail) */}
        <path d={wedgePath} fill="url(#beamTrail)" />

        {/* Primary High-Intensity Sonar Sweep Needle */}
        <line
          x1={radius}
          y1={radius}
          x2={sweepX}
          y2={sweepY}
          stroke={phosphorColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Active Expanding Sonar Pulse Shockwave (Space trigger) */}
        {activePulseRingRadius !== null && (
          <circle
            cx={radius}
            cy={radius}
            r={(activePulseRingRadius / 30) * sweepR}
            fill="none"
            stroke={phosphorColor}
            strokeWidth="2"
            opacity={Math.max(0, 1 - activePulseRingRadius / 30)}
          />
        )}

        {/* 7. Submarine Contacts & Echo Blips with CRT Phosphor Decay */}
        {(() => {
          const now = performance.now();
          const allTargets: Array<{
            id: string;
            angle: number;
            distance: number;
            isHostile?: boolean;
            isPulseBlob?: boolean;
          }> = [
            ...contacts.map((c) => ({ ...c, isPulseBlob: false })),
            ...blobs.map((b) => ({
              id: b.id,
              angle: b.angle,
              distance: b.distance,
              isHostile: true,
              isPulseBlob: true,
            })),
          ];

          return allTargets.map((target) => {
            const rad = (target.angle * Math.PI) / 180;
            // Map 0 to 30 meters to 0 to sweepR
            const distFraction = Math.min(1, Math.max(0.12, target.distance / 30));
            const distPx = distFraction * sweepR;

            const px = radius + Math.sin(rad) * distPx;
            const py = radius - Math.cos(rad) * distPx;

            // Calculate phosphor persistence opacity based on when the sweep beam touched it
            const lastHit = contactHitsRef.current.get(target.id) || 0;
            const timeSinceHit = now - lastHit;

            // Active pulse lights up all blips immediately
            const hasActivePulse = activePulseRingRadius !== null;
            let opacity = 0.2; // faint ambient detection

            if (hasActivePulse) {
              opacity = 0.95;
            } else if (lastHit > 0 && timeSinceHit < 3200) {
              // Smooth exponential CRT phosphor persistence decay
              opacity = Math.max(0.15, Math.pow(1 - timeSinceHit / 3200, 1.6) * 0.95);
            }

            const blipColor = target.isHostile ? '#ef4444' : phosphorColor;

            return (
              <g key={`blip_${target.id}`} opacity={opacity} filter="url(#sonarGlow)">
                {/* Outer illuminated phosphor halo */}
                <circle cx={px} cy={py} r="6" fill={blipColor} opacity="0.35" />
                {/* Secondary bloom ring */}
                <circle cx={px} cy={py} r="3.5" fill={blipColor} opacity="0.7" />
                {/* Hot white core */}
                <circle cx={px} cy={py} r="1.8" fill={phosphorCore} />
              </g>
            );
          });
        })()}

        {/* 8. Submarine Center Vessel Indicator (Blind Sniper position) */}
        <circle cx={radius} cy={radius} r="4" fill="#0f172a" stroke={phosphorColor} strokeWidth="1" />
        <circle cx={radius} cy={radius} r="2" fill="#ffffff" />
      </svg>

      {/* Submarine Sonar Label */}
      <div className="absolute bottom-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-zinc-800/80 text-[7.5px] font-mono text-zinc-400 uppercase tracking-widest pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>SONAR SWEEP // 30M</span>
      </div>
    </div>
  );
};
