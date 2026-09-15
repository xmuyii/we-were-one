/**
 * Shadow Shot - Client Supabase Bridge
 * Communicates with backend endpoints and directly with Supabase when configured
 */

export interface SupabaseStatus {
  connected: boolean;
  url: string | null;
  hasTables: boolean;
  message: string;
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

export async function checkSupabaseStatus(): Promise<SupabaseStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error('API status not ok');
    return await res.json();
  } catch {
    return {
      connected: false,
      url: null,
      hasTables: false,
      message: 'Supabase offline or unconfigured (using local session profile)',
    };
  }
}

export async function fetchCrossGameProfile(playerId: string, defaultName: string): Promise<CrossGameProfile> {
  try {
    const res = await fetch(`/api/supabase/profile?id=${encodeURIComponent(playerId)}&name=${encodeURIComponent(defaultName)}`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  } catch {
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
      crossGameTitle: 'Specter Operative',
      connectedGamesCount: 1,
    };
  }
}

export async function syncMatchToSupabase(payload: {
  matchId: string;
  mode: string;
  playerId: string;
  kills: number;
  deaths: number;
  isVictory: boolean;
  score: number;
  ratingDelta: number;
}): Promise<void> {
  try {
    await fetch('/api/supabase/sync-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[Supabase Sync Error]', err);
  }
}

export async function getSupabaseSqlSchema(): Promise<string> {
  try {
    const res = await fetch('/api/supabase/schema');
    const data = await res.json();
    return data.sql || '';
  } catch {
    return '';
  }
}
