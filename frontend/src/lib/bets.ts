export type BetDisplayStatus = 'pending' | 'live' | 'won' | 'lost' | 'voided' | 'settled';

export interface BetSelection {
  id?: string;
  match_id: string;
  market: string;
  selection: string;
  odds: number;
  status?: string;
  home_team: string;
  away_team: string;
  match_status?: string;
  home_score?: number;
  away_score?: number;
  live_minute?: number;
}

export interface BetRecord {
  id: string;
  user_id?: string;
  booking_code: string;
  stake: number;
  potential_win: number;
  total_odds: number;
  status: string;
  display_status: BetDisplayStatus;
  actual_win: number;
  is_settled?: boolean;
  settled_at?: string;
  created_at: string;
  selections: BetSelection[];
  selection_count?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export const BET_STATUS_STYLES: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
  live: 'text-sky-400 bg-sky-400/15 border-sky-400/30 animate-pulse',
  won: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
  lost: 'text-red-400 bg-red-500/15 border-red-500/30',
  voided: 'text-gray-400 bg-gray-500/15 border-gray-500/30',
  settled: 'text-primary-500 bg-primary-500/15 border-primary-500/30',
};

export function betStatusLabel(status: string, isSettled?: boolean): string {
  if (isSettled && (status === 'won' || status === 'lost')) return status === 'won' ? 'WON' : 'LOST';
  if (status === 'live') return 'LIVE';
  if (status === 'pending') return 'PENDING';
  if (status === 'won') return 'WON';
  if (status === 'lost') return 'LOST';
  if (status === 'voided') return 'VOIDED';
  return status.toUpperCase();
}

const LAST_BET_KEY = 'skybet_last_placed_bet';

export function saveLastPlacedBet(bet: BetRecord) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_BET_KEY, JSON.stringify(bet));
}

export function loadLastPlacedBet(): BetRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_BET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLastPlacedBet() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_BET_KEY);
}
