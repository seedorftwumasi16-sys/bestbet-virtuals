'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';

export interface MatchSummary {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  home_logo?: string;
  away_logo?: string;
  home_star_rating?: number;
  away_star_rating?: number;
  scheduled_at: string;
  status: string;
  home_score?: number;
  away_score?: number;
  live_minute?: number;
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export type LiveMeta = { minute: number; home_score: number; away_score: number };

export interface LeagueStats {
  total_played: number;
  total_goals: number;
  avg_goals: string;
  yellow_cards: number;
  red_cards: number;
  live_count: number;
  season: string;
  match_interval_seconds: number;
  match_interval_minutes: number;
  betting_close_seconds: number;
  prize_pool: number;
  active_league: string | null;
  leader: { name: string; short_name: string; logo_url?: string; points: number } | null;
  next_match: {
    id: string;
    scheduled_at: string;
    home_name: string;
    home_short: string;
    home_logo?: string;
    away_name: string;
    away_short: string;
    away_logo?: string;
    league_name?: string;
  } | null;
}

type MatchesDataContextValue = {
  upcoming: MatchSummary[];
  live: MatchSummary[];
  liveMeta: Record<string, LiveMeta>;
  leagueStats: LeagueStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MatchesDataContext = createContext<MatchesDataContextValue | null>(null);

const POLL_MS = 60_000;
const SOCKET_DEBOUNCE_MS = 2_000;

function sameIds(a: MatchSummary[], b: MatchSummary[]) {
  if (a.length !== b.length) return false;
  return a.every((m, i) => {
    const n = b[i];
    if (!n) return false;
    return (
      m.id === n.id &&
      m.status === n.status &&
      m.scheduled_at === n.scheduled_at &&
      m.home_score === n.home_score &&
      m.away_score === n.away_score
    );
  });
}

function leagueStatsEqual(prev: LeagueStats | null, next: LeagueStats) {
  if (!prev) return false;
  return (
    prev.live_count === next.live_count &&
    prev.total_played === next.total_played &&
    prev.total_goals === next.total_goals &&
    prev.prize_pool === next.prize_pool &&
    prev.season === next.season &&
    prev.next_match?.id === next.next_match?.id &&
    prev.next_match?.scheduled_at === next.next_match?.scheduled_at
  );
}

export function MatchesDataProvider({
  children,
  leagueFilter = null,
}: {
  children: ReactNode;
  leagueFilter?: string | null;
}) {
  const [upcoming, setUpcoming] = useState<MatchSummary[]>([]);
  const [live, setLive] = useState<MatchSummary[]>([]);
  const [liveMeta, setLiveMeta] = useState<Record<string, LiveMeta>>({});
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetching = useRef(false);

  const fetchMatches = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const [nextUpcoming, nextLive] = await Promise.all([
        api<MatchSummary[]>('/matches/upcoming'),
        api<MatchSummary[]>('/matches/live'),
      ]);
      setUpcoming((prev) => (sameIds(prev, nextUpcoming) ? prev : nextUpcoming));
      setLive((prev) => (sameIds(prev, nextLive) ? prev : nextLive));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  const fetchLeagueStats = useCallback(async () => {
    try {
      const q = leagueFilter ? `?league=${encodeURIComponent(leagueFilter)}` : '';
      const data = await api<LeagueStats>(`/matches/league-stats${q}`);
      setLeagueStats((prev) => (leagueStatsEqual(prev, data) ? prev : data));
    } catch {
      /* non-fatal */
    }
  }, [leagueFilter]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchMatches(), fetchLeagueStats()]);
  }, [fetchMatches, fetchLeagueStats]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refresh();
    }, SOCKET_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const socket = getSharedSocket();
    const onLive = () => scheduleRefresh();
    const onFinished = () => scheduleRefresh();
    const onUpdate = (u: { matchId: string; minute: number; homeScore?: number; awayScore?: number }) => {
      if (u.homeScore === undefined) return;
      setLiveMeta((prev) => ({
        ...prev,
        [u.matchId]: { minute: u.minute, home_score: u.homeScore!, away_score: u.awayScore! },
      }));
      const patch = (list: MatchSummary[]) =>
        list.map((m) =>
          m.id === u.matchId
            ? { ...m, home_score: u.homeScore, away_score: u.awayScore, live_minute: u.minute, status: 'live' as const }
            : m
        );
      setUpcoming((prev) => patch(prev));
      setLive((prev) => patch(prev));
    };

    socket.on('match:live', onLive);
    socket.on('match:finished', onFinished);
    socket.on('match:update', onUpdate);
    socket.on('league:updated', onLive);
    socket.on('stats:updated', onLive);

    return () => {
      socket.off('match:live', onLive);
      socket.off('match:finished', onFinished);
      socket.off('match:update', onUpdate);
      socket.off('league:updated', onLive);
      socket.off('stats:updated', onLive);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  const value = useMemo(
    () => ({ upcoming, live, liveMeta, leagueStats, loading, error, refresh }),
    [upcoming, live, liveMeta, leagueStats, loading, error, refresh]
  );

  return <MatchesDataContext.Provider value={value}>{children}</MatchesDataContext.Provider>;
}

export function useMatchesData() {
  const ctx = useContext(MatchesDataContext);
  if (!ctx) throw new Error('useMatchesData must be used within MatchesDataProvider');
  return ctx;
}

export function useMatchesDataOptional() {
  return useContext(MatchesDataContext);
}
