const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const isDev = process.env.NODE_ENV === 'development';

/**
 * In Next.js dev, always use same-origin `/api` (rewrites proxy to backend).
 * Avoids CORS / wrong-host issues when opening via 127.0.0.1 or LAN IP.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return configuredApiUrl;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';
  // Same-origin /api proxy on Vercel avoids CORS and wrong API host issues
  if (host.endsWith('.vercel.app')) return '';
  return configuredApiUrl;
}

export function getSocketUrl(): string {
  const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || configuredApiUrl).replace(/\/$/, '');
  if (typeof window === 'undefined') return socketUrl;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    return socketUrl;
  }
  return socketUrl;
}

export function getConfiguredApiUrl(): string {
  return configuredApiUrl;
}

export type ApiHealth = {
  status: string;
  service?: string;
  database?: string;
  dbMode?: string;
  port?: number;
  error?: string;
};

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function checkApiHealth(): Promise<ApiHealth> {
  const base = getApiBaseUrl();
  const url = `${base}/api/health`;
  try {
    const res = await fetch(url, { signal: createTimeoutSignal(8000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'error', error: data.error || `HTTP ${res.status}` };
    return data as ApiHealth;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      status: 'error',
      error: msg.includes('fetch')
        ? `Cannot reach backend at ${configuredApiUrl}. Start it with: cd backend && npm run dev`
        : msg,
    };
  }
}

function formatFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
      return `API request timed out. Backend at ${configuredApiUrl} may be hung — restart it.`;
    }
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      return `Cannot connect to API (${configuredApiUrl}). Ensure the backend is running on port 4000.`;
    }
    return err.message;
  }
  return 'Request failed';
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}/api${path}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? createTimeoutSignal(30000),
    });
  } catch (err) {
    throw new Error(formatFetchError(err));
  }

  let data: Record<string, unknown> = {};
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(`API error (${res.status}): ${text.slice(0, 120) || 'empty response'}`);
  }

  if (!res.ok) {
    const message =
      (typeof data.error === 'string' && data.error) ||
      (typeof data.message === 'string' && data.message) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

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
  mtn_momo: { number: '0551234567', name: 'SkyBet', network: 'MTN MoMo' },
  telecel_cash: { number: '0201234567', name: 'SkyBet', network: 'Telecel Cash' },
  airteltigo_money: { number: '0271234567', name: 'SkyBet', network: 'AirtelTigo Money' },
};
