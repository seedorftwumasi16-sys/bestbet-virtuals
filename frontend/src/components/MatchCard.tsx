'use client';

import { useBetSlip } from '@/context/BetSlipContext';
import { formatOdds, MARKET_LABELS, SELECTION_LABELS, MARKET_GROUPS } from '@/lib/api';
import { memo, useState } from 'react';
import clsx from 'clsx';
import { useCountdown } from '@/hooks/useCountdown';
import TeamLogo from '@/components/ui/TeamLogo';

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
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export default memo(function MatchCard({ match, featured }: { match: Match; featured?: boolean }) {
  const { addSelection, isSelected } = useBetSlip();
  const [activeGroup, setActiveGroup] = useState('main');
  const [activeMarket, setActiveMarket] = useState('match_winner');
  const timeLeft = useCountdown(match.status === 'scheduled' ? match.scheduled_at : null);

  const group = MARKET_GROUPS.find((g) => g.id === activeGroup);
  const marketsInGroup = group?.markets || [];
  const marketOdds = match.odds?.filter((o) => o.market === activeMarket) || [];

  const handleSelect = (market: string, selection: string, odds: number) => {
    addSelection({
      matchId: match.id,
      market,
      selection,
      odds,
      homeTeam: match.home_team_name,
      awayTeam: match.away_team_name,
    });
  };

  return (
    <div
      className={clsx(
        'glass-panel border border-dark-600/40 hover:border-primary-500/25 transition-colors duration-300',
        featured && 'border-accent-500/25 shadow-gold'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <TeamBadge short={match.home_short} name={match.home_team_name} logoUrl={match.home_logo} />
          <div className="text-center min-w-[52px]">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">VS</p>
            {match.status === 'scheduled' && timeLeft && (
              <p className="text-accent-500 font-mono font-bold text-sm mt-1 tabular-nums">{timeLeft}</p>
            )}
            {match.status === 'live' && <span className="badge-live mt-1">LIVE</span>}
          </div>
          <TeamBadge short={match.away_short} name={match.away_team_name} logoUrl={match.away_logo} />
        </div>
        <span
          className={clsx(
            'text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
            match.status === 'live' ? 'badge-live' : 'bg-dark-700 text-gray-400'
          )}
        >
          {match.status === 'scheduled' ? 'Upcoming' : match.status}
        </span>
      </div>

      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        {MARKET_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setActiveGroup(g.id);
              setActiveMarket(g.markets[0]);
            }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors',
              activeGroup === g.id
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {marketsInGroup.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {marketsInGroup.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMarket(m)}
              className={clsx(
                'text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors',
                activeMarket === m ? 'bg-accent-500/20 text-accent-400 border border-accent-500/40' : 'text-gray-500'
              )}
            >
              {MARKET_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {marketOdds.map((o) => (
          <button
            key={`${o.market}-${o.selection}`}
            onClick={() => handleSelect(o.market, o.selection, o.odds)}
            className={clsx('odds-btn', isSelected(match.id, o.market, o.selection) && 'selected')}
          >
            <span className="text-[10px] text-gray-400 mb-0.5">
              {SELECTION_LABELS[o.selection] || o.selection.replace('_', ' ')}
            </span>
            <span className="text-primary-500 font-bold text-sm">{formatOdds(o.odds)}</span>
          </button>
        ))}
        {marketOdds.length === 0 && (
          <p className="text-gray-500 text-xs py-2">No odds for this market</p>
        )}
      </div>
    </div>
  );
});

function TeamBadge({ short, name, logoUrl }: { short: string; name: string; logoUrl?: string }) {
  return (
    <div className="text-center min-w-[72px]">
      <TeamLogo short={short} logoUrl={logoUrl} size="md" />
      <p className="text-[10px] text-gray-400 mt-1.5 max-w-[72px] truncate mx-auto">{name}</p>
    </div>
  );
}
