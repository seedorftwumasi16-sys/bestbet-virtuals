'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, getSocketUrl } from '@/lib/api';
import MatchCard from '@/components/MatchCard';
import MatchCenter from '@/components/virtual-league/MatchCenter';
import { io, Socket } from 'socket.io-client';
import { MatchCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { IconFootball } from '@/components/icons/FootballIcons';

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  home_logo?: string;
  away_logo?: string;
  scheduled_at: string;
  status: string;
  home_score?: number;
  away_score?: number;
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export default function MatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLive, setActiveLive] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
    const socket: Socket = io(getSocketUrl());

    socket.on('match:live', ({ matchId }: { matchId: string }) => {
      setActiveLive(matchId);
      loadMatches();
    });

    socket.on('match:finished', () => {
      setActiveLive(null);
      loadMatches();
    });

    const interval = setInterval(loadMatches, 30000);
    return () => { socket.disconnect(); clearInterval(interval); };
  }, []);

  const loadMatches = async () => {
    try {
      const [upcoming, live] = await Promise.all([
        api<Match[]>('/matches/upcoming'),
        api<Match[]>('/matches/live'),
      ]);
      setMatches(upcoming);
      setLiveMatches(live);
      if (live.length > 0 && !activeLive) setActiveLive(live[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wide">Match Center</h2>
            <span className="badge-live">LIVE</span>
          </div>
          {activeLive && <MatchCenter matchId={activeLive} />}
        </section>
      )}

      <section id="upcoming">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <IconFootball size={20} className="text-primary-500" />
              Upcoming Matches
            </h2>
          <CountdownTimer matches={matches} />
        </div>

        {matches.length === 0 ? (
          <div className="glass-panel text-center py-12 text-gray-500 border border-dark-600/40">
            <p className="text-lg font-semibold text-gray-400">No upcoming matches</p>
            <p className="text-sm mt-1">New matches generate automatically every few minutes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
              >
                <MatchCard match={match} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CountdownTimer({ matches }: { matches: Match[] }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const next = matches.find((m) => m.status === 'scheduled');
    if (!next) return;

    const tick = () => {
      const diff = new Date(next.scheduled_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Starting...'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matches]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl border border-primary-500/20">
      <span className="text-gray-400 text-xs font-medium">Next kickoff</span>
      <span className="text-primary-500 font-mono font-black text-sm tabular-nums">{timeLeft}</span>
    </div>
  );
}
