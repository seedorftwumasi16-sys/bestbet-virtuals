'use client';

import { formatCurrency, formatOdds, MARKET_LABELS, SELECTION_LABELS } from '@/lib/api';
import { BetRecord, BET_STATUS_STYLES, betStatusLabel } from '@/lib/bets';
import clsx from 'clsx';

interface Props {
  bet: BetRecord;
  expanded?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

export default function BetTicketCard({ bet, expanded = false, onToggle, compact = false }: Props) {
  const status = bet.display_status || bet.status;
  const badgeClass = BET_STATUS_STYLES[status] || BET_STATUS_STYLES.pending;

  return (
    <div className="rounded-2xl border border-dark-600/60 bg-gradient-to-br from-dark-800/90 to-dark-900/90 overflow-hidden shadow-lg">
      <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />
      <div className={clsx('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-accent-400 font-black text-lg tracking-wider">{bet.booking_code}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{new Date(bet.created_at).toLocaleString()}</p>
          </div>
          <span className={clsx('text-[10px] font-black px-2.5 py-1 rounded-full border uppercase shrink-0', badgeClass)}>
            {betStatusLabel(status, bet.is_settled)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Stake</p>
            <p className="font-bold text-white">{formatCurrency(bet.stake)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Total Odds</p>
            <p className="font-bold text-accent-400">{formatOdds(bet.total_odds)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Potential Win</p>
            <p className="font-bold text-primary-500">{formatCurrency(bet.potential_win)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase">{status === 'won' ? 'Won' : 'Actual Win'}</p>
            <p className={clsx('font-bold', status === 'won' ? 'text-emerald-400' : 'text-gray-400')}>
              {status === 'won' ? formatCurrency(bet.actual_win || bet.potential_win) : '—'}
            </p>
          </div>
        </div>

        {(expanded || !onToggle) && bet.selections?.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-dark-600/50 pt-3">
            {bet.selections.map((sel, i) => (
              <div key={sel.id || i} className="flex justify-between gap-2 text-xs bg-dark-700/40 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-200 truncate">{sel.home_team} vs {sel.away_team}</p>
                  <p className="text-gray-500 mt-0.5">
                    {MARKET_LABELS[sel.market] || sel.market} · {SELECTION_LABELS[sel.selection] || sel.selection}
                  </p>
                  {(sel.match_status === 'live' || sel.match_status === 'finished') && (
                    <p className="text-primary-500 font-mono mt-1">
                      {sel.match_status === 'live' ? `${sel.live_minute || 0}'` : 'FT'}{' '}
                      {sel.home_score ?? 0}-{sel.away_score ?? 0}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-primary-500 font-bold">{formatOdds(sel.odds)}</p>
                  <p className={clsx('capitalize text-[10px] mt-1', sel.status === 'won' ? 'text-emerald-400' : sel.status === 'lost' ? 'text-red-400' : 'text-gray-500')}>
                    {sel.status || 'pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {onToggle && (
          <button type="button" onClick={onToggle} className="mt-3 text-xs text-primary-500 font-semibold hover:underline">
            {expanded ? 'Hide selections' : `View ${bet.selections?.length || 0} selection(s)`}
          </button>
        )}
      </div>
    </div>
  );
}
