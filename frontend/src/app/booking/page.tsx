'use client';

import { useState } from 'react';
import { api, formatOdds, MARKET_LABELS, SELECTION_LABELS } from '@/lib/api';
import { useBetSlip } from '@/context/BetSlipContext';
import { useRouter } from 'next/navigation';
import BetTicketCard from '@/components/bets/BetTicketCard';
import { BetRecord } from '@/lib/bets';

export default function BookingPage() {
  const [code, setCode] = useState('');
  const [bet, setBet] = useState<BetRecord | null>(null);
  const [slip, setSlip] = useState<{ code: string; stake: number; selections: Array<{ matchId?: string; market: string; selection: string; odds: number; homeTeam?: string; awayTeam?: string; home_team?: string; away_team?: string }> } | null>(null);
  const [error, setError] = useState('');
  const { loadFromBooking, setStake } = useBetSlip();
  const router = useRouter();

  const search = async () => {
    setError('');
    setBet(null);
    setSlip(null);
    try {
      const data = await api<{ type: string; bet?: BetRecord; selections?: BetRecord['selections']; code?: string; stake?: number }>(
        `/bets/booking/${code}`
      );
      if (data.type === 'slip') {
        setSlip({ code: data.code || code, stake: data.stake || 10, selections: data.selections || [] });
      } else if (data.bet) {
        setBet({ ...data.bet, selections: data.selections || data.bet.selections });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not found');
    }
  };

  const loadToSlip = () => {
    if (!slip) return;
    loadFromBooking(
      slip.selections.map((s) => ({
        matchId: String(s.matchId || ''),
        market: String(s.market),
        selection: String(s.selection),
        odds: Number(s.odds),
        homeTeam: String(s.homeTeam || s.home_team || 'Home'),
        awayTeam: String(s.awayTeam || s.away_team || 'Away'),
      }))
    );
    setStake(slip.stake);
    router.push('/');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">SkyBet Booking Code</h1>
      <p className="text-gray-500 text-sm mb-6">Search placed bets or load shared bet slips</p>
      <div className="card space-y-4">
        <div>
          <label className="text-sm text-gray-400">Enter Booking Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SBXXXXXXXX"
            className="input-field mt-1 font-mono text-lg tracking-widest"
          />
        </div>
        <button type="button" onClick={search} className="btn-primary w-full py-3 min-h-[44px]">Search</button>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {bet && <BetTicketCard bet={bet} expanded />}

        {slip && (
          <div className="border-t border-dark-600 pt-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase">Saved Bet Slip — not yet placed</p>
            <p className="font-mono text-accent-400 font-black text-xl">{slip.code}</p>
            {slip.selections.map((s, i) => (
              <div key={i} className="bg-dark-700 rounded-lg p-3 text-sm">
                <p className="font-medium">{s.homeTeam || s.home_team} vs {s.awayTeam || s.away_team}</p>
                <p className="text-gray-400 text-xs">
                  {MARKET_LABELS[s.market]} · {SELECTION_LABELS[s.selection] || s.selection} @ {formatOdds(s.odds)}
                </p>
              </div>
            ))}
            <button type="button" onClick={loadToSlip} className="btn-secondary w-full min-h-[44px]">Load to Bet Slip</button>
          </div>
        )}
      </div>
    </div>
  );
}
