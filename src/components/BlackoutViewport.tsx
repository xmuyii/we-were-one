/**
 * Shadow Shot - Blackout Viewport
 * The screen renders NO environment. Pure darkness with optical feedback layers.
 * Strict adherence to NO CROSSHAIR / NO RETICLE DOT.
 */

import React, { useMemo } from 'react';
import { ClientGameState, SubtitleCue, DirectionalGlow, AccessibilitySettings } from '../types';

interface BlackoutViewportProps {
  gameState: ClientGameState;
  subtitleCues: SubtitleCue[];
  directionalGlows: DirectionalGlow[];
  settings: AccessibilitySettings;
  yaw: number;
}

export const BlackoutViewport: React.FC<BlackoutViewportProps> = ({
  gameState,
  subtitleCues,
  directionalGlows,
  settings,
  yaw,
}) => {
  const now = Date.now();
  const isStormFlash = now - gameState.lastLightningTime < 200;
  const isHitMarker = now - gameState.lastHitTime < 250;
  const isDamage = gameState.health < 40 || now - gameState.lastDamageTime < 400;

  // Weather vignette color styling
  const weatherStyle = useMemo(() => {
    switch (gameState.weather) {
      case 'wind':
        return 'rgba(74, 90, 80, 0.08)';
      case 'rain':
        return 'rgba(60, 80, 110, 0.09)';
      case 'storm':
        return 'rgba(70, 75, 120, 0.12)';
      case 'fog':
        return 'rgba(180, 185, 195, 0.08)';
      case 'snow':
        return 'rgba(210, 230, 255, 0.07)';
      case 'heat':
        return 'rgba(180, 90, 30, 0.07)';
      case 'cold':
        return 'rgba(40, 120, 200, 0.08)';
      default:
        return 'transparent';
    }
  }, [gameState.weather]);

  // Colorblind mode color selection
  const pulseColor = settings.colorblindPulse ? '#f97316' : '#38bdf8'; // orange vs sky-blue

  return (
    <div
      id="shadow-shot-viewport"
      className="relative w-full h-full bg-black overflow-hidden select-none cursor-crosshair"
    >
      {/* 1. Base Darkness Canvas */}
      <div className="absolute inset-0 bg-black pointer-events-none" />

      {/* 2. Dynamic Weather Ambient Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-1000"
        style={{
          boxShadow: `inset 0 0 120px ${weatherStyle}`,
        }}
      />

      {/* 3. Storm Lightning Flash (0.2s silhouette flash) */}
      {isStormFlash && (
        <div className="absolute inset-0 bg-zinc-200/90 pointer-events-none transition-opacity duration-75 flex items-center justify-center">
          {/* Lightning Silhouettes of nearby players within 40m */}
          {gameState.lightningSilhouettes.map((sil, i) => {
            const angleRad = (sil.angle * Math.PI) / 180;
            const xPercent = 50 + Math.sin(angleRad) * (sil.distance / 40) * 40;
            const yPercent = 50 - Math.cos(angleRad) * (sil.distance / 40) * 40;
            return (
              <div
                key={`sil_${i}`}
                className="absolute w-4 h-12 bg-black rounded-full blur-[1px] transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* 4. "LET THERE BE LIGHT" Detonation / Light Bomb Blinding Flash (5s total) */}
      {gameState.isBlindedByLight && (
        <div
          className="absolute inset-0 pointer-events-none bg-white transition-opacity duration-300 z-10 flex items-center justify-center"
          style={{
            opacity: Math.min(1, gameState.blindnessRemaining / 4),
          }}
        >
          {/* Silhouettes visible during detonation window */}
          {gameState.seeSilhouettesRemaining > 0 &&
            gameState.players
              .filter((p) => !p.isSelf && p.isAlive)
              .map((p, idx) => {
                const seedX = 30 + (idx * 20) % 50;
                const seedY = 40 + (idx * 15) % 30;
                return (
                  <div
                    key={`blind_sil_${p.id}`}
                    className="absolute w-5 h-16 bg-black rounded-full blur-[1px] transform -translate-x-1/2 -translate-y-1/2 shadow-2xl"
                    style={{ left: `${seedX}%`, top: `${seedY}%` }}
                  />
                );
              })}
        </div>
      )}

      {/* 5. Active Light Sources in Darkness (Flares, Glow Sticks) */}
      {gameState.activeLightSources.map((ls) => {
        // Render soft illuminating glow pool
        const isFlare = ls.type === 'flare';
        return (
          <div
            key={ls.id}
            className="absolute pointer-events-none rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: '50%',
              top: '50%',
              width: `${ls.radius * 16}px`,
              height: `${ls.radius * 16}px`,
              backgroundColor: isFlare ? 'rgba(245, 158, 11, 0.18)' : 'rgba(52, 211, 153, 0.12)',
              opacity: ls.intensity,
            }}
          />
        );
      })}

      {/* 6. Warm Vignette (Proximity Alert: Someone is within 1.5m!) */}
      {gameState.warmVignette && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            boxShadow: 'inset 0 0 80px rgba(249, 115, 22, 0.35)',
          }}
        />
      )}

      {/* 7. Shared Heartbeat Vignette (<=10m and both still) */}
      {gameState.sharedHeartbeat && (
        <div
          className="absolute inset-0 pointer-events-none animate-ping"
          style={{
            boxShadow: 'inset 0 0 100px rgba(225, 29, 72, 0.25)',
            animationDuration: '0.6s',
          }}
        />
      )}

      {/* 8. Damage Red Vignette */}
      {isDamage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.45)',
          }}
        />
      )}

      {/* 9. Stamina Fog (Misty edges when out of breath) */}
      {gameState.stamina < 30 && (
        <div
          className="absolute inset-0 pointer-events-none backdrop-blur-[1px] transition-opacity duration-500"
          style={{
            opacity: (30 - gameState.stamina) / 30,
            boxShadow: 'inset 0 0 90px rgba(161, 161, 170, 0.25)',
          }}
        />
      )}

      {/* 10. Directional Audio Glow (Visual cues for deaf/hard-of-hearing or subtle glow) */}
      {settings.visualAudioCues &&
        directionalGlows.map((glow) => {
          const rad = (glow.angle * Math.PI) / 180;
          const leftPercent = 50 + Math.sin(rad) * 48;
          const topPercent = 50 - Math.cos(rad) * 48;

          return (
            <div
              key={glow.id}
              className="absolute pointer-events-none rounded-full blur-xl transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: '140px',
                height: '140px',
                backgroundColor: glow.type === 'threat' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.22)',
                opacity: glow.intensity,
              }}
            />
          );
        })}

      {/* 11. Peripheral Awareness Ring (Casual mode optional, disabled in ranked) */}
      {settings.awarenessRing && gameState.mode !== 'ranked' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-[82vw] h-[82vw] max-w-[620px] max-h-[620px] rounded-full border border-zinc-800/40 opacity-40"
            style={{
              boxShadow: gameState.warmVignette ? '0 0 20px rgba(249, 115, 22, 0.4)' : 'none',
            }}
          />
        </div>
      )}

      {/* 12. Sonar Pulse Ring (Expanding wave from center) */}
      {gameState.activePulseRingRadius !== null && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2"
            style={{
              width: `${(gameState.activePulseRingRadius / 25) * 85}vmin`,
              height: `${(gameState.activePulseRingRadius / 25) * 85}vmin`,
              borderColor: pulseColor,
              boxShadow: `0 0 25px ${pulseColor}`,
              opacity: 1 - gameState.activePulseRingRadius / 25,
            }}
          />
        </div>
      )}

      {/* 13. Pulse Blobs (Fuzzy smudges quantized into 16 slices and 4 bands) */}
      {gameState.activeBlobs.map((blob) => {
        // Quantized angle relative to screen center
        const rad = (blob.angle * Math.PI) / 180;
        // Distance bands: near (15%), mid (30%), far (42%), edge (52%)
        let rPercent = 16;
        if (blob.band === 'mid') rPercent = 30;
        else if (blob.band === 'far') rPercent = 42;
        else if (blob.band === 'edge') rPercent = 52;

        const xPos = 50 + Math.sin(rad) * rPercent;
        const yPos = 50 - Math.cos(rad) * rPercent;

        return (
          <div
            key={blob.id}
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{
              left: `${xPos}%`,
              top: `${yPos}%`,
            }}
          >
            {/* Fuzzy glowing smudge */}
            <div
              className="rounded-full blur-md"
              style={{
                width: blob.size === 'human' ? '28px' : '16px',
                height: blob.size === 'human' ? '40px' : '16px',
                backgroundColor: pulseColor,
                opacity: 0.85,
                boxShadow: `0 0 16px ${pulseColor}`,
              }}
            />
          </div>
        );
      })}

      {/* NO CROSSHAIR / NO RETICLE DOT - STRICT DESIGN INTEGRITY (§11) */}

      {/* 14. Hit Marker (Sharp White X on Kill Confirm - 0.2s) */}
      {isHitMarker && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white stroke-current stroke-[3] drop-shadow-[0_0_10px_#ffffff]"
            viewBox="0 0 24 24"
          >
            <line x1="4" y1="4" x2="20" y2="20" />
            <line x1="20" y1="4" x2="4" y2="20" />
          </svg>
        </div>
      )}

      {/* 15. Subtitles for Deaf / Hard-of-Hearing Accessibility */}
      {settings.visualAudioCues && subtitleCues.length > 0 && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-20">
          {subtitleCues.map((cue) => (
            <div
              key={cue.id}
              className="px-3 py-1 rounded bg-black/85 border border-zinc-700/60 text-xs font-mono tracking-wide text-zinc-300 shadow-md backdrop-blur-sm"
            >
              {cue.text}
            </div>
          ))}
        </div>
      )}

      {/* 16. Footstep Ripple (Subtle ripple at bottom when moving) */}
      {gameState.movementMode !== 'still' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="w-16 h-1 bg-zinc-700/40 rounded-full blur-[1px] animate-pulse" />
        </div>
      )}
    </div>
  );
};
