'use client';

import clsx from 'clsx';
import { LEAGUE_META } from '@/lib/teamColors';

export interface LeagueTab {
  code: string;
  name: string;
  logo?: string;
  team_count?: number;
}

interface Props {
  leagues: LeagueTab[];
  active: string | null;
  onChange: (league: string | null) => void;
}

export default function LeagueSelectorTabs({ leagues, active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={clsx(
          'shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all',
          !active
            ? 'bg-primary-500/20 border-primary-500 text-primary-400 shadow-[0_0_20px_rgba(0,230,118,0.15)]'
            : 'bg-dark-800/60 border-dark-600 text-gray-400 hover:border-primary-500/40'
        )}
      >
        All Leagues
      </button>
      {leagues.map((lg) => {
        const meta = LEAGUE_META[lg.name];
        const isActive = active === lg.name;
        return (
          <button
            key={lg.code}
            type="button"
            onClick={() => onChange(lg.name)}
            className={clsx(
              'shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2',
              isActive
                ? 'bg-primary-500/20 border-primary-500 text-white shadow-[0_0_20px_rgba(0,230,118,0.15)]'
                : 'bg-dark-800/60 border-dark-600 text-gray-400 hover:border-primary-500/40'
            )}
          >
            <span className="text-base">{lg.logo || meta?.flag || '⚽'}</span>
            <span>{lg.name}</span>
          </button>
        );
      })}
    </div>
  );
}
