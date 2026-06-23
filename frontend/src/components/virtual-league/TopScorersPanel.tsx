'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo';
import { IconTarget } from '@/components/icons/FootballIcons';

interface Scorer {
  player_name: string;
  goals: number;
  team_name: string;
  short_name: string;
  logo_url?: string;
}

export default function TopScorersPanel() {
  const [scorers, setScorers] = useState<Scorer[]>([]);

  useEffect(() => {
    api<Scorer[]>('/matches/top-scorers')
      .then(setScorers)
      .catch(() => setScorers([]));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel border border-primary-500/15 overflow-hidden h-full"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40">
        <IconTarget size={18} className="text-primary-500" />
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Top Scorers</h3>
      </div>

      <div className="p-3 space-y-1">
        {scorers.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No goals recorded yet</p>
        ) : (
          scorers.slice(0, 5).map((s, i) => (
            <motion.div
              key={`${s.player_name}-${i}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-dark-700/40 transition-colors"
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                  i === 0
                    ? 'bg-accent-500/20 text-accent-500 border border-accent-500/30'
                    : 'bg-dark-700 text-gray-500'
                }`}
              >
                {i + 1}
              </span>
              <TeamLogo short={s.short_name} logoUrl={s.logo_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{s.player_name}</p>
                <p className="text-[10px] text-gray-500 truncate">{s.team_name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-black text-primary-500 text-lg">{s.goals}</span>
                <IconFootballSmall />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function IconFootballSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
