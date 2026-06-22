'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import MatchCard from './MatchCard';
import LiveMatchView from './LiveMatchView';
import { io, Socket } from 'socket.io-client';

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
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000');

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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-lg font-bold text-red-400">LIVE Matches</h2>
          </div>
          {activeLive && <LiveMatchView matchId={activeLive} />}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Upcoming Matches</h2>
          <CountdownTimer matches={matches} />
        </div>

        {matches.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p>No upcoming matches. New matches generate every 3 minutes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
    <div className="flex items-center gap-2 bg-dark-700 px-3 py-1.5 rounded-lg">
      <span className="text-gray-400 text-xs">Next match</span>
      <span className="text-primary-500 font-mono font-bold">{timeLeft}</span>
    </div>
  );
}
