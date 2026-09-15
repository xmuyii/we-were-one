/**
 * Shadow Shot - Audio-First Onboarding Tutorial
 * Features real-time 3D Acoustic Wireframe Outline Canvas:
 * - Geometric wireframe floor grid, perimeter pillars, and ceiling rafters
 * - Acoustic reverberation ripples on sound emission
 * - Full wireframe humanoid mannequin / operative silhouette illuminated by echolocation sonar
 * - Interactive mobile controls for rotation, pulsing, and firing
 */

import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../audio/SoundEngine';
import { Radio, Volume2, Shield, Crosshair, Sparkles, ArrowLeft, ArrowRight, Eye, Play } from 'lucide-react';

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
  const [testTimer, setTestTimer] = useState<number>(25);
  const [botAlive, setBotAlive] = useState<boolean>(true);
  const [showHitConfirm, setShowHitConfirm] = useState<boolean>(false);

  // Wireframe canvas & animation state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sonarRingsRef = useRef<{ radius: number; maxRadius: number; opacity: number }[]>([]);
  const acousticRipplesRef = useRef<{ x: number; z: number; radius: number; opacity: number }[]>([]);
  const targetVisibilityRef = useRef<number>(0.2); // wireframe outline opacity
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Step 1: Circling footsteps
  useEffect(() => {
    if (step === 1) {
      setInstruction('Lesson 1: Binaural Orientation. An unseen shadow circles you. Turn your view until the footsteps are centered in front of you.');
      soundEngine.speakGuide('An unseen shadow circles you. Turn your view until the footsteps are centered.');

      let currentAngle = 90;
      const interval = window.setInterval(() => {
        currentAngle = (currentAngle + 18) % 360;
        setTargetAngle(currentAngle);

        const rad = (currentAngle * Math.PI) / 180;
        const x = Math.sin(rad) * 9;
        const z = Math.cos(rad) * 9;
        soundEngine.playFootstep(x, z, 'metal', false, false);

        // Acoustic floor ripple
        acousticRipplesRef.current.push({ x, z, radius: 0.5, opacity: 1.0 });

        // Check alignment within 24 degrees
        const diff = Math.abs(((playerYaw * 180) / Math.PI - currentAngle + 540) % 360 - 180);
        if (diff < 24) {
          setIsCentered(true);
          targetVisibilityRef.current = 0.9;
        } else {
          setIsCentered(false);
          targetVisibilityRef.current = Math.max(0.15, 0.9 - (diff / 180) * 0.8);
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [step, playerYaw]);

  // Step 2: Pulse Training
  useEffect(() => {
    if (step === 2) {
      setInstruction('Lesson 2: Echolocation Wireframe. Press [SPACE] or tap PULSE to emit a sonar wave. The returning echo reveals the geometric wireframe outline of walls and targets.');
      soundEngine.speakGuide('Trigger a pulse to reveal the wireframe outline of the room and targets.');
    }
  }, [step]);

  // Step 3: First Shot
  useEffect(() => {
    if (step === 3) {
      setInstruction('Lesson 3: The Sniper. Center your sights on the illuminated wireframe target. Left Click or tap FIRE to eliminate with one shot.');
      soundEngine.speakGuide('Center your weapon on the wireframe target and fire.');
    }
  }, [step]);

  // Step 4: Stealth & Breathing
  useEffect(() => {
    if (step === 4) {
      setInstruction('Lesson 4: Stealth & Wireframe Silence. Crouching reduces your acoustic reverberation to 2 meters. Sprinting ripples the wireframe floor out to 20 meters.');
      soundEngine.speakGuide('Holding breath steadies your aim and silences your breathing loop.');
    }
  }, [step]);

  // Step 5: Final Survival Test
  useEffect(() => {
    if (step === 5) {
      setInstruction('Final Trial: A live stalker is prowling in the darkness. Pulse to illuminate their wireframe outline and neutralize them!');
      soundEngine.speakGuide('A live stalker is hunting in the darkness. Survive or eliminate them.');

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

      const stalkerSound = window.setInterval(() => {
        const rad = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 12;
        const x = Math.sin(rad) * dist;
        const z = Math.cos(rad) * dist;
        soundEngine.playFootstep(x, z, 'wood', false, false);
        acousticRipplesRef.current.push({ x, z, radius: 0.8, opacity: 0.9 });
      }, 2200);

      return () => {
        clearInterval(timer);
        clearInterval(stalkerSound);
      };
    }
  }, [step, onComplete]);

  // Real-Time Wireframe Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 500);

      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.62;
      const fov = 420;

      // Draw Perspective Wireframe Floor Grid
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.22)';
      ctx.lineWidth = 1;

      const gridSize = 14;
      const spacing = 2.2;

      // Project 3D point (world X, Y, Z) to 2D screen based on playerYaw
      const project = (wx: number, wy: number, wz: number) => {
        // Rotate around Y axis by -playerYaw
        const cos = Math.cos(-playerYaw);
        const sin = Math.sin(-playerYaw);
        const rx = wx * cos - wz * sin;
        const rz = wx * sin + wz * cos;

        if (rz <= 0.5) return null; // Behind camera

        const sx = cx + (rx / rz) * fov;
        const sy = cy + (wy / rz) * fov;
        return { sx, sy, rz };
      };

      // Draw Floor Lines (Z lines)
      for (let x = -gridSize; x <= gridSize; x += 2) {
        ctx.beginPath();
        let first = true;
        for (let z = 2; z <= 26; z += 2) {
          const pt = project(x * spacing, 2.8, z);
          if (pt) {
            if (first) {
              ctx.moveTo(pt.sx, pt.sy);
              first = false;
            } else {
              ctx.lineTo(pt.sx, pt.sy);
            }
          }
        }
        ctx.stroke();
      }

      // Draw Floor Lines (X lines)
      for (let z = 2; z <= 26; z += 2) {
        ctx.beginPath();
        let first = true;
        for (let x = -gridSize; x <= gridSize; x += 2) {
          const pt = project(x * spacing, 2.8, z);
          if (pt) {
            if (first) {
              ctx.moveTo(pt.sx, pt.sy);
              first = false;
            } else {
              ctx.lineTo(pt.sx, pt.sy);
            }
          }
        }
        ctx.stroke();
      }

      // Draw Perimeter Room Pillars & Wireframe Boundary
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      const pillarCoords = [
        [-16, 10],
        [16, 10],
        [-16, 24],
        [16, 24],
        [0, 26],
      ];
      pillarCoords.forEach(([px, pz]) => {
        const base = project(px, 2.8, pz);
        const top = project(px, -3.2, pz);
        if (base && top) {
          ctx.beginPath();
          ctx.moveTo(base.sx, base.sy);
          ctx.lineTo(top.sx, top.sy);
          ctx.stroke();
        }
      });

      // Update & Draw Sonar Rings
      sonarRingsRef.current.forEach((ring, idx) => {
        ring.radius += 0.45;
        ring.opacity = Math.max(0, 1 - ring.radius / ring.maxRadius);

        ctx.strokeStyle = `rgba(56, 189, 248, ${ring.opacity * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius * 24, 0, Math.PI * 2);
        ctx.stroke();

        if (ring.radius >= ring.maxRadius) {
          sonarRingsRef.current.splice(idx, 1);
        }
      });

      // Update & Draw Acoustic Floor Ripples from footsteps
      acousticRipplesRef.current.forEach((ripple, idx) => {
        ripple.radius += 0.15;
        ripple.opacity -= 0.035;

        const centerPt = project(ripple.x, 2.8, ripple.z);
        if (centerPt) {
          ctx.strokeStyle = `rgba(250, 204, 21, ${Math.max(0, ripple.opacity)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(centerPt.sx, centerPt.sy, ripple.radius * 22, ripple.radius * 9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (ripple.opacity <= 0) {
          acousticRipplesRef.current.splice(idx, 1);
        }
      });

      // DRAW WIREFRAME HUMANOID SILHOUETTE (The Target Mannequin)
      if (botAlive) {
        const rad = (targetAngle * Math.PI) / 180;
        const tx = Math.sin(rad) * 9;
        const tz = Math.cos(rad) * 9;

        const vis = targetVisibilityRef.current;
        const targetColor =
          isCentered || vis > 0.6
            ? `rgba(56, 189, 248, ${vis})`
            : `rgba(161, 161, 170, ${Math.max(0.12, vis * 0.4)})`;

        ctx.strokeStyle = targetColor;
        ctx.fillStyle = targetColor;
        ctx.lineWidth = isCentered ? 2 : 1.5;

        // Head, Chest, Pelvis, Arms, Legs coordinates in 3D
        const head = project(tx, 0.4, tz);
        const neck = project(tx, 0.8, tz);
        const pelvis = project(tx, 1.8, tz);
        const leftHand = project(tx - 0.7, 1.6, tz);
        const rightHand = project(tx + 0.7, 1.6, tz);
        const leftFoot = project(tx - 0.5, 2.8, tz);
        const rightFoot = project(tx + 0.5, 2.8, tz);

        if (head && neck && pelvis && leftHand && rightHand && leftFoot && rightFoot) {
          // Head wireframe circle
          ctx.beginPath();
          ctx.arc(head.sx, head.sy, Math.max(5, 75 / head.rz), 0, Math.PI * 2);
          ctx.stroke();

          // Spine & Torso wireframe
          ctx.beginPath();
          ctx.moveTo(neck.sx, neck.sy);
          ctx.lineTo(pelvis.sx, pelvis.sy);

          // Shoulder bar
          ctx.moveTo(leftHand.sx, neck.sy + 4);
          ctx.lineTo(rightHand.sx, neck.sy + 4);

          // Arms
          ctx.moveTo(leftHand.sx, neck.sy + 4);
          ctx.lineTo(leftHand.sx, leftHand.sy);
          ctx.moveTo(rightHand.sx, neck.sy + 4);
          ctx.lineTo(rightHand.sx, rightHand.sy);

          // Legs
          ctx.moveTo(pelvis.sx, pelvis.sy);
          ctx.lineTo(leftFoot.sx, leftFoot.sy);
          ctx.moveTo(pelvis.sx, pelvis.sy);
          ctx.lineTo(rightFoot.sx, rightFoot.sy);
          ctx.stroke();

          // Target Distance & Callsign Tag
          if (isCentered || hasPulsed) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`[ECHO: 9.0M]`, head.sx - 35, head.sy - 15);
          }
        }
      }

      // Render Shatter Particles if hit
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        ctx.fillStyle = `rgba(56, 189, 248, ${p.life})`;
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
        if (p.life <= 0) particlesRef.current.splice(idx, 1);
      });

      // Crosshair Center Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx, cy + 14);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [playerYaw, targetAngle, isCentered, hasPulsed, botAlive]);

  // Mouse & Touch View Rotation
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || step === 1) {
      setPlayerYaw((prev) => prev + e.movementX * 0.005);
      soundEngine.updateListener(0, 0, playerYaw);
    }
  };

  const handlePulse = () => {
    soundEngine.playPulseWhoomp(true);
    setHasPulsed(true);

    // Trigger full wireframe sonar ring
    sonarRingsRef.current.push({ radius: 1, maxRadius: 18, opacity: 1.0 });
    targetVisibilityRef.current = 1.0;
    soundEngine.playBlobEcho(0, 9);

    if (step === 2) {
      setTimeout(() => {
        setStep(3);
      }, 1500);
    }
  };

  const handleFire = () => {
    soundEngine.playGunshot(0, 0, true);

    // Shatter particles at center
    for (let i = 0; i < 35; i++) {
      particlesRef.current.push({
        x: (canvasRef.current?.width || 600) / 2 + (Math.random() - 0.5) * 40,
        y: (canvasRef.current?.height || 400) * 0.6 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        life: 1.0,
      });
    }

    if (step === 3) {
      setShowHitMarker();
      setTimeout(() => {
        setStep(4);
      }, 1600);
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
    setTimeout(() => setShowHitConfirm(false), 400);
  };

  return (
    <div
      id="onboarding-screen"
      onMouseMove={handleMouseMove}
      className="absolute inset-0 bg-black flex flex-col items-center justify-between p-3 md:p-6 z-50 select-none overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full max-w-4xl pt-2 z-20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs md:text-sm tracking-widest text-zinc-300 uppercase">
            ACOUSTIC WIREFRAME CALIBRATION — LESSON {step} / 5
          </span>
        </div>
        <button
          onClick={onSkip}
          className="px-3 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 uppercase border border-zinc-800 rounded hover:bg-zinc-900 transition-colors"
        >
          Skip Tutorial
        </button>
      </div>

      {/* Main 3D Wireframe Canvas Viewport */}
      <div className="relative w-full max-w-4xl flex-1 my-2 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Dynamic Instruction Overlay */}
        <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur-sm border border-zinc-800 p-3 rounded-lg text-center z-10">
          <p className="font-mono text-xs md:text-sm text-zinc-200 leading-relaxed max-w-2xl mx-auto">
            {instruction}
          </p>
        </div>

        {/* Center Prompt Banner based on step */}
        {step === 1 && isCentered && (
          <div className="absolute bottom-6 flex flex-col items-center gap-2 z-10 animate-bounce">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-black/90 px-3 py-1 rounded border border-emerald-500">
              SOUND PERFECTLY ALIGNED!
            </span>
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-100 font-mono text-xs uppercase font-bold tracking-wider hover:bg-emerald-900 shadow-lg"
            >
              Proceed to Wireframe Pulse &rarr;
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="absolute bottom-6 flex flex-col items-center gap-3 z-10 bg-black/90 border border-zinc-800 p-4 rounded-xl max-w-md">
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 text-left">
              <span className="text-emerald-400">Crouch:</span> 2m audio ripple
              <span className="text-rose-400">Sprint:</span> 20m audio ripple
              <span className="text-sky-400">Hold Breath:</span> 0m noise, still aim
              <span className="text-amber-400">Empty Stamina:</span> Loud gasp at 18m
            </div>
            <button
              onClick={() => setStep(5)}
              className="mt-1 w-full py-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs font-bold uppercase"
            >
              Enter Live Trial &rarr;
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="absolute top-18 right-4 bg-black/90 border border-rose-600/80 px-3 py-1.5 rounded text-rose-300 font-mono text-xs font-bold animate-pulse z-10">
            TRIAL SURVIVAL: {testTimer}s
          </div>
        )}

        {/* Hit Marker Confirm */}
        {showHitConfirm && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="text-3xl md:text-4xl font-mono font-extrabold text-white tracking-widest drop-shadow-[0_0_20px_#ffffff] animate-ping">
              TARGET CONFIRMED
            </div>
          </div>
        )}
      </div>

      {/* Touch & Quick Controls Bar (Mobile & Desktop Accessible) */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-3 pt-2 z-20">
        {/* Left Rotation Controls for Mobile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPlayerYaw((prev) => prev - 0.2);
              soundEngine.updateListener(0, 0, playerYaw - 0.2);
            }}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs flex items-center gap-1 active:scale-95"
            title="Turn View Left"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Turn Left</span>
          </button>
          <button
            onClick={() => {
              setPlayerYaw((prev) => prev + 0.2);
              soundEngine.updateListener(0, 0, playerYaw + 0.2);
            }}
            className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs flex items-center gap-1 active:scale-95"
            title="Turn View Right"
          >
            <span>Turn Right</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center / Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePulse}
            className="px-4 py-2.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-400 text-sky-100 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.3)] active:scale-95 transition-all"
          >
            <Radio className="w-4 h-4 text-sky-400" />
            <span>TRIGGER PULSE [SPACE]</span>
          </button>

          {(step === 3 || step === 5) && (
            <button
              onClick={handleFire}
              className="px-4 py-2.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-100 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 transition-all animate-pulse"
            >
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>FIRE SNIPER [CLICK]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
