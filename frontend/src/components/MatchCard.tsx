'use client';

import { useBetSlip } from '@/context/BetSlipContext';
import { formatOdds, MARKET_LABELS, SELECTION_LABELS, MARKET_GROUPS } from '@/lib/api';
import { useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  scheduled_at: string;
  status: string;
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export default function MatchCard({ match, featured }: { match: Match; featured?: boolean }) {
  const { addSelection, isSelected } = useBetSlip();
  const [activeGroup, setActiveGroup] = useState('main');
  const [activeMarket, setActiveMarket] = useState('match_winner');

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

  const timeLeft = () => {
    const diff = new Date(match.scheduled_at).getTime() - Date.now();
    if (diff <= 0) return 'Starting...';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      layout
      className={clsx(
        'glass-panel border border-dark-600/40 hover:border-primary-500/25 transition-all duration-300 hover:shadow-neon',
        featured && 'border-accent-500/25 shadow-gold'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <TeamBadge short={match.home_short} name={match.home_team_name} />
          <div className="text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">VS</p>
            {match.status === 'scheduled' && (
              <p className="text-accent-500 font-mono font-bold text-sm mt-1">{timeLeft()}</p>
            )}
            {match.status === 'live' && <span className="badge-live mt-1">LIVE</span>}
          </div>
          <TeamBadge short={match.away_short} name={match.away_team_name} />
        </div>
        <span className={clsx(
          'text-xs px-2.5 py-1 rounded-full font-medium',
          match.status === 'live' ? 'badge-live' : 'bg-dark-700 text-gray-400'
        )}>
          {match.status === 'scheduled' ? 'Upcoming' : match.status}
        </span>
      </div>

      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        {MARKET_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => { setActiveGroup(g.id); setActiveMarket(g.markets[0]); }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all',
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
                'text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-all',
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
    </motion.div>
  );
}

function TeamBadge({ short, name }: { short: string; name: string }) {
  return (
    <div className="text-center">
      <div className="w-11 h-11 bg-gradient-to-br from-dark-700 to-dark-600 rounded-xl flex items-center justify-center text-xs font-black border border-dark-600 shadow-inner">
        {short}
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 max-w-[72px] truncate">{name}</p>
    </div>
  );
}
