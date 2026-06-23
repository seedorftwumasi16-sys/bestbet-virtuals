'use client';

import { useMemo } from 'react';
import TeamLogo from '@/components/ui/TeamLogo';
import { IconFootball } from '@/components/icons/FootballIcons';
import { useMatchesData } from '@/context/MatchesDataContext';

export default function UpcomingMatchesStrip() {
  const { upcoming } = useMatchesData();

  const matches = useMemo(
    () => upcoming.filter((x) => x.status === 'scheduled').slice(0, 8),
    [upcoming]
  );

  if (!matches.length) return null;

  return (
    <div className="glass-panel border border-primary-500/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40 bg-dark-900/50">
        <IconFootball size={18} className="text-primary-500" />
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Upcoming Matches</h3>
      </div>
      <div className="flex gap-3 p-3 overflow-x-auto scrollbar-thin">
        {matches.map((m) => (
          <a
            key={m.id}
            href="#upcoming"
            className="flex-shrink-0 w-[140px] rounded-xl p-3 bg-dark-800/80 border border-dark-600/40 hover:border-primary-500/40 transition-colors hover:shadow-neon"
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
          </a>
        ))}
      </div>
    </div>
  );
}

function formatKickoff(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
