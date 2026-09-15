/**
 * Shadow Shot - Complete In-Game Mobile Touch Controls
 * Features:
 * - Virtual Analog Joystick with directional thumbstick displacement for movement (WASD)
 * - Swipe gesture zone for aiming & yaw rotation
 * - Customizable button positions matching the player's saved layout
 * - Tactile color-coded visual cues (Fire, ADS Scope, Pulse, Crouch, Reload, Melee, Flare, Ability)
 * - Optional haptic vibration feedback on tap
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  MobileControlsConfig,
  ControlPosition,
  DEFAULT_MOBILE_CONTROLS,
  AccessibilitySettings,
  ClientGameState,
} from '../types';
import {
  Crosshair,
  Radio,
  RotateCcw,
  Shield,
  Eye,
  Zap,
  Flame,
  Sparkles,
  Move,
  Check,
} from 'lucide-react';

interface TouchControlsProps {
  gameState: ClientGameState;
  settings: AccessibilitySettings;
  onMoveChange: (dx: number, dy: number, isSprint: boolean) => void;
  onLookDelta: (deltaYaw: number) => void;
  onFire: () => void;
  onToggleADS: () => void;
  onPulse: () => void;
  onToggleCrouch: () => void;
  onReload: () => void;
  onMelee: () => void;
  onThrowFlare: () => void;
  onActivateAbility: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  gameState,
  settings,
  onMoveChange,
  onLookDelta,
  onFire,
  onToggleADS,
  onPulse,
  onToggleCrouch,
  onReload,
  onMelee,
  onThrowFlare,
  onActivateAbility,
}) => {
  const config: MobileControlsConfig = settings.mobileControls || DEFAULT_MOBILE_CONTROLS;
  const scale = config.buttonScale || 1.0;
  const opacity = config.buttonOpacity || 0.85;

  // Joystick state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Look / Aim swipe state
  const lastLookTouchRef = useRef<{ x: number; id: number } | null>(null);

  const triggerHaptic = (ms: number = 20) => {
    if (settings.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch || !joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    joystickTouchIdRef.current = touch.identifier;
    joystickOriginRef.current = { x: centerX, y: centerY };
    setJoystickActive(true);
    triggerHaptic(15);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickOriginRef.current.x;
        const dy = touch.clientY - joystickOriginRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 42 * scale;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;

        setStickOffset({ x: stickX, y: stickY });

        // Normalize movement (-1 to 1)
        const normX = stickX / maxDist;
        const normY = stickY / maxDist;
        const isSprint = clampedDist > maxDist * 0.85;

        onMoveChange(normX, normY, isSprint);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setStickOffset({ x: 0, y: 0 });
        onMoveChange(0, 0, false);
        break;
      }
    }
  };

  // Swipe-to-aim touch handlers on full-screen container
  const handleAimTouchStart = (e: React.TouchEvent) => {
    // Only capture if not touching joystick
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchIdRef.current && !lastLookTouchRef.current) {
        lastLookTouchRef.current = { x: touch.clientX, id: touch.identifier };
        break;
      }
    }
  };

  const handleAimTouchMove = (e: React.TouchEvent) => {
    if (!lastLookTouchRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lastLookTouchRef.current.id) {
        const dx = touch.clientX - lastLookTouchRef.current.x;
        // Sensitivity scaling
        const sens = settings.mouseSensitivity || 0.003;
        onLookDelta(dx * sens * 1.6);
        lastLookTouchRef.current.x = touch.clientX;
        break;
      }
    }
  };

  const handleAimTouchEnd = (e: React.TouchEvent) => {
    if (!lastLookTouchRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lastLookTouchRef.current.id) {
        lastLookTouchRef.current = null;
        break;
      }
    }
  };

  // Helper to render positioned circular button
  const renderButton = (
    pos: ControlPosition,
    defaultSize: number,
    colorClasses: string,
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    badge?: string,
    isActive?: boolean
  ) => {
    const size = Math.round((pos.size || defaultSize) * scale);

    return (
      <button
        type="button"
        onTouchStart={(e) => {
          e.stopPropagation();
          triggerHaptic(20);
          onClick();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`absolute rounded-full flex flex-col items-center justify-center font-mono select-none transition-transform active:scale-90 shadow-2xl border-2 ${colorClasses} ${
          isActive ? 'ring-4 ring-white/60 scale-105' : ''
        }`}
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          width: `${size}px`,
          height: `${size}px`,
          transform: 'translate(-50%, -50%)',
          opacity,
          touchAction: 'manipulation',
        }}
      >
        <div className="flex items-center justify-center">{icon}</div>
        <span className="text-[9px] font-extrabold tracking-wider leading-none mt-0.5 uppercase pointer-events-none">
          {label}
        </span>
        {badge && (
          <span className="absolute -top-1 -right-1 bg-black/90 border border-zinc-700 px-1.5 py-0.2 rounded-full text-[8px] font-bold text-amber-300 pointer-events-none">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      id="mobile-touch-layer"
      onTouchStart={handleAimTouchStart}
      onTouchMove={handleAimTouchMove}
      onTouchEnd={handleAimTouchEnd}
      onTouchCancel={handleAimTouchEnd}
      className="absolute inset-0 z-30 pointer-events-auto touch-none select-none"
    >
      {/* 1. Virtual Movement Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        className="absolute rounded-full border-2 border-zinc-700/80 bg-black/50 backdrop-blur-xs flex items-center justify-center pointer-events-auto shadow-2xl"
        style={{
          left: `${config.joystickPos.x}%`,
          top: `${config.joystickPos.y}%`,
          width: `${Math.round(110 * scale)}px`,
          height: `${Math.round(110 * scale)}px`,
          transform: 'translate(-50%, -50%)',
          opacity,
        }}
      >
        {/* Direction Cross Markings */}
        <div className="absolute top-1 text-[8px] font-mono font-bold text-zinc-500 pointer-events-none">
          ▲ W
        </div>
        <div className="absolute bottom-1 text-[8px] font-mono font-bold text-zinc-500 pointer-events-none">
          ▼ S
        </div>
        <div className="absolute left-1 text-[8px] font-mono font-bold text-zinc-500 pointer-events-none">
          ◄ A
        </div>
        <div className="absolute right-1 text-[8px] font-mono font-bold text-zinc-500 pointer-events-none">
          D ►
        </div>

        {/* Movable Inner Thumb Nub */}
        <div
          className={`w-12 h-12 rounded-full border-2 transition-colors flex items-center justify-center pointer-events-none shadow-md ${
            joystickActive
              ? 'bg-amber-500 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
              : 'bg-zinc-800/90 border-zinc-500'
          }`}
          style={{
            transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
          }}
        >
          <Move className={`w-4 h-4 ${joystickActive ? 'text-black' : 'text-zinc-400'}`} />
        </div>
      </div>

      {/* 2. Tactical Action Buttons */}

      {/* FIRE: Large, Glowing Rose / Red trigger */}
      {renderButton(
        config.firePos,
        76,
        'bg-rose-950/95 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.5)] active:bg-rose-900',
        onFire,
        <Crosshair className="w-6 h-6 text-rose-300" />,
        'FIRE',
        `${gameState.ammoMag}/${gameState.ammoReserve}`
      )}

      {/* ADS / STEADY SCOPE: Amber / Gold */}
      {renderButton(
        config.adsPos,
        64,
        'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.4)] active:bg-amber-900',
        onToggleADS,
        <Eye className="w-5 h-5 text-amber-300" />,
        gameState.isAimingSteady ? 'EXIT ADS' : 'ADS SCOPE',
        undefined,
        gameState.isAimingSteady
      )}

      {/* PULSE: Cyan Sonar Wave */}
      {renderButton(
        config.pulsePos,
        66,
        gameState.pulseCooldownRemaining <= 0
          ? 'bg-sky-950/95 border-sky-400 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.5)] active:bg-sky-900'
          : 'bg-zinc-900/80 border-zinc-700 text-zinc-500 opacity-60',
        onPulse,
        <Radio className="w-5 h-5 text-sky-300" />,
        gameState.pulseCooldownRemaining <= 0
          ? 'PULSE'
          : `${gameState.pulseCooldownRemaining.toFixed(1)}s`
      )}

      {/* CROUCH STEALTH */}
      {renderButton(
        config.crouchPos,
        54,
        gameState.isCrouching
          ? 'bg-amber-900/90 border-amber-500 text-amber-200'
          : 'bg-zinc-900/90 border-zinc-700 text-zinc-300',
        onToggleCrouch,
        <Shield className="w-4 h-4" />,
        gameState.isCrouching ? 'CROUCHED' : 'CROUCH'
      )}

      {/* RELOAD */}
      {renderButton(
        config.reloadPos,
        54,
        'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-md',
        onReload,
        <RotateCcw className="w-4 h-4 text-emerald-400" />,
        'RELOAD'
      )}

      {/* MELEE KNIFE */}
      {renderButton(
        config.meleePos,
        50,
        'bg-red-950/90 border-red-600 text-red-200',
        onMelee,
        <Zap className="w-4 h-4 text-red-400" />,
        'KNIFE'
      )}

      {/* FLARE */}
      {gameState.flaresAvailable > 0 &&
        renderButton(
          config.flarePos,
          50,
          'bg-amber-950/90 border-amber-600 text-amber-300',
          onThrowFlare,
          <Flame className="w-4 h-4 text-amber-400" />,
          'FLARE',
          `${gameState.flaresAvailable}`
        )}

      {/* ABILITY (Illuminate / Veil) */}
      {renderButton(
        config.abilityPos,
        50,
        'bg-indigo-950/90 border-indigo-500 text-indigo-200',
        onActivateAbility,
        <Sparkles className="w-4 h-4 text-indigo-400" />,
        gameState.faction === 'logigi' ? 'ILLUM' : 'VEIL'
      )}
    </div>
  );
};
