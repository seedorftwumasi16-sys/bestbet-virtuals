'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, formatCurrency } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';
import { IconTrophy } from '@/components/icons/FootballIcons';

interface Winner {
  id: string;
  full_name: string;
  country?: string;
  username?: string;
  winning_amount: number | string;
  booking_slip_id: string;
  time_won: string;
  profile_picture?: string;
  is_pinned?: boolean;
}

interface WinnersResponse {
  winners: Winner[];
  auto_rotation: boolean;
  rotation_minutes: number;
}

const REFRESH_MS = 2 * 60 * 1000;

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ winner }: { winner: Winner }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (winner.profile_picture) {
    const src = winner.profile_picture.startsWith('http')
      ? winner.profile_picture
      : `${apiBase}${winner.profile_picture}`;
    return <img src={src} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500/30 shrink-0" />;
  }
  const parts = winner.full_name.split(' ');
  const initials = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ring-2 ring-primary-500/20 bg-gradient-to-br from-primary-500/30 to-dark-700 text-primary-400">
      {initials}
    </div>
  );
}

export default function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [live, setLive] = useState(false);
  const [popup, setPopup] = useState<{ name: string; amount: number } | null>(null);
  const prevTopId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<WinnersResponse>('/promotions/winners');
      setWinners(data.winners || []);
      setLive(data.auto_rotation);
      const top = data.winners?.[0];
      if (top && prevTopId.current && top.id !== prevTopId.current && data.auto_rotation) {
        setPopup({ name: top.full_name, amount: Number(top.winning_amount) });
        setTimeout(() => setPopup(null), 5000);
      }
      if (top) prevTopId.current = top.id;
    } catch {
      setWinners([]);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, REFRESH_MS);
    const socket = getSharedSocket();

    const onUpdated = (data: { winners: Winner[] }) => {
      if (data.winners?.length) {
        const top = data.winners[0];
        if (prevTopId.current && top.id !== prevTopId.current) {
          setPopup({ name: top.full_name, amount: Number(top.winning_amount) });
          setTimeout(() => setPopup(null), 5000);
        }
        prevTopId.current = top.id;
        setWinners(data.winners);
      }
    };

    const onNew = (data: { full_name: string; winning_amount: number }) => {
      setPopup({ name: data.full_name, amount: data.winning_amount });
      setTimeout(() => setPopup(null), 5000);
      load();
    };

    socket.on('winners:updated', onUpdated);
    socket.on('winner:new', onNew);

    return () => {
      clearInterval(poll);
      socket.off('winners:updated', onUpdated);
      socket.off('winner:new', onNew);
    };
  }, [load]);

  if (!winners.length) return null;

  return (
    <>
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-dark-800/95 border border-primary-500/40 shadow-neon-lg backdrop-blur-xl"
          >
            <p className="text-sm font-bold text-white whitespace-nowrap">
              🎉 {popup.name} just won {formatCurrency(popup.amount)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border border-accent-500/15 overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40 bg-gradient-to-r from-accent-500/10 to-transparent">
          <IconTrophy size={18} className="text-accent-500" stroke="#FFD700" />
          <h3 className="font-black text-white text-sm uppercase tracking-wider">Recent Winners</h3>
          {live && (
            <span className="ml-auto badge-live-neon text-[10px]">LIVE</span>
          )}
        </div>

        <div className="divide-y divide-dark-600/30">
          <AnimatePresence initial={false}>
            {winners.slice(0, 6).map((w) => (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-primary-500/5 transition-colors"
              >
                <Avatar winner={w} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {w.full_name}
                    {w.is_pinned && <span className="ml-1 text-accent-500">📌</span>}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">{w.booking_slip_id}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-primary-500 text-sm glow-text-green">
                    {formatCurrency(w.winning_amount)}
                  </p>
                  <p className="text-[10px] text-gray-500">{formatTimeAgo(w.time_won)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.section>
    </>
  );
}
