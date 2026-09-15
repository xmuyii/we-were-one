/**
 * Shadow Shot - Supabase Backend & Cross-Game Connectivity Modal
 * Shows persistent cross-game profile status, global sync, and database deployment schema.
 */

import React, { useEffect, useState } from 'react';
import {
  checkSupabaseStatus,
  fetchCrossGameProfile,
  getSupabaseSqlSchema,
  SupabaseStatus,
  CrossGameProfile,
} from '../lib/supabase';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, X, Shield, Award, Flame } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  playerId,
  playerName,
}) => {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [profile, setProfile] = useState<CrossGameProfile | null>(null);
  const [sqlSchema, setSqlSchema] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    Promise.all([
      checkSupabaseStatus(),
      fetchCrossGameProfile(playerId, playerName),
      getSupabaseSqlSchema(),
    ]).then(([st, prof, schema]) => {
      if (mounted) {
        setStatus(st);
        setProfile(prof);
        setSqlSchema(schema);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, playerId, playerName]);

  const copySql = () => {
    if (!sqlSchema) return;
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                Supabase Cross-Game Backend
              </h2>
              <p className="text-xs text-zinc-400">
                Persistent cross-game profiles, global rankings, and match synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-start gap-3 ${
              status?.connected
                ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            )}
            <div className="text-xs leading-relaxed">
              <div className="font-bold uppercase tracking-wider mb-0.5">
                {status?.connected
                  ? 'Supabase Cloud Database Connected'
                  : 'Standalone Local Backend Active'}
              </div>
              <div className="text-zinc-400">{status?.message}</div>
              {status?.url && (
                <div className="font-mono text-[11px] text-emerald-400 mt-1">
                  Target: {status.url}
                </div>
              )}
            </div>
          </div>

          {/* Cross Game Operative Stats */}
          {profile && (
            <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  Cross-Game Profile
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
                  {profile.crossGameTitle || 'Cross-Game Operative'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Rank Tier</div>
                  <div className="text-sm font-bold font-mono text-amber-400">
                    {profile.rankTier}
                  </div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Rating</div>
                  <div className="text-sm font-bold font-mono text-sky-400">
                    {profile.rankRating} MMR
                  </div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Total Kills</div>
                  <div className="text-sm font-bold font-mono text-rose-400">{profile.kills}</div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-zinc-800/80">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Linked Games</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {profile.connectedGamesCount || 2} Games
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Railway & Git Quick Deploy Notice */}
          <div className="p-4 rounded-lg bg-black/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Railway & Git Instant Hosting
              </span>
              <span className="text-[10px] font-mono text-zinc-500">railway.json + Dockerfile Ready</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Shadow Shot is configured with native <span className="text-zinc-200 font-mono">railway.json</span>,{' '}
              <span className="text-zinc-200 font-mono">Procfile</span>, and a multi-stage{' '}
              <span className="text-zinc-200 font-mono">Dockerfile</span>.
            </p>
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
              <div>1. Push repository to GitHub: <span className="text-sky-400">git push origin main</span></div>
              <div>2. In Railway: New Project &rarr; Deploy from GitHub repo</div>
              <div>3. Add environment variables in Railway: <span className="text-amber-400">SUPABASE_URL</span> &amp; <span className="text-amber-400">SUPABASE_ANON_KEY</span></div>
            </div>
          </div>

          {/* Supabase Schema Copy */}
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
                Database Schema (player_profiles & game_match_history)
              </span>
              <button
                onClick={copySql}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-36">
              {sqlSchema}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
