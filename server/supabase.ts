/**
 * Shadow Shot - Server-Side Supabase Client & Cross-Game Integration
 * Integrates with Supabase for persistent cross-game player identity,
 * global ladder ranks, match histories, and shared game unlocks.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let initChecked = false;

export function getSupabase(): SupabaseClient | null {
  if (initChecked) return supabaseClient;
  initChecked = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log('[Supabase] No SUPABASE_URL / SUPABASE_ANON_KEY configured. Running in local standalone mode.');
    return null;
  }

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Successfully connected to Supabase backend at:', url);
  } catch (err) {
    console.error('[Supabase] Initialization error:', err);
    supabaseClient = null;
  }

  return supabaseClient;
}

export interface CrossGameProfile {
  id: string;
  playerName: string;
  faction: string;
  rankTier: string;
  rankRating: number;
  kills: number;
  deaths: number;
  matchesPlayed: number;
  matchesWon: number;
  unlockedMuzzleLevel: number;
  crossGameTitle?: string;
  connectedGamesCount?: number;
}

// In-memory fallback if Supabase is not yet configured with database tables
const inMemoryProfiles = new Map<string, CrossGameProfile>();

export async function fetchPlayerProfile(playerId: string, defaultName: string): Promise<CrossGameProfile> {
  const sb = getSupabase();
  if (!sb) {
    if (!inMemoryProfiles.has(playerId)) {
      inMemoryProfiles.set(playerId, {
        id: playerId,
        playerName: defaultName,
        faction: 'lotito',
        rankTier: 'Phantom',
        rankRating: 2450,
        kills: 0,
        deaths: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        unlockedMuzzleLevel: 2,
        crossGameTitle: 'Specter Operative',
        connectedGamesCount: 1,
      });
    }
    return inMemoryProfiles.get(playerId)!;
  }

  try {
    const { data, error } = await sb
      .from('player_profiles')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error || !data) {
      // Upsert initial profile
      const initial: CrossGameProfile = {
        id: playerId,
        playerName: defaultName,
        faction: 'lotito',
        rankTier: 'Phantom',
        rankRating: 2450,
        kills: 0,
        deaths: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        unlockedMuzzleLevel: 2,
        crossGameTitle: 'Cross-Game Operative',
        connectedGamesCount: 2,
      };

      await sb.from('player_profiles').upsert([
        {
          id: playerId,
          player_name: defaultName,
          faction: 'lotito',
          rank_tier: 'Phantom',
          rank_rating: 2450,
          kills: 0,
          deaths: 0,
          matches_played: 0,
          matches_won: 0,
          unlocked_muzzle_level: 2,
          updated_at: new Date().toISOString(),
        },
      ]);
      return initial;
    }

    return {
      id: data.id,
      playerName: data.player_name || defaultName,
      faction: data.faction || 'lotito',
      rankTier: data.rank_tier || 'Phantom',
      rankRating: data.rank_rating || 2450,
      kills: data.kills || 0,
      deaths: data.deaths || 0,
      matchesPlayed: data.matches_played || 0,
      matchesWon: data.matches_won || 0,
      unlockedMuzzleLevel: data.unlocked_muzzle_level || 2,
      crossGameTitle: data.cross_game_title || 'Linked Operative',
      connectedGamesCount: data.connected_games_count || 1,
    };
  } catch (e) {
    console.warn('[Supabase] Failed to fetch profile from database:', e);
    return {
      id: playerId,
      playerName: defaultName,
      faction: 'lotito',
      rankTier: 'Phantom',
      rankRating: 2450,
      kills: 0,
      deaths: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      unlockedMuzzleLevel: 2,
      crossGameTitle: 'Offline Mode',
      connectedGamesCount: 1,
    };
  }
}

export async function recordMatchOutcome(matchData: {
  matchId: string;
  mode: string;
  playerId: string;
  kills: number;
  deaths: number;
  isVictory: boolean;
  score: number;
  ratingDelta: number;
}) {
  const sb = getSupabase();
  if (!sb) {
    const mem = inMemoryProfiles.get(matchData.playerId);
    if (mem) {
      mem.kills += matchData.kills;
      mem.deaths += matchData.deaths;
      mem.matchesPlayed += 1;
      if (matchData.isVictory) mem.matchesWon += 1;
      mem.rankRating = Math.max(0, mem.rankRating + matchData.ratingDelta);
    }
    return;
  }

  try {
    // Record into match history
    await sb.from('game_match_history').insert([
      {
        match_id: matchData.matchId,
        player_id: matchData.playerId,
        game_mode: matchData.mode,
        kills: matchData.kills,
        deaths: matchData.deaths,
        is_victory: matchData.isVictory,
        score: matchData.score,
        created_at: new Date().toISOString(),
      },
    ]);

    // Update profile
    const profile = await fetchPlayerProfile(matchData.playerId, 'Player');
    const newRating = Math.max(0, profile.rankRating + matchData.ratingDelta);
    let newTier = profile.rankTier;
    if (newRating >= 2500) newTier = 'Eclipse';
    else if (newRating >= 2000) newTier = 'Phantom';
    else if (newRating >= 1500) newTier = 'Specter';
    else if (newRating >= 1000) newTier = 'Wraith';
    else if (newRating >= 500) newTier = 'Shade';

    await sb.from('player_profiles').update({
      kills: profile.kills + matchData.kills,
      deaths: profile.deaths + matchData.deaths,
      matches_played: profile.matchesPlayed + 1,
      matches_won: profile.matchesWon + (matchData.isVictory ? 1 : 0),
      rank_rating: newRating,
      rank_tier: newTier,
      updated_at: new Date().toISOString(),
    }).eq('id', matchData.playerId);
  } catch (err) {
    console.warn('[Supabase] Failed to sync match outcome to database:', err);
  }
}

/**
 * Pre-formatted SQL schema ready to execute in Supabase SQL editor
 */
export const SUPABASE_SQL_SETUP = `-- Supabase Schema for Shadow Shot & Cross-Game Architecture
-- Execute in Supabase SQL Editor: https://app.supabase.com/project/_/sql

CREATE TABLE IF NOT EXISTS public.player_profiles (
  id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  faction TEXT DEFAULT 'lotito',
  rank_tier TEXT DEFAULT 'Phantom',
  rank_rating INTEGER DEFAULT 2450,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  unlocked_muzzle_level INTEGER DEFAULT 2,
  cross_game_title TEXT DEFAULT 'Shadow Operative',
  connected_games_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.game_match_history (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  is_victory BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_match_history ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for game backend
CREATE POLICY "Allow public read of profiles" ON public.player_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update of profiles" ON public.player_profiles FOR ALL USING (true);
CREATE POLICY "Allow public read of match history" ON public.game_match_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert of match history" ON public.game_match_history FOR INSERT WITH CHECK (true);
`;
