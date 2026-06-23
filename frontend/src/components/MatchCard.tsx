'use client';

import { useBetSlip } from '@/context/BetSlipContext';
import { useMatchesDataOptional } from '@/context/MatchesDataContext';
import { formatOdds, MARKET_LABELS, SELECTION_LABELS, MARKET_GROUPS } from '@/lib/api';
import { formatMatchBookingCode, copyToClipboard } from '@/lib/bookingCode';
import { memo, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useCountdown } from '@/hooks/useCountdown';
import TeamLogo from '@/components/ui/TeamLogo';
import StarRating from '@/components/ui/StarRating';

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_short: string;
  away_short: string;
  home_logo?: string;
  away_logo?: string;
  home_star_rating?: number;
  away_star_rating?: number;
  home_score?: number;
  away_score?: number;
  live_minute?: number;
  scheduled_at: string;
  status: string;
  odds?: Array<{ market: string; selection: string; odds: number }>;
}

export default memo(function MatchCard({ match, featured }: { match: Match; featured?: boolean }) {
  const { addSelection, isSelected, bookingCode: slipCode } = useBetSlip();
  const matchesCtx = useMatchesDataOptional();
  const liveMeta = matchesCtx?.liveMeta?.[match.id];
  const [activeGroup, setActiveGroup] = useState('main');
  const [activeMarket, setActiveMarket] = useState('match_winner');
  const [copied, setCopied] = useState(false);
  const timeLeft = useCountdown(match.status === 'scheduled' ? match.scheduled_at : null);

  const isLive = match.status === 'live';
  const homeScore = liveMeta?.home_score ?? match.home_score ?? 0;
  const awayScore = liveMeta?.away_score ?? match.away_score ?? 0;
  const liveMinute = liveMeta?.minute ?? match.live_minute;
  const matchCode = formatMatchBookingCode(match.id);

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

  const copyCode = useCallback(async () => {
    const ok = await copyToClipboard(slipCode || matchCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [slipCode, matchCode]);

  return (
    <div
      className={clsx(
        'premium-match-card',
        featured && 'border-accent-500/30 shadow-gold',
        isLive && 'border-primary-500/40 shadow-neon'
      )}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <span>Booking:</span>
          <span className="text-accent-400 font-bold">{slipCode || matchCode}</span>
          <button type="button" onClick={copyCode} className="text-primary-500 hover:text-primary-400 ml-1 text-xs">
            {copied ? '✓' : '📋'}
          </button>
        </div>
        {isLive ? (
          <span className="badge-live-neon text-[10px]">
            LIVE • {liveMinute ?? 0}&apos;
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-400 font-medium">
            {match.status === 'scheduled' ? 'Upcoming' : match.status}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <TeamColumn
          name={match.home_team_name}
          short={match.home_short}
          logoUrl={match.home_logo}
          stars={match.home_star_rating}
        />
        <div className="text-center shrink-0 min-w-[100px]">
          {isLive || (homeScore > 0 || awayScore > 0) ? (
            <p className={`text-2xl sm:text-3xl font-black tabular-nums ${isLive ? 'score-glow-sm text-white' : 'text-primary-500'}`}>
              {homeScore} - {awayScore}
            </p>
          ) : (
            <>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">VS</p>
              {match.status === 'scheduled' && timeLeft && (
                <p className="text-accent-500 font-mono font-bold text-sm mt-1 tabular-nums">{timeLeft}</p>
              )}
            </>
          )}
        </div>
        <TeamColumn
          name={match.away_team_name}
          short={match.away_short}
          logoUrl={match.away_logo}
          stars={match.away_star_rating}
        />
      </div>

      <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
        {MARKET_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setActiveGroup(g.id); setActiveMarket(g.markets[0]); }}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors',
              activeGroup === g.id
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-dark-900 font-bold'
                : 'bg-dark-700/80 text-gray-400 hover:text-white'
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
              type="button"
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
            type="button"
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

function TeamColumn({
  name, short, logoUrl, stars,
}: { name: string; short: string; logoUrl?: string; stars?: number }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <TeamLogo short={short} logoUrl={logoUrl} size="md" />
      <p className="text-[10px] text-gray-300 mt-1.5 truncate font-medium">{name}</p>
      {stars && <div className="mt-0.5"><StarRating rating={stars} /></div>}
    </div>
  );
}
