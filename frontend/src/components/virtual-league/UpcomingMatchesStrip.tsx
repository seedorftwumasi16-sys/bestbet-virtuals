'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import TeamLogo from '@/components/ui/TeamLogo';
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
}

export default function UpcomingMatchesStrip() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    api<Match[]>('/matches/upcoming')
      .then((m) => setMatches(m.filter((x) => x.status === 'scheduled').slice(0, 8)))
      .catch(() => {});
  }, []);

  if (!matches.length) return null;

  return (
    <div className="glass-panel border border-primary-500/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40 bg-dark-900/50">
        <IconFootball size={18} className="text-primary-500" />
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Upcoming Matches</h3>
      </div>
      <div className="flex gap-3 p-3 overflow-x-auto scrollbar-thin">
        {matches.map((m, i) => (
          <motion.a
            key={m.id}
            href="#upcoming"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="flex-shrink-0 w-[140px] rounded-xl p-3 bg-dark-800/80 border border-dark-600/40 hover:border-primary-500/40 transition-all hover:shadow-neon"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <TeamLogo short={m.home_short} logoUrl={m.home_logo} size="sm" />
              <span className="text-[10px] text-gray-500 font-bold">VS</span>
              <TeamLogo short={m.away_short} logoUrl={m.away_logo} size="sm" />
            </div>
            <p className="text-[10px] text-gray-400 text-center truncate">{m.home_short} vs {m.away_short}</p>
            <p className="text-[10px] text-primary-500 text-center font-mono font-bold mt-1">
              {formatKickoff(m.scheduled_at)}
            </p>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

function formatKickoff(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
