const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export function formatCurrency(amount: number | string) {
  return `GHS ${parseFloat(String(amount)).toFixed(2)}`;
}

export function formatOdds(odds: number | string) {
  return parseFloat(String(odds)).toFixed(2);
}

export const MARKET_LABELS: Record<string, string> = {
  match_winner: 'Match Winner',
  full_time: 'Full Time',
  double_chance: 'Double Chance',
  draw_no_bet: 'Draw No Bet',
  over_under: 'Over/Under',
  btts: 'Both Teams To Score',
  correct_score: 'Correct Score',
  half_time: 'Half Time',
  first_goal: 'First Goal',
  last_goal: 'Last Goal',
  total_goals: 'Total Goals',
  total_corners: 'Total Corners',
  total_cards: 'Total Cards',
};

export const SELECTION_LABELS: Record<string, string> = {
  home: 'Home',
  away: 'Away',
  draw: 'Draw',
  home_or_draw: '1X',
  home_or_away: '12',
  draw_or_away: 'X2',
  yes: 'Yes',
  no: 'No',
  no_goal: 'No Goal',
};

export const MARKET_GROUPS = [
  { id: 'main', label: 'Main', markets: ['match_winner', 'double_chance', 'draw_no_bet'] },
  { id: 'goals', label: 'Goals', markets: ['over_under', 'btts', 'total_goals', 'first_goal', 'last_goal'] },
  { id: 'special', label: 'Special', markets: ['correct_score', 'half_time', 'full_time'] },
  { id: 'stats', label: 'Stats', markets: ['total_corners', 'total_cards'] },
];

export const PAYMENT_INSTRUCTIONS = {
  mtn_momo: { number: '0551234567', name: 'BestBet Virtuals', network: 'MTN MoMo' },
  telecel_cash: { number: '0201234567', name: 'BestBet Virtuals', network: 'Telecel Cash' },
  airteltigo_money: { number: '0271234567', name: 'BestBet Virtuals', network: 'AirtelTigo Money' },
};
