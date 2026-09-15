/**
 * Shadow Shot - Mobile Landscape Enforcer & Orientation Lock
 * Guarantees the game runs in landscape orientation on mobile phones.
 * Automatically locks via Screen Orientation API and displays a tactical
 * rotation overlay when held in portrait orientation.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Smartphone, RotateCw, ShieldAlert } from 'lucide-react';

export const LandscapeEnforcer: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  const checkOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobile = mobileRegex.test(userAgent) || (window.innerWidth <= 1024 && window.innerHeight <= 1024);
    setIsMobileDevice(isMobile);

    const portrait = window.innerHeight > window.innerWidth;
    setIsPortrait(isMobile && portrait);
  }, []);

  const attemptLandscapeLock = useCallback(async () => {
    try {
      // Screen Orientation API
      if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch {
      // Ignored: browser may require full-screen first or user preference
    }

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Initial attempt to lock on user interaction anywhere on the window
    const handleFirstGesture = () => {
      attemptLandscapeLock();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, [checkOrientation, attemptLandscapeLock]);

  if (!isPortrait) return null;

  return (
    <div
      id="landscape-enforcer-modal"
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative w-28 h-28 flex items-center justify-center mb-6">
        {/* Radar concentric rings */}
        <div className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-sky-500/40" />

        {/* Animated rotating device graphic */}
        <div className="relative transform transition-transform duration-700 ease-in-out animate-bounce">
          <Smartphone className="w-14 h-14 text-sky-400 rotate-90" />
          <RotateCw className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-spin" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-mono mb-3">
        <ShieldAlert className="w-4 h-4" />
        <span>ORIENTATION LOCKED</span>
      </div>

      <h2 className="text-xl md:text-2xl font-black tracking-widest text-zinc-100 uppercase font-mono mb-2">
        ROTATE DEVICE TO LANDSCAPE
      </h2>

      <p className="text-zinc-400 text-xs md:text-sm max-w-sm mb-6 leading-relaxed">
        Shadow Shot requires tactical widescreen landscape orientation for acoustic triangulation,
        peripheral echolocation, and sniper optic sight alignment.
      </p>

      <button
        onClick={attemptLandscapeLock}
        className="px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-95 transition-all"
      >
        Lock to Landscape & Enter Fullscreen
      </button>
    </div>
  );
};
