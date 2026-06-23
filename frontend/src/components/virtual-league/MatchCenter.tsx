'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getSocketUrl } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import TeamLogo from '@/components/ui/TeamLogo';

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
    home_logo?: string;
    away_logo?: string;
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

export default function MatchCenter({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchData | null>(null);
  const [minute, setMinute] = useState(0);
  const [phase, setPhase] = useState('walkout');
  const [commentary, setCommentary] = useState('');
  const [highlights, setHighlights] = useState<MatchEvent[]>([]);
  const [goalFlash, setGoalFlash] = useState(false);

  useEffect(() => {
    loadMatch();
    const socket: Socket = io(getSocketUrl());

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

    return () => { socket.disconnect(); };
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const res = await api<MatchData>(`/matches/${matchId}`);
      setData(res);
      setHighlights(res.events || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (!data) {
    return (
      <div className="glass-panel p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const m = data.match;
  const goalEvents = highlights.filter((e) => e.event_type === 'goal' || (e.description || '').includes('GOAL'));

  return (
    <div className="glass-panel overflow-hidden border border-primary-500/20 shadow-neon">
      {/* Header */}
      <div className="relative px-4 py-3 border-b border-dark-600/40 bg-gradient-to-r from-primary-500/10 via-dark-800/50 to-accent-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Match Center</span>
            {phase === 'live' || phase === 'kickoff' ? (
              <span className="badge-live flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
                LIVE
              </span>
            ) : (
              <span className="text-accent-500 text-xs font-bold uppercase">{phase}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">SkyBet Stadium</span>
            <span className="font-mono text-primary-500 font-bold text-sm bg-dark-700/80 px-2 py-0.5 rounded-lg">
              {minute}&apos;
            </span>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className={`px-4 sm:px-8 py-8 sm:py-10 transition-colors duration-500 ${goalFlash ? 'bg-accent-500/15' : 'bg-gradient-to-b from-dark-900/40 to-transparent'}`}>
        <div className="flex items-center justify-center gap-6 sm:gap-16">
          <TeamBlock
            name={m.home_team_name}
            short={m.home_short}
            logoUrl={m.home_logo}
            align="left"
          />
          <div className="text-center relative min-w-[120px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${m.home_score}-${m.away_score}`}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-5xl sm:text-7xl lg:text-8xl font-black tabular-nums tracking-wider ${
                  goalFlash ? 'text-accent-500' : 'text-white'
                }`}
                style={{ textShadow: goalFlash ? '0 0 30px rgba(255,215,0,0.5)' : '0 0 20px rgba(0,230,118,0.2)' }}
              >
                {m.home_score}
                <span className="text-gray-600 mx-2">:</span>
                {m.away_score}
              </motion.div>
            </AnimatePresence>
            {goalFlash && (
              <motion.p
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-accent-500 font-black text-sm mt-1 tracking-widest"
              >
                GOAL!
              </motion.p>
            )}
          </div>
          <TeamBlock
            name={m.away_team_name}
            short={m.away_short}
            logoUrl={m.away_logo}
            align="right"
          />
        </div>
      </div>

      {/* Pitch visualization */}
      <div className="relative mx-4 mb-4 h-24 sm:h-28 rounded-xl overflow-hidden border border-primary-500/20 bg-gradient-to-b from-green-800/40 to-green-950/60">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
        </div>
        {phase === 'live' && (
          <motion.div
            className="absolute w-3 h-3 bg-primary-500 rounded-full shadow-neon top-1/2 -translate-y-1/2"
            animate={{ left: ['10%', '80%', '20%', '65%', '45%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="absolute top-2 left-3 right-3 flex justify-between opacity-40">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-white rounded-full"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ delay: i * 0.15, repeat: Infinity, duration: 2 }}
            />
          ))}
        </div>
      </div>

      {/* Commentary */}
      <AnimatePresence>
        {commentary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-4"
          >
            <div className="bg-dark-700/50 rounded-xl px-4 py-3 border border-primary-500/15">
              <div className="flex items-start gap-2">
                <span className="text-accent-500 text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5">
                  📢 Live
                </span>
                <p className="text-gray-200 text-sm leading-relaxed">{commentary}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="px-4 pb-4 space-y-3">
        <StatBar label="Possession" home={m.possession_home} away={m.possession_away} suffix="%" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniStat label="Shots" home={m.shots_home} away={m.shots_away} />
          <MiniStat label="Corners" home={m.corners_home} away={m.corners_away} />
          <MiniStat label="Yellow" home={m.yellow_cards_home} away={m.yellow_cards_away} emoji="🟨" />
          <MiniStat label="Red" home={m.red_cards_home || 0} away={m.red_cards_away || 0} emoji="🟥" />
        </div>
      </div>

      {/* Goal timeline */}
      {goalEvents.length > 0 && (
        <div className="px-4 pb-3 border-t border-dark-600/40 pt-3">
          <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Goal Timeline</h4>
          <div className="flex flex-wrap gap-2">
            {goalEvents.map((e, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs bg-primary-500/15 text-primary-500 border border-primary-500/30 px-2.5 py-1 rounded-lg font-semibold"
              >
                ⚽ {e.minute}&apos;
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Match timeline / commentary log */}
      {highlights.length > 0 && (
        <div className="border-t border-dark-600/40 px-4 py-3 bg-dark-900/40">
          <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Match Events</h4>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {highlights.slice(-15).reverse().map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs flex gap-2 py-1 border-b border-dark-700/50 last:border-0"
              >
                <span className="text-accent-500 font-mono font-bold w-7 shrink-0">{e.minute}&apos;</span>
                <span className="text-gray-300 leading-relaxed">{e.description || e.event_type}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamBlock({
  name,
  short,
  logoUrl,
  align,
}: {
  name: string;
  short: string;
  logoUrl?: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo short={short} logoUrl={logoUrl} size="xl" />
      <div className="min-w-0 max-w-[100px] sm:max-w-[140px]">
        <p className="font-bold text-white text-sm truncate">{name}</p>
        <p className="text-gray-500 text-xs">{short}</p>
      </div>
    </div>
  );
}

function StatBar({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-primary-500 font-bold">{home}{suffix}</span>
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="text-blue-400 font-bold">{away}{suffix}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-dark-700 gap-0.5">
        <motion.div
          className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-l-full"
          animate={{ width: `${(home / total) * 100}%` }}
          transition={{ duration: 0.6 }}
          style={{ width: `${(home / total) * 100}%` }}
        />
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-r-full"
          style={{ width: `${(away / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  home,
  away,
  emoji,
}: {
  label: string;
  home: number;
  away: number;
  emoji?: string;
}) {
  return (
    <div className="bg-dark-700/40 rounded-xl p-2.5 text-center border border-dark-600/30">
      <p className="text-[10px] text-gray-500 mb-1">{emoji ? `${emoji} ${label}` : label}</p>
      <div className="flex justify-between font-bold text-sm">
        <span className="text-primary-500">{home}</span>
        <span className="text-gray-600">-</span>
        <span className="text-blue-400">{away}</span>
      </div>
    </div>
  );
}
