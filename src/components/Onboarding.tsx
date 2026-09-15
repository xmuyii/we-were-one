/**
 * Shadow Shot - Audio-First Onboarding Tutorial
 * "You are blind. Listen."
 */

import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../audio/SoundEngine';
import { Radio, Volume2, Shield, Crosshair, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<number>(1);
  const [instruction, setInstruction] = useState<string>('Listen carefully. Sound is your only sight.');
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [targetAngle, setTargetAngle] = useState<number>(90); // NPC angle in deg
  const [isCentered, setIsCentered] = useState<boolean>(false);
  const [hasPulsed, setHasPulsed] = useState<boolean>(false);
  const [pulseBlobs, setPulseBlobs] = useState<{ angle: number; band: string }[]>([]);
  const [testTimer, setTestTimer] = useState<number>(30);
  const [botAlive, setBotAlive] = useState<boolean>(true);
  const [showHitConfirm, setShowHitConfirm] = useState<boolean>(false);

  const audioLoopRef = useRef<number | null>(null);

  // Step 1: Circling NPC footsteps
  useEffect(() => {
    if (step === 1) {
      setInstruction('Lesson 1: Binaural Orientation. An unseen shadow circles you. Turn your view until the footsteps are centered in front of you.');
      soundEngine.speakGuide('An unseen shadow circles you. Turn your view until the footsteps are centered.');

      let currentAngle = 90;
      const interval = window.setInterval(() => {
        currentAngle = (currentAngle + 15) % 360;
        setTargetAngle(currentAngle);

        const rad = (currentAngle * Math.PI) / 180;
        const x = Math.sin(rad) * 8;
        const z = Math.cos(rad) * 8;
        soundEngine.playFootstep(x, z, 'wood', false, false);

        // Check if player has aligned their yaw within 25 degrees
        const diff = Math.abs(((playerYaw * 180) / Math.PI - currentAngle + 540) % 360 - 180);
        if (diff < 25) {
          setIsCentered(true);
        } else {
          setIsCentered(false);
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [step, playerYaw]);

  // Step 2: Pulse Training
  useEffect(() => {
    if (step === 2) {
      setInstruction('Lesson 2: The Pulse. Press [SPACE] or tap PULSE to emit an echolocation sonar ring. Listen for the returning echo and read the fuzzy blob.');
      soundEngine.speakGuide('Press Space or tap Pulse to emit a sonar wave. Listen for the returning echo.');
    }
  }, [step]);

  // Step 3: First Shot
  useEffect(() => {
    if (step === 3) {
      setInstruction('Lesson 3: The Sniper. Center your crosshair on the echo. Left Click or tap FIRE to fire. One shot is lethal.');
      soundEngine.speakGuide('Center your weapon on the echo and fire.');
    }
  }, [step]);

  // Step 4: Stealth & Breathing
  useEffect(() => {
    if (step === 4) {
      setInstruction('Lesson 4: Stealth & Breath. Holding breath (Ctrl) silences your breathing loop and steadies your aim. Sprinting (Shift) betrays you at 20 meters.');
      soundEngine.speakGuide('Holding your breath silences your presence and steadies your aim.');
    }
  }, [step]);

  // Step 5: Final Survival Test
  useEffect(() => {
    if (step === 5) {
      setInstruction('Final Trial: A live stalker is hunting you in total darkness. Listen, pulse, and survive 30 seconds or eliminate them.');
      soundEngine.speakGuide('A live stalker is hunting you in total darkness. Survive.');

      const timer = window.setInterval(() => {
        setTestTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            soundEngine.playKillConfirm();
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Stalker makes occasional footstep sounds
      const stalkerSound = window.setInterval(() => {
        const rad = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 15;
        soundEngine.playFootstep(Math.sin(rad) * dist, Math.cos(rad) * dist, 'gravel', false, false);
      }, 2500);

      return () => {
        clearInterval(timer);
        clearInterval(stalkerSound);
      };
    }
  }, [step, onComplete]);

  // Mouse move handler for orientation
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || step === 1) {
      setPlayerYaw((prev) => prev + e.movementX * 0.005);
      soundEngine.updateListener(0, 0, playerYaw);
    }
  };

  const handlePulse = () => {
    soundEngine.playPulseWhoomp(true);
    setHasPulsed(true);

    // Generate test blob in front
    const blob = { angle: 0, band: 'mid' };
    setPulseBlobs([blob]);
    soundEngine.playBlobEcho(0, 10);

    if (step === 2) {
      setTimeout(() => {
        setStep(3);
      }, 1500);
    }
  };

  const handleFire = () => {
    soundEngine.playGunshot(0, 0, true);

    if (step === 3) {
      setShowHitMarker();
      setTimeout(() => {
        setStep(4);
      }, 1500);
    } else if (step === 5 && botAlive) {
      setShowHitMarker();
      setBotAlive(false);
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  const setShowHitMarker = () => {
    setShowHitConfirm(true);
    soundEngine.playKillConfirm();
    setTimeout(() => setShowHitConfirm(false), 300);
  };

  return (
    <div
      id="onboarding-screen"
      onMouseMove={handleMouseMove}
      className="absolute inset-0 bg-black flex flex-col items-center justify-between p-6 z-50 select-none cursor-crosshair"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full max-w-4xl pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-mono text-sm tracking-widest text-zinc-300 uppercase">
            CALIBRATION — LESSON {step} / 5
          </span>
        </div>
        <button
          onClick={onSkip}
          className="px-3 py-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors uppercase border border-zinc-800 rounded"
        >
          Skip to Arena
        </button>
      </div>

      {/* Center Blackout Space with Guidance */}
      <div className="relative flex flex-col items-center justify-center text-center max-w-xl px-4 my-auto">
        {/* Step-specific visual guides */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-32 h-32 rounded-full border border-zinc-800 flex items-center justify-center relative">
              <Volume2 className="w-6 h-6 text-zinc-500" />
              {/* Target sound indicator */}
              <div
                className="absolute w-3 h-3 rounded-full bg-sky-400 blur-[2px] transition-all"
                style={{
                  transform: `rotate(${targetAngle}deg) translateY(-48px)`,
                }}
              />
            </div>
            {isCentered ? (
              <span className="text-xs font-mono text-emerald-400 font-bold animate-pulse">
                SOUND ALIGNED IN FRONT! CLICK TO ADVANCE
              </span>
            ) : (
              <span className="text-xs font-mono text-zinc-400">
                Drag mouse / move head to center the footsteps in both ears
              </span>
            )}
            {isCentered && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded bg-zinc-900 border border-emerald-500 text-emerald-300 font-mono text-xs uppercase hover:bg-emerald-950 transition-colors"
              >
                Proceed to Pulse (Space)
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <button
              onClick={handlePulse}
              className="px-6 py-3 rounded-full bg-sky-950 border border-sky-400 text-sky-200 font-mono text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              TRIGGER PULSE [SPACE]
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            </div>
            <button
              onClick={handleFire}
              className="px-6 py-3 rounded-full bg-rose-950 border border-rose-500 text-rose-200 font-mono text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              FIRE SNIPER [LEFT CLICK]
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs text-zinc-400">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                <span className="text-zinc-200 font-bold">Crouch-walk:</span> 2m audio radius (silent)
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                <span className="text-zinc-200 font-bold">Sprint:</span> 20m audio radius (lethal)
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                <span className="text-zinc-200 font-bold">Hold Breath:</span> 0m noise, silences loop
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                <span className="text-zinc-200 font-bold">Empty Stamina:</span> Loud gasp at 18m!
              </div>
            </div>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono text-xs uppercase hover:bg-zinc-800 transition-colors mt-2"
            >
              Enter Final Live Trial
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="text-2xl font-mono font-bold text-rose-400 animate-pulse">
              SURVIVE: {testTimer}s
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePulse}
                className="px-4 py-2 rounded bg-sky-950 border border-sky-500 text-sky-200 font-mono text-xs"
              >
                PULSE
              </button>
              <button
                onClick={handleFire}
                className="px-4 py-2 rounded bg-rose-950 border border-rose-500 text-rose-200 font-mono text-xs"
              >
                FIRE
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Instructional Text */}
        <p className="font-mono text-sm md:text-base text-zinc-300 leading-relaxed max-w-lg">
          {instruction}
        </p>
      </div>

      {/* Hit Confirm Indicator */}
      {showHitConfirm && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-3xl font-mono font-bold text-white tracking-widest drop-shadow-[0_0_15px_#ffffff]">
            CONFIRMED
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="pb-4 text-center font-mono text-[11px] text-zinc-400">
        Best experienced with headphones for binaural 3D spatial localization.
      </div>
    </div>
  );
};
