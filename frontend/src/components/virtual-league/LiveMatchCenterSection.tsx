'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import MatchCenter from '@/components/virtual-league/MatchCenter';
import { IconLive } from '@/components/icons/FootballIcons';

export default function LiveMatchCenterSection() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const pickMatch = async () => {
    try {
      const live = await api<Array<{ id: string }>>('/matches/live');
      if (live.length > 0) {
        setMatchId(live[0].id);
        setIsLive(true);
        return;
      }
      const upcoming = await api<Array<{ id: string }>>('/matches/upcoming');
      if (upcoming.length > 0) {
        setMatchId(upcoming[0].id);
        setIsLive(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pickMatch();
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000');

    socket.on('match:live', ({ matchId: id }: { matchId: string }) => {
      setMatchId(id);
      setIsLive(true);
    });

    socket.on('match:finished', () => {
      setIsLive(false);
      pickMatch();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <div className="glass-panel h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!matchId) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            {isLive && <IconLive size={18} />}
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {isLive ? 'Live Match Center' : 'Match Center'}
            </h2>
          </div>
          {isLive && (
            <span className="badge-live flex items-center gap-1.5 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              LIVE
            </span>
          )}
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-auto">
            SkyBet Virtual Stadium
          </span>
        </div>
        <MatchCenter matchId={matchId} />
      </motion.div>
    </section>
  );
}
