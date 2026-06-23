'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';

interface MatchEvent {
  event_type: string;
  minute: number;
  team_name?: string;
  description?: string;
}

interface MatchData {
  match: {
    id: string;
    home_team_name: string;
    away_team_name: string;
    home_short: string;
    away_short: string;
    home_score: number;
    away_score: number;
    possession_home: number;
    possession_away: number;
    shots_home: number;
    shots_away: number;
    corners_home: number;
    corners_away: number;
    yellow_cards_home: number;
    yellow_cards_away: number;
    red_cards_home?: number;
    red_cards_away?: number;
    fouls_home?: number;
    fouls_away?: number;
    status: string;
  };
  events: MatchEvent[];
}

export default function LiveMatchView({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchData | null>(null);
  const [minute, setMinute] = useState(0);
  const [phase, setPhase] = useState('walkout');
  const [commentary, setCommentary] = useState('');
  const [highlights, setHighlights] = useState<MatchEvent[]>([]);
  const [goalFlash, setGoalFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMatch = useCallback(async () => {
    try {
      const res = await api<MatchData>(`/matches/${matchId}`);
      setData(res);
      setHighlights(res.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match');
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
    const socket = getSharedSocket();

    socket.on('match:update', (update: {
      matchId: string; minute: number; phase?: string;
      homeScore?: number; awayScore?: number;
      events?: MatchEvent[]; commentary?: string;
    }) => {
      if (update.matchId !== matchId) return;
      if (update.phase) setPhase(update.phase);
      if (update.minute) setMinute(update.minute);
      if (update.commentary) setCommentary(update.commentary);
      if (update.homeScore !== undefined) {
        setData((prev) => prev ? {
          ...prev,
          match: { ...prev.match, home_score: update.homeScore!, away_score: update.awayScore! },
        } : prev);
      }
      if (update.events?.length) {
        setHighlights((prev) => [...prev, ...update.events!]);
      }
    });

    socket.on('match:goal', ({ matchId: id }: { matchId: string }) => {
      if (id === matchId) {
        setGoalFlash(true);
        setTimeout(() => setGoalFlash(false), 2000);
      }
    });

    socket.on('match:finished', ({ matchId: id }: { matchId: string }) => {
      if (id === matchId) loadMatch();
    });

    return () => {
      socket.off('match:update');
      socket.off('match:goal');
      socket.off('match:finished');
    };
  }, [matchId, loadMatch]);

  if (error) {
    return (
      <div className="card-glow text-center py-8 text-red-400 border border-red-500/30">
        <p className="font-semibold">Could not load match</p>
        <p className="text-sm mt-1 text-gray-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;
  const m = data.match;

  return (
    <div className="card-glow overflow-hidden">
      <div className="relative bg-gradient-to-b from-green-900/40 to-dark-800 -mx-4 -mt-4 px-4 pt-4 pb-2 mb-4 border-b border-green-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {phase === 'live' || phase === 'kickoff' ? (
              <span className="badge-live animate-pulse">● LIVE</span>
            ) : (
              <span className="text-accent-500 text-xs font-bold uppercase">{phase}</span>
            )}
            <span className="text-gray-400 text-sm font-mono">{minute}&apos;</span>
          </div>
          <span className="text-gray-500 text-xs">Virtual Stadium</span>
        </div>

        <AnimatePresence>
          {phase === 'walkout' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4 text-gray-400 text-sm"
            >
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                🏟️ Teams entering the stadium...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-6 sm:gap-10 py-4">
        <TeamScore name={m.home_team_name} short={m.home_short} />
        <div className="text-center relative">
          <p
            className={`text-4xl sm:text-5xl font-black tabular-nums transition-colors duration-300 ${
              goalFlash ? 'text-accent-500' : 'text-primary-500'
            }`}
          >
            {m.home_score} - {m.away_score}
          </p>
          {goalFlash && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-accent-500 font-bold text-sm animate-pulse">
              GOAL!
            </div>
          )}
        </div>
        <TeamScore name={m.away_team_name} short={m.away_short} />
      </div>

      <div className="relative bg-gradient-to-b from-green-700/30 to-green-900/20 rounded-2xl h-28 sm:h-32 mb-4 overflow-hidden border border-green-600/20">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-20 h-20 border-2 border-white rounded-full" />
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
        {phase === 'live' && (
          <motion.div
            className="absolute w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50 top-1/2 -translate-y-1/2"
            animate={{ left: ['8%', '85%', '15%', '70%', '45%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {commentary && (
        <div className="bg-dark-700/50 rounded-xl px-3 py-2 mb-4 text-sm text-gray-300 border border-dark-600">
          <span className="text-accent-500 text-xs font-bold mr-2">COMMENTARY</span>
          {commentary}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs mb-4">
        <Stat label="Possession" home={m.possession_home} away={m.possession_away} suffix="%" />
        <Stat label="Shots" home={m.shots_home} away={m.shots_away} />
        <Stat label="Corners" home={m.corners_home} away={m.corners_away} />
        <Stat label="Cards" home={(m.yellow_cards_home || 0) + (m.red_cards_home || 0)} away={(m.yellow_cards_away || 0) + (m.red_cards_away || 0)} />
      </div>

      {highlights.length > 0 && (
        <div className="border-t border-dark-600 pt-3">
          <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Match Timeline</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {highlights.slice(-12).map((e, i) => (
              <div key={`${e.minute}-${e.event_type}-${i}`} className="text-xs text-gray-300 flex gap-2 py-0.5">
                <span className="text-accent-500 font-mono font-bold w-8">{e.minute}&apos;</span>
                <span className="truncate">{e.description || e.event_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamScore({ name, short }: { name: string; short: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-dark-700 to-dark-600 rounded-2xl flex items-center justify-center text-lg font-black border border-dark-600 mx-auto shadow-lg">
        {short}
      </div>
      <p className="text-xs text-gray-300 mt-2 max-w-[90px] truncate mx-auto">{name}</p>
    </div>
  );
}

function Stat({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  return (
    <div className="bg-dark-700/50 rounded-xl p-2">
      <p className="text-gray-500 mb-1">{label}</p>
      <div className="flex justify-between font-bold mb-1">
        <span className="text-primary-500">{home}{suffix}</span>
        <span className="text-blue-400">{away}{suffix}</span>
      </div>
      <div className="flex h-1 rounded-full overflow-hidden bg-dark-600">
        <div className="bg-primary-500 transition-all duration-500" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(away / total) * 100}%` }} />
      </div>
    </div>
  );
}
