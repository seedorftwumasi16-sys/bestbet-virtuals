'use client';

import { IconChart, IconFootball } from '@/components/icons/FootballIcons';
import { useMatchesData } from '@/context/MatchesDataContext';

export default function LeagueStatisticsPanel() {
  const { leagueStats: stats } = useMatchesData();

  const items = [
    { label: 'Matches Played', value: stats?.total_played ?? 0, icon: IconChart, color: 'text-primary-500' },
    { label: 'Goals Scored', value: stats?.total_goals ?? 0, icon: IconFootball, color: 'text-white' },
    { label: 'Avg Goals', value: stats?.avg_goals ?? '0.00', icon: IconChart, color: 'text-accent-500' },
    { label: 'Yellow Cards', value: stats?.yellow_cards ?? 0, icon: YellowCardIcon, color: 'text-yellow-400' },
    { label: 'Red Cards', value: stats?.red_cards ?? 0, icon: RedCardIcon, color: 'text-red-400' },
  ];

  return (
    <div className="glass-panel border border-primary-500/15 overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/40">
        <IconChart size={18} className="text-primary-500" />
        <h3 className="font-black text-white text-sm uppercase tracking-wider">League Statistics</h3>
      </div>

      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-dark-800/60 rounded-xl p-3 border border-dark-600/30 hover:border-primary-500/25 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon size={14} className={item.color} />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{item.label}</p>
            </div>
            <p className={`font-black text-xl ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function YellowCardIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" fill="#facc15" opacity="0.9" />
    </svg>
  );
}

function RedCardIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" fill="#ef4444" opacity="0.9" />
    </svg>
  );
}
