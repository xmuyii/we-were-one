/**
 * Shadow Shot - Accessibility & Sound Settings Modal
 */

import React from 'react';
import { X, Volume2, Eye, Vibrate, Check, Sliders, Smartphone } from 'lucide-react';
import {
  AccessibilitySettings,
  DEFAULT_MOBILE_CONTROLS,
  CLAW_MOBILE_CONTROLS,
  LEFTY_MOBILE_CONTROLS,
  MobileControlsConfig,
} from '../types';

interface SettingsModalProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: AccessibilitySettings) => void;
  onClose: () => void;
  onOpenMobileControlsEditor?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenMobileControlsEditor,
}) => {
  const handleChange = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const currentMobileConfig: MobileControlsConfig =
    settings.mobileControls || DEFAULT_MOBILE_CONTROLS;

  const handleMobileConfigChange = (partial: Partial<MobileControlsConfig>) => {
    handleChange('mobileControls', {
      ...currentMobileConfig,
      ...partial,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-100 font-mono my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
              SETTINGS & CONTROLS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Mobile Controls Placement Section */}
          <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-900/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sky-200">Mobile Touch Controls Layout</span>
              </div>
              <span className="text-[10px] bg-sky-950 px-2 py-0.5 rounded text-sky-300 border border-sky-700">
                CUSTOM HUD
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Choose exactly where to place your virtual joystick, fire trigger, pulse radar, crouch, and scope controls.
            </p>

            {onOpenMobileControlsEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMobileControlsEditor();
                }}
                className="w-full py-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(2,132,199,0.35)] transition-all active:scale-95"
              >
                <Sliders className="w-4 h-4" />
                <span>CUSTOMIZE CONTROLS (DRAG & DROP)</span>
              </button>
            )}

            {/* Quick Layout Presets */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-zinc-400 uppercase">Quick Presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Default (2-Thumb)', preset: 'default' },
                  { label: '3-Finger Claw', preset: 'claw' },
                  { label: 'Lefty Inverted', preset: 'lefty' },
                  { label: 'Compact Minimal', preset: 'compact' },
                ].map((item) => (
                  <button
                    key={item.preset}
                    type="button"
                    onClick={() => {
                      if (item.preset === 'lefty') {
                        handleMobileConfigChange(LEFTY_MOBILE_CONTROLS);
                      } else if (item.preset === 'claw') {
                        handleMobileConfigChange(CLAW_MOBILE_CONTROLS);
                      } else {
                        handleMobileConfigChange(DEFAULT_MOBILE_CONTROLS);
                      }
                    }}
                    className={`py-1.5 px-2 rounded text-[11px] font-mono border transition-all text-left truncate ${
                      currentMobileConfig.preset === item.preset
                        ? 'bg-sky-950 border-sky-500 text-sky-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Button Scale & Opacity */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-sky-950/60">
              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Button Size</span>
                  <span className="text-zinc-200">{Math.round((currentMobileConfig.buttonScale || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.35"
                  step="0.05"
                  value={currentMobileConfig.buttonScale || 1.0}
                  onChange={(e) => handleMobileConfigChange({ buttonScale: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Button Opacity</span>
                  <span className="text-zinc-200">{Math.round((currentMobileConfig.buttonOpacity || 0.85) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={currentMobileConfig.buttonOpacity || 0.85}
                  onChange={(e) => handleMobileConfigChange({ buttonOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Audio Channels */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
            <div>
              <div className="font-bold text-zinc-200">Mono Audio Downmix</div>
              <div className="text-zinc-500 text-[11px]">
                Mixes stereo spatial audio to both channels for single-ear play
              </div>
            </div>
            <button
              onClick={() => handleChange('monoAudio', !settings.monoAudio)}
              className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.monoAudio ? 'bg-sky-600 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Visual Audio Cues */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">Visual Audio Cues & Subtitles</div>
              <div className="text-zinc-500 text-[11px]">
                Screen-edge glows & directional text cues for deaf/hard-of-hearing
              </div>
            </div>
            <button
              onClick={() => handleChange('visualAudioCues', !settings.visualAudioCues)}
              className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.visualAudioCues ? 'bg-sky-600 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Peripheral Awareness Ring */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">Peripheral Awareness Ring</div>
              <div className="text-zinc-500 text-[11px]">
                Subtle screen ring (casual modes only; disabled in Ranked)
              </div>
            </div>
            <button
              onClick={() => handleChange('awarenessRing', !settings.awarenessRing)}
              className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.awarenessRing ? 'bg-sky-600 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Colorblind Pulse */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">High-Contrast Pulse Color</div>
              <div className="text-zinc-500 text-[11px]">
                Switch sonar ring and smudges from cyan to high-contrast orange
              </div>
            </div>
            <button
              onClick={() => handleChange('colorblindPulse', !settings.colorblindPulse)}
              className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.colorblindPulse ? 'bg-amber-600 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">Haptic Feedback & Rumble</div>
              <div className="text-zinc-500 text-[11px]">
                Phone vibration & recoil haptics on sprint, shots, and proximity
              </div>
            </div>
            <button
              onClick={() => handleChange('haptics', !settings.haptics)}
              className={`w-10 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.haptics ? 'bg-sky-600 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Volume Controls */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Master Volume</span>
              <span className="text-zinc-200 font-bold">{Math.round(settings.volumeMaster * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volumeMaster}
              onChange={(e) => handleChange('volumeMaster', parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          {/* Mouse / Aim Sensitivity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Aim Sensitivity</span>
              <span className="text-zinc-200 font-bold">{(settings.mouseSensitivity * 1000).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.006"
              step="0.0005"
              value={settings.mouseSensitivity}
              onChange={(e) => handleChange('mouseSensitivity', parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs uppercase tracking-wider font-bold transition-colors"
        >
          Confirm Settings
        </button>
      </div>
    </div>
  );
};
