/**
 * Shadow Shot - Binaural HRTF Audio Synthesizer & Soundscape Engine
 * Pure Web Audio API procedural synthesis - Zero asset load time (<5MB constraint)
 */

import { SurfaceType, ReloadStageName } from '../types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private weatherNode: AudioNode | null = null;
  private weatherGain: GainNode | null = null;
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatInterval: number | null = null;
  
  // Settings
  private isMono: boolean = false;
  private masterVolume: number = 0.9;
  private sfxVolume: number = 1.0;
  private ambientVolume: number = 0.6;
  private hapticsEnabled: boolean = true;

  // Listener position & yaw
  private listenerPos = { x: 0, y: 1.7, z: 0 };
  private listenerYaw = 0; // radians

  // Weather state
  private currentWeather: string = 'clear';

  constructor() {
    // Lazily initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.updateListener(0, 0, 0);
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSettings(settings: {
    monoAudio: boolean;
    volumeMaster: number;
    volumeSfx: number;
    volumeAmbient: number;
    haptics: boolean;
  }) {
    this.isMono = settings.monoAudio;
    this.masterVolume = settings.volumeMaster;
    this.sfxVolume = settings.volumeSfx;
    this.ambientVolume = settings.volumeAmbient;
    this.hapticsEnabled = settings.haptics;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.ambientVolume, this.ctx.currentTime, 0.05);
    }
  }

  public updateListener(x: number, z: number, yawRadians: number) {
    this.listenerPos.x = x;
    this.listenerPos.z = z;
    this.listenerYaw = yawRadians;

    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const fx = -Math.sin(yawRadians);
    const fz = -Math.cos(yawRadians);

    if (listener.positionX) {
      listener.positionX.setValueAtTime(x, this.ctx.currentTime);
      listener.positionY.setValueAtTime(1.7, this.ctx.currentTime);
      listener.positionZ.setValueAtTime(z, this.ctx.currentTime);
      listener.forwardX.setValueAtTime(fx, this.ctx.currentTime);
      listener.forwardY.setValueAtTime(0, this.ctx.currentTime);
      listener.forwardZ.setValueAtTime(fz, this.ctx.currentTime);
      listener.upX.setValueAtTime(0, this.ctx.currentTime);
      listener.upY.setValueAtTime(1, this.ctx.currentTime);
      listener.upZ.setValueAtTime(0, this.ctx.currentTime);
    } else {
      // Legacy API
      listener.setPosition(x, 1.7, z);
      listener.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  }

  private createPanner(x: number, z: number): PannerNode | null {
    if (!this.ctx || !this.sfxGain) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = this.isMono ? 'equalpower' : 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.5;
    panner.maxDistance = 50;
    panner.rolloffFactor = 1.1;
    panner.positionX.setValueAtTime(x, this.ctx.currentTime);
    panner.positionY.setValueAtTime(1.2, this.ctx.currentTime);
    panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    panner.connect(this.sfxGain);
    return panner;
  }

  private triggerHaptic(durationMs: number = 30) {
    if (!this.hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignored
    }
  }

  // --- FOOTSTEPS ---
  public playFootstep(x: number, z: number, surface: SurfaceType = 'gravel', isCrouch: boolean = false, isSprint: boolean = false) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;

    const now = this.ctx.currentTime;
    const duration = isCrouch ? 0.08 : isSprint ? 0.15 : 0.11;
    const gainNode = this.ctx.createGain();
    const volume = isCrouch ? 0.15 : isSprint ? 0.9 : 0.45;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Filtered noise burst
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    switch (surface) {
      case 'wood':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(240, now);
        filter.Q.setValueAtTime(3.5, now);
        break;
      case 'metal':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.setValueAtTime(8, now);
        break;
      case 'water':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        break;
      case 'grass':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        break;
      case 'gravel':
      default:
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750, now);
        filter.Q.setValueAtTime(2.0, now);
        break;
    }

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);

    noise.start(now);
    noise.stop(now + duration);

    // Optional haptic tap on sprint steps
    if (isSprint) {
      this.triggerHaptic(15);
    }
  }

  // --- SNIPER GUNSHOT & IMPACT WITH MUZZLE PROGRESSION ---
  public playGunshot(x: number, z: number, isSelf: boolean = false, muzzleLevel: number = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = isSelf && this.sfxGain ? this.sfxGain : this.createPanner(x, z);
    if (!dest) return;

    // Silent Muzzle (Level 7): Complete silence, only microscopic mechanical action
    if (muzzleLevel === 7) {
      if (isSelf) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.025);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.025);
        this.triggerHaptic(10);
      }
      return;
    }

    // Ghost Muzzle (Level 6): Near-silent mechanical tick
    if (muzzleLevel === 6) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(isSelf ? 0.12 : 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.04);
      this.triggerHaptic(isSelf ? 20 : 10);
      return;
    }

    // Mk. V (Level 5): Quiet pneumatic puff
    if (muzzleLevel === 5) {
      const puffBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
      const data = puffBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
      }
      const source = this.ctx.createBufferSource();
      source.buffer = puffBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isSelf ? 0.28 : 0.18, now);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      source.start(now);
      this.triggerHaptic(isSelf ? 30 : 15);
      return;
    }

    // Mk. III–IV (Levels 3, 4): Soft thump, reduced echo
    if (muzzleLevel >= 3) {
      const thumpOsc = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(140, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
      thumpGain.gain.setValueAtTime(isSelf ? 0.55 : 0.35, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(dest);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.22);

      const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const nData = noiseBuf.getChannelData(0);
      for (let i = 0; i < nData.length; i++) {
        nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
      }
      const nSource = this.ctx.createBufferSource();
      nSource.buffer = noiseBuf;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(900, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.4, now);
      nSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(dest);
      nSource.start(now);

      this.triggerHaptic(isSelf ? 45 : 20);
      return;
    }

    // Mk. I–II (Levels 1, 2) or Bare Muzzle (Level 0)
    const isMuffled = muzzleLevel >= 1;

    // 1. Transient sharp crack
    const crackBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const cData = crackBuffer.getChannelData(0);
    for (let i = 0; i < cData.length; i++) {
      cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (isMuffled ? 0.015 : 0.02)));
    }
    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = crackBuffer;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = isMuffled ? 'lowpass' : 'allpass';
    crackFilter.frequency.setValueAtTime(isMuffled ? 2200 : 8000, now);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(isMuffled ? 0.75 : 1.0, now);
    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(dest);
    crackSource.start(now);

    // 2. Sub-bass punch (pitch sweep 160Hz -> 35Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + (isMuffled ? 0.25 : 0.35));

    subGain.gain.setValueAtTime(isMuffled ? 0.7 : 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isMuffled ? 0.35 : 0.5));

    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(now);
    subOsc.stop(now + (isMuffled ? 0.35 : 0.5));

    // 3. Reverb tail (longer on bare muzzle)
    if (!isMuffled || muzzleLevel === 1) {
      const tailDuration = muzzleLevel === 1 ? 0.8 : 1.5;
      const tailBuffer = this.ctx.createBuffer(2, this.ctx.sampleRate * tailDuration, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const tData = tailBuffer.getChannelData(ch);
        for (let i = 0; i < tData.length; i++) {
          tData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (isMuffled ? 0.2 : 0.35)));
        }
      }
      const tailSource = this.ctx.createBufferSource();
      tailSource.buffer = tailBuffer;
      const tailFilter = this.ctx.createBiquadFilter();
      tailFilter.type = 'lowpass';
      tailFilter.frequency.setValueAtTime(isMuffled ? 1200 : 1800, now);
      tailFilter.frequency.linearRampToValueAtTime(300, now + tailDuration * 0.8);

      const tailGain = this.ctx.createGain();
      tailGain.gain.setValueAtTime(isMuffled ? 0.2 : 0.35, now);
      tailGain.gain.exponentialRampToValueAtTime(0.001, now + tailDuration);

      tailSource.connect(tailFilter);
      tailFilter.connect(tailGain);
      tailGain.connect(dest);
      tailSource.start(now + 0.05);
    }

    this.triggerHaptic(isSelf ? (isMuffled ? 65 : 90) : 40);
  }

  // --- STAGED RELOAD ---
  public playReloadStage(stage: ReloadStageName, isSelf: boolean = true) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.sfxGain);

    switch (stage) {
      case 'mag_release': {
        // Quick latch click (0.2s)
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'mag_out': {
        // Metallic slide scrape (0.3s)
        const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src = this.ctx.createBufferSource();
        src.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        src.connect(filter);
        filter.connect(gain);
        src.start(now);
        break;
      }
      case 'mag_in': {
        // Firm clack (0.4s)
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'bolt_pull': {
        // Heavy double "chk-chk" (0.6s)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(650, now);
        osc1.frequency.exponentialRampToValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(800, now + 0.25);
        osc2.frequency.exponentialRampToValueAtTime(180, now + 0.4);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.7, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now + 0.25);
        osc2.stop(now + 0.45);
        break;
      }
      default:
        break;
    }
  }

  // --- EMPTY CLICK ---
  public playEmptyClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
    this.triggerHaptic(20);
  }

  // --- THE PULSE (ECHOLOCATION WHOOMP & ECHOES) ---
  public playPulseWhoomp(isSelf: boolean = true) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub-bass whoomp (38Hz -> 85Hz -> 28Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(38, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    gain.gain.setValueAtTime(isSelf ? 0.8 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.65);

    this.triggerHaptic(isSelf ? 60 : 25);
  }

  // Returning echoes for detected blobs
  public playBlobEcho(angleDeg: number, distanceMeters: number) {
    if (!this.ctx || !this.sfxGain) return;
    // Calculate delay based on distance (speed ~40m/s roundtrip)
    const delaySec = Math.min(0.7, (distanceMeters * 2) / 120);
    const echoTime = this.ctx.currentTime + delaySec;

    // Relative pan from angle
    const angleRad = (angleDeg * Math.PI) / 180;
    const panX = Math.sin(angleRad);
    const panZ = Math.cos(angleRad);

    const panner = this.createPanner(
      this.listenerPos.x + panX * distanceMeters,
      this.listenerPos.z + panZ * distanceMeters
    );
    if (!panner) return;

    // Soft chime/ping tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Pitch: nearer is higher/clearer, farther is lower/muffled
    const freq = Math.max(260, 900 - distanceMeters * 25);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, echoTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, echoTime + 0.2);

    const volume = Math.max(0.1, 0.6 - distanceMeters * 0.018);
    gain.gain.setValueAtTime(volume, echoTime);
    gain.gain.exponentialRampToValueAtTime(0.001, echoTime + 0.25);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(echoTime);
    osc.stop(echoTime + 0.25);
  }

  // --- ENEMY PULSE PING (DETECTABLE AT 30M) ---
  public playEnemyPulsePing(x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.linearRampToValueAtTime(1750, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // --- BREATHING & GASP ---
  public playGasp(x: number, z: number, isSelf: boolean = false) {
    if (!this.ctx) return;
    const dest = isSelf && this.sfxGain ? this.sfxGain : this.createPanner(x, z);
    if (!dest) return;
    const now = this.ctx.currentTime;

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(now);

    if (isSelf) this.triggerHaptic(40);
  }

  // --- KILL CONFIRM (THUNK + DEAD AIR SILENCE) ---
  public playKillConfirm() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Distinct heavy thunk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Brief ducking for iconic "dead air"
    if (this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0.05, now);
      this.ambientGain.gain.linearRampToValueAtTime(this.ambientVolume, now + 0.45);
    }

    this.triggerHaptic(100);
  }

  // --- HEARTBEAT PULSE ---
  public playHeartbeatBeat(rateBpm: number = 80, isShared: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Lub (first pulse)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(58, now);
    osc1.frequency.exponentialRampToValueAtTime(32, now + 0.1);
    gain1.gain.setValueAtTime(isShared ? 0.6 : 0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Dub (second pulse, 0.14s later)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(50, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(28, now + 0.24);
    gain2.gain.setValueAtTime(isShared ? 0.5 : 0.28, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.26);

    if (isShared) {
      this.triggerHaptic(30);
    }
  }

  // --- WEATHER SOUNDS ---
  public setWeather(weather: string, maskingRatio: number = 0) {
    this.currentWeather = weather;
    if (!this.ctx || !this.ambientGain) return;

    // Stop previous weather node if running
    if (this.weatherNode) {
      try {
        (this.weatherNode as AudioBufferSourceNode).stop();
        this.weatherNode.disconnect();
      } catch {
        // Ignored
      }
      this.weatherNode = null;
    }

    if (weather === 'clear') return;

    // Create synthesized loop
    const now = this.ctx.currentTime;
    const loopSec = 4.0;
    const buffer = this.ctx.createBuffer(2, this.ctx.sampleRate * loopSec, this.ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < left.length; i++) {
      const white = Math.random() * 2 - 1;
      left[i] = white;
      right[i] = white * 0.9 + (Math.random() * 2 - 1) * 0.1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    this.weatherGain = this.ctx.createGain();

    if (weather === 'wind') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(4.0, now);
      this.weatherGain.gain.setValueAtTime(0.35, now);
    } else if (weather === 'rain' || weather === 'storm') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      this.weatherGain.gain.setValueAtTime(0.4, now);
    } else if (weather === 'fog') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      this.weatherGain.gain.setValueAtTime(0.2, now);
    } else if (weather === 'heat') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4500, now);
      this.weatherGain.gain.setValueAtTime(0.18, now);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      this.weatherGain.gain.setValueAtTime(0.2, now);
    }

    src.connect(filter);
    filter.connect(this.weatherGain);
    this.weatherGain.connect(this.ambientGain);

    src.start(now);
    this.weatherNode = src;
  }

  public playThunder() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.8);

    this.triggerHaptic(80);
  }

  // --- MELEE SWING & HIT ---
  public playMeleeSwing() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playMeleeHit(isFatal: boolean = true) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
    this.triggerHaptic(isFatal ? 120 : 60);
  }

  // --- DECOY NOISEMAKER ---
  public playDecoyTicking(x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // --- GHOST HUM (ANTI-CAMPING SPECTRAL HUM) ---
  public playGhostHum(x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(114, now + 0.5);
    osc.frequency.linearRampToValueAtTime(108, now + 1.0);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  // --- SUBMARINE RADAR SWEEP PING ---
  public playSubmarineSweepPing(isContact: boolean = false, panAngle: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Authentic sonar ping: contact gives higher chime (1760Hz), sweep pulse gives soft (980Hz)
    const baseFreq = isContact ? 1760 : 980;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.35);

    const initialGain = isContact ? 0.35 : 0.08;
    gain.gain.setValueAtTime(initialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    if (this.ctx.createStereoPanner && !this.isMono) {
      const panner = this.ctx.createStereoPanner();
      const pan = Math.max(-1, Math.min(1, Math.sin((panAngle * Math.PI) / 180)));
      panner.pan.setValueAtTime(pan, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }

    osc.start(now);
    osc.stop(now + 0.4);
    if (isContact) {
      this.triggerHaptic(25);
    }
  }

  // --- ADS SIGHT ALIGNMENT SENSORY FOCUS ---
  public playTargetInSightWhisper() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.18); // A4 -> C5 harmonic

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(110, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.22);
    sub.stop(now + 0.22);
    this.triggerHaptic(15);
  }

  // --- BULLET WHIZ / NEAR MISS ---
  public playBulletWhiz(x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    // Doppler effect pitch drop
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // --- KILLSTREAKS & SENSORS ---

  // 2-Kill Tracker Chime: Soft, crystalline chime audible within 10m
  public playTrackerChime(x?: number, z?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = x !== undefined && z !== undefined ? this.createPanner(x, z) : this.sfxGain;
    if (!dest) return;

    [1046.5, 1318.5, 1567.98].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.3, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.6);
    });
    this.triggerHaptic(25);
  }

  // 3-Kill Active Scan Ping: Loud, echoing 360° sonar ping audible within 40m
  public playActiveScanPing(x?: number, z?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = x !== undefined && z !== undefined ? this.createPanner(x, z) : this.sfxGain;
    if (!dest) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    // Reverb tail for active scan
    const revOsc = this.ctx.createOscillator();
    const revGain = this.ctx.createGain();
    revOsc.type = 'triangle';
    revOsc.frequency.setValueAtTime(520, now + 0.1);
    revGain.gain.setValueAtTime(0.35, now + 0.1);
    revGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(dest);
    revOsc.connect(revGain);
    revGain.connect(dest);

    osc.start(now);
    osc.stop(now + 1.2);
    revOsc.start(now + 0.1);
    revOsc.stop(now + 1.5);
    this.triggerHaptic(70);
  }

  // 4-Kill Claymore / Snare Placement
  public playClaymorePlace(isLogigi: boolean, x?: number, z?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = x !== undefined && z !== undefined ? this.createPanner(x, z) : this.sfxGain;
    if (!dest) return;

    if (isLogigi) {
      // L'ogigi Claymore: Loud metallic click + sharp arming beep (audible 15m)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, now + 0.1);
      gain.gain.setValueAtTime(0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + 0.1);
      osc.stop(now + 0.25);
    } else {
      // L'otito Snare: Soft mechanical latch + low harmonic hum (audible 12m)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.35);
    }
    this.triggerHaptic(40);
  }

  // Periodic Mine Proximity Cue (every 2s or 3s)
  public playClaymoreBeep(isLogigi: boolean, x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (isLogigi) {
      // Sharp high beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      // Soft resonant pulse
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
    osc.connect(gain);
    gain.connect(panner);
  }

  // Mine Detonation Explosion
  public playMineDetonation(x: number, z: number) {
    if (!this.ctx) return;
    const panner = this.createPanner(x, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    // Deep sub blast
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.4);
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sub.connect(subGain);
    subGain.connect(panner);
    sub.start(now);
    sub.stop(now + 0.6);

    // Shrapnel noise burst
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    source.connect(gain);
    gain.connect(panner);
    source.start(now);
    this.triggerHaptic(95);
  }

  // --- AMMO CACHE DISCOVERY & SCAVENGING ---

  // Discovered cache: Soft, gentle inviting chime
  public playAmmoCacheDiscovered() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    [587.33, 880.0, 1174.66].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.28, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.7);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.7);
    });

    this.triggerHaptic(20);
  }

  // Opening / scavenged ammo cache (audible 5m)
  public playAmmoCacheScavenged(x?: number, z?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dest = x !== undefined && z !== undefined ? this.createPanner(x, z) : this.sfxGain;
    if (!dest) return;

    // Metallic latch and ammo box rustle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.22);
    this.triggerHaptic(45);
  }

  // Muzzle attachment swap sound
  public playMuzzleEquipped() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
    this.triggerHaptic(20);
  }

  // --- AMMO CACHE SCAVENGING SOUNDS ---
  public playCacheRummaging(x?: number, z?: number, isSelf: boolean = true) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const panner = (x !== undefined && z !== undefined) ? this.createPanner(x, z) : null;
    const outNode = panner || this.sfxGain;

    // 1. Metal crate hinge / latch friction (bandpass noise)
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(4.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isSelf ? 0.4 : 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(outNode);
    noiseSource.start(now);

    // 2. Brass bullets rattling / clinking in ammo tin
    [0, 0.04, 0.09].forEach((delay, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200 + idx * 450, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1800, now + delay + 0.04);
      oscGain.gain.setValueAtTime(isSelf ? 0.25 : 0.15, now + delay);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);

      osc.connect(oscGain);
      oscGain.connect(outNode);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });

    if (isSelf) this.triggerHaptic(15);
  }

  public playCacheScavenged(x?: number, z?: number, isSelf: boolean = true) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const panner = (x !== undefined && z !== undefined) ? this.createPanner(x, z) : null;
    const outNode = panner || this.sfxGain;

    // Heavy spring-loaded ammo can latch snap shut: "CLACK!"
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(420, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + 0.1);
    gain1.gain.setValueAtTime(isSelf ? 0.6 : 0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(outNode);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Sharp metallic impact
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1600, now);
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.06);
    gain2.gain.setValueAtTime(isSelf ? 0.35 : 0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc2.connect(gain2);
    gain2.connect(outNode);
    osc2.start(now);
    osc2.stop(now + 0.07);

    if (isSelf) this.triggerHaptic(50);
  }

  // --- CALL OF DUTY STYLE SNIPER ADS SCOPE AUDIO ---
  public playSniperScopeIn() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Rifle stock snap / sling rustle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);

    // 2. High-precision optic click / eye-relief opening
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1400, now + 0.04);
    click.frequency.exponentialRampToValueAtTime(700, now + 0.09);
    clickGain.gain.setValueAtTime(0.25, now + 0.04);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    click.connect(clickGain);
    clickGain.connect(this.sfxGain);
    click.start(now + 0.04);
    click.stop(now + 0.1);

    this.triggerHaptic(20);
  }

  public playSniperScopeOut() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);

    this.triggerHaptic(10);
  }

  // Synthesize speech or voice guide for onboarding
  public speakGuide(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.8;
      utterance.volume = this.masterVolume;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignored
    }
  }

  public destroy() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignored
      }
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
