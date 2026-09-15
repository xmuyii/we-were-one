/**
 * Shadow Shot - Call of Duty Style Military Sniper ADS Scope
 * Full-screen optical overlay with complete black peripheral mask,
 * authentic circular glass lens, precision Mil-Dot duplex reticle,
 * snappy quickscope zoom easing, natural figure-8 breathing sway,
 * hold-breath stabilization, and realistic recoil recovery.
 */

import React, { useEffect, useState, useRef } from 'react';
import { FactionType } from '../types';

interface CodSniperScopeProps {
  isAiming: boolean;
  isHoldingBreath: boolean;
  stamina: number;
  faction: FactionType;
  targetInSights?: boolean;
  lastShotTime?: number;
  recoilKick?: boolean;
}

export const CodSniperScope: React.FC<CodSniperScopeProps> = ({
  isAiming,
  isHoldingBreath,
  stamina,
  faction,
  targetInSights = false,
  lastShotTime = 0,
}) => {
  // Viewport dimensions
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  // Breathing sway offsets (natural drift when not holding breath)
  const [sway, setSway] = useState({ x: 0, y: 0 });
  const swayRef = useRef({ time: 0 });

  // Recoil kick state
  const [recoilY, setRecoilY] = useState(0);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recoil kick response when firing
  useEffect(() => {
    if (!isAiming) return;
    const now = Date.now();
    if (now - lastShotTime < 280) {
      setRecoilY(-24); // Sharp vertical muzzle rise
      const timeout = setTimeout(() => {
        setRecoilY(0);
      }, 240);
      return () => clearTimeout(timeout);
    }
  }, [lastShotTime, isAiming]);

  // Breathing sway loop: natural figure-8 drift
  useEffect(() => {
    if (!isAiming) {
      setSway({ x: 0, y: 0 });
      return;
    }

    let animId: number;
    const updateSway = () => {
      swayRef.current.time += 0.035;
      const t = swayRef.current.time;

      if (isHoldingBreath) {
        // Breath held: scope stabilizes dead rock-steady
        setSway((prev) => ({
          x: prev.x * 0.85,
          y: prev.y * 0.85,
        }));
      } else {
        // Natural figure-8 drift
        const targetX = Math.sin(t * 1.2) * 4.5;
        const targetY = Math.cos(t * 2.4) * 3.5;
        setSway((prev) => ({
          x: prev.x + (targetX - prev.x) * 0.1,
          y: prev.y + (targetY - prev.y) * 0.1,
        }));
      }
      animId = requestAnimationFrame(updateSway);
    };

    animId = requestAnimationFrame(updateSway);
    return () => cancelAnimationFrame(animId);
  }, [isAiming, isHoldingBreath]);

  if (!isAiming) return null;

  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;
  // Circular optical aperture radius (covers ~82% of shortest screen dimension)
  const radius = Math.min(width, height) * 0.41;

  const isLogigi = faction === 'logigi';
  const illumColor = isLogigi ? '#f59e0b' : '#38bdf8'; // Warm Solar Amber vs Cold Ion Cyan
  const illumDot = targetInSights ? '#ef4444' : isLogigi ? '#fbbf24' : '#7dd3fc';

  // Path definition: Fullscreen rectangle with centered circular cutout (evenodd mask)
  const outerBox = `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`;
  const circleCutout = `M ${cx},${cy} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0 Z`;
  const fullMaskPath = `${outerBox} ${circleCutout}`;

  return (
    <div
      id="cod-sniper-ads"
      className="fixed inset-0 w-screen h-screen z-50 pointer-events-none select-none overflow-hidden"
      style={{
        transform: `translate(${sway.x}px, ${sway.y + recoilY}px)`,
        transition: 'transform 0.08s ease-out',
      }}
    >
      <svg
        className="w-full h-full block"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Beveled Heavy Scope Housing Rim Gradient */}
          <radialGradient id="scopeRimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="92%" stopColor="#050507" />
            <stop offset="96%" stopColor="#1e1e24" />
            <stop offset="99%" stopColor="#2c2c34" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>

          {/* Optical Glass Multi-Coating Anti-Reflective Sheen */}
          <radialGradient
            id="lensGlassSheen"
            cx="48%"
            cy="45%"
            r="52%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(0,0,0,0.0)" />
            <stop
              offset="75%"
              stopColor={isLogigi ? 'rgba(245, 158, 11, 0.03)' : 'rgba(56, 189, 248, 0.03)'}
            />
            <stop
              offset="90%"
              stopColor={isLogigi ? 'rgba(217, 119, 6, 0.08)' : 'rgba(14, 165, 233, 0.08)'}
            />
            <stop offset="97%" stopColor="rgba(0, 0, 0, 0.45)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
          </radialGradient>

          {/* Exit Pupil Eye Relief Shadow (Blur at glass boundary) */}
          <radialGradient
            id="eyeReliefShadow"
            cx="50%"
            cy="50%"
            r="50%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="78%" stopColor="transparent" />
            <stop offset="94%" stopColor="rgba(0,0,0,0.65)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.98)" />
          </radialGradient>

          {/* Target in sights tactile pulse halo */}
          <radialGradient
            id="targetLockHalo"
            cx="50%"
            cy="50%"
            r="50%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="70%" stopColor="transparent" />
            <stop offset="96%" stopColor={illumColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={illumColor} stopOpacity="0.7" />
          </radialGradient>
        </defs>

        {/* ============================================================ */}
        {/* 1. SOLID PITCH-BLACK SCREEN WITH CIRCULAR LENS CUTOUT        */}
        {/* ============================================================ */}
        <path
          d={fullMaskPath}
          fill="#000000"
          fillRule="evenodd"
        />

        {/* ============================================================ */}
        {/* 2. CIRCULAR OPTICAL LENS GLASS & EYE-RELIEF SHADOW           */}
        {/* ============================================================ */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="url(#lensGlassSheen)"
        />

        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="url(#eyeReliefShadow)"
        />

        {targetInSights && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="url(#targetLockHalo)"
            className="animate-pulse"
          />
        )}

        {/* Heavy Mechanical Scope Rim & Chamfer */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#09090b"
          strokeWidth="6"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius - 2}
          fill="none"
          stroke="#27272a"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Knurled Adjustment Ring Teeth along the scope circumference */}
        {Array.from({ length: 64 }).map((_, i) => {
          const angle = (i * 360) / 64;
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + Math.sin(rad) * (radius - 1);
          const y1 = cy - Math.cos(rad) * (radius - 1);
          const x2 = cx + Math.sin(rad) * (radius + 4);
          const y2 = cy - Math.cos(rad) * (radius + 4);
          return (
            <line
              key={`knurl_${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#18181b"
              strokeWidth="2"
            />
          );
        })}

        {/* ============================================================ */}
        {/* 3. CALL OF DUTY AUTHENTIC DUPLEX MIL-DOT CROSSHAIR           */}
        {/* ============================================================ */}

        {/* Outer Heavy Posts (Tapered thick black bars) */}
        {/* Left Post */}
        <line
          x1={cx - radius + 2}
          y1={cy}
          x2={cx - 50}
          y2={cy}
          stroke="#050505"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Right Post */}
        <line
          x1={cx + 50}
          y1={cy}
          x2={cx + radius - 2}
          y2={cy}
          stroke="#050505"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Top Post */}
        <line
          x1={cx}
          y1={cy - radius + 2}
          x2={cx}
          y2={cy - 50}
          stroke="#050505"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Bottom Post */}
        <line
          x1={cx}
          y1={cy + 50}
          x2={cx}
          y2={cy + radius - 2}
          stroke="#050505"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Razor-Sharp Hairline Crossbars (Intersecting in center) */}
        {/* Horizontal Hairline */}
        <line
          x1={cx - 60}
          y1={cy}
          x2={cx + 60}
          y2={cy}
          stroke="#000000"
          strokeWidth="1.2"
        />
        {/* Vertical Hairline */}
        <line
          x1={cx}
          y1={cy - 60}
          x2={cx}
          y2={cy + 60}
          stroke="#000000"
          strokeWidth="1.2"
        />

        {/* Precision Mil-Dot Hash Marks (Elevation Drop Compensation) */}
        {/* Downwards elevation hashes: 1, 2, 3, 4 */}
        {[14, 28, 42, 56, 75, 95].map((offset, idx) => (
          <g key={`elev_${idx}`}>
            <line
              x1={cx - (idx % 2 === 0 ? 6 : 4)}
              y1={cy + offset}
              x2={cx + (idx % 2 === 0 ? 6 : 4)}
              y2={cy + offset}
              stroke="#000000"
              strokeWidth="1.2"
            />
            {idx < 4 && (
              <text
                x={cx + 9}
                y={cy + offset + 3}
                fill="#27272a"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            )}
          </g>
        ))}

        {/* Upwards elevation small hashes */}
        {[14, 28, 42].map((offset, idx) => (
          <line
            key={`elev_up_${idx}`}
            x1={cx - 4}
            y1={cy - offset}
            x2={cx + 4}
            y2={cy - offset}
            stroke="#000000"
            strokeWidth="1.2"
          />
        ))}

        {/* Horizontal Windage Lead Hashes (Left & Right) */}
        {[-45, -30, -15, 15, 30, 45].map((offset, idx) => (
          <line
            key={`wind_${idx}`}
            x1={cx + offset}
            y1={cy - 4}
            x2={cx + offset}
            y2={cy + 4}
            stroke="#000000"
            strokeWidth="1.2"
          />
        ))}

        {/* Lower-Left Rangefinder Bracket Stadia (COD Style) */}
        <g opacity="0.75">
          <path
            d={`M ${cx - 120},${cy + 80} Q ${cx - 60},${cy + 95} ${cx - 20},${cy + 105}`}
            fill="none"
            stroke="#000000"
            strokeWidth="1"
          />
          <line
            x1={cx - 120}
            y1={cy + 75}
            x2={cx - 120}
            y2={cy + 85}
            stroke="#000000"
            strokeWidth="1"
          />
          <line
            x1={cx - 70}
            y1={cy + 85}
            x2={cx - 70}
            y2={cy + 95}
            stroke="#000000"
            strokeWidth="1"
          />
          <text
            x={cx - 122}
            y={cy + 70}
            fill="#27272a"
            fontSize="7"
            fontFamily="monospace"
          >
            400M
          </text>
          <text
            x={cx - 72}
            y={cy + 80}
            fill="#27272a"
            fontSize="7"
            fontFamily="monospace"
          >
            200M
          </text>
        </g>

        {/* Precision Center Point of Aim (Pinpoint micro-dot for quickscoping) */}
        <circle
          cx={cx}
          cy={cy}
          r="1.4"
          fill={illumDot}
          stroke="#000000"
          strokeWidth="0.6"
        />

        {/* Rangefinder & Mil Spec Telemetry in Lower Right Inside Glass */}
        <text
          x={cx + 50}
          y={cy + 95}
          fill="#3f3f46"
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="1"
        >
          MIL-DOT // 10X
        </text>
        <text
          x={cx + 50}
          y={cy + 106}
          fill="#52525b"
          fontSize="7"
          fontFamily="monospace"
        >
          {targetInSights ? 'CONTACT LOCK' : 'OPTIC STABLE'}
        </text>
      </svg>

      {/* ============================================================ */}
      {/* 4. TACTICAL HUD OVERLAYS WITHIN SCOPE SHADOW                  */}
      {/* ============================================================ */}

      {/* Quickscope Center Lock Indicator */}
      {targetInSights && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 font-mono text-[11px] font-bold tracking-widest animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]">
          TARGET ALIGNED // FIRE
        </div>
      )}

      {/* Hold Breath & Steady Meter (Bottom Center) */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/90 border border-zinc-800 text-[10px] font-mono shadow-2xl">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isHoldingBreath ? 'bg-sky-400 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <span className={isHoldingBreath ? 'text-sky-300 font-bold' : 'text-zinc-400'}>
            {isHoldingBreath ? 'STEADY // BREATH HELD' : 'HOLD SHIFT / CTRL TO HOLD BREATH'}
          </span>
        </span>
        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isHoldingBreath ? 'bg-sky-400' : 'bg-zinc-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, stamina))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
