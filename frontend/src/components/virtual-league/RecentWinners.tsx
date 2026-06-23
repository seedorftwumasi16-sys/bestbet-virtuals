'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, formatCurrency } from '@/lib/api';
import { IconTrophy } from '@/components/icons/FootballIcons';

interface Winner {
  booking_code: string;
  potential_win: number | string;
  first_name: string;
  last_name?: string;
  settled_at?: string;
  created_at?: string;
}

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

function Avatar({ name, lastName }: { name: string; lastName?: string }) {
  const initials = `${name?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  const hues = [140, 200, 280, 45, 320, 170];
  const hue = hues[(name?.charCodeAt(0) || 0) % hues.length];

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ring-2 ring-white/10"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},70%,35%) 0%, hsl(${hue},80%,25%) 100%)`,
        color: `hsl(${hue},90%,75%)`,
      }}
    >
      {initials}
    </div>
  );
}

export default function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    api<Winner[]>('/promotions/winners')
      .then(setWinners)
      .catch(() => setWinners([]));
  }, []);

  if (!winners.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel border border-accent-500/15 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40 bg-accent-500/5">
        <IconTrophy size={18} className="text-accent-500" stroke="#FFD700" />
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Recent Winners</h3>
        <span className="ml-auto text-[10px] text-accent-500 font-bold px-2 py-0.5 rounded-full bg-accent-500/10 border border-accent-500/20">
          LIVE
        </span>
      </div>

      <div className="divide-y divide-dark-600/30">
        {winners.slice(0, 6).map((w, i) => (
          <motion.div
            key={`${w.booking_code}-${i}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ backgroundColor: 'rgba(0,230,118,0.04)' }}
            className="flex items-center gap-3 px-4 py-3 transition-colors"
          >
            <Avatar name={w.first_name} lastName={w.last_name} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {w.first_name}{w.last_name ? ` ${w.last_name}` : ''}
              </p>
              <p className="text-[10px] text-gray-500 font-mono">{w.booking_code}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-primary-500 text-sm">
                {formatCurrency(w.potential_win)}
              </p>
              <p className="text-[10px] text-gray-500">{formatTimeAgo(w.settled_at || w.created_at)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
