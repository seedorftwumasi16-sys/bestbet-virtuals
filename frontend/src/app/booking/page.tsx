'use client';

import { useState } from 'react';
import { api, formatOdds, MARKET_LABELS, SELECTION_LABELS } from '@/lib/api';
import { useBetSlip } from '@/context/BetSlipContext';
import { useRouter } from 'next/navigation';

export default function BookingPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{
    bet: { booking_code: string; stake: number; total_odds: number; potential_win: number; status: string };
    selections: Array<{ market: string; selection: string; odds: number; home_team: string; away_team: string; status: string }>;
  } | null>(null);
  const [error, setError] = useState('');
  const { loadFromBooking } = useBetSlip();
  const router = useRouter();

  const search = async () => {
    setError('');
    setResult(null);
    try {
      const data = await api<typeof result>(`/bets/booking/${code}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not found');
    }
  };

  const loadToSlip = () => {
    if (!result) return;
    loadFromBooking(
      result.selections.map((s) => ({
        matchId: '',
        market: s.market,
        selection: s.selection,
        odds: s.odds,
        homeTeam: s.home_team,
        awayTeam: s.away_team,
      }))
    );
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Booking Code</h1>
      <div className="card space-y-4">
        <div>
          <label className="text-sm text-gray-400">Enter Booking Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC12345"
            className="input-field mt-1 font-mono text-lg"
          />
        </div>
        <button onClick={search} className="btn-primary w-full py-3">Search</button>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {result && (
          <div className="border-t border-dark-600 pt-4 space-y-3">
            <div className="flex justify-between">
              <span className="font-mono text-primary-500 font-bold">{result.bet.booking_code}</span>
              <span className="capitalize text-sm">{result.bet.status}</span>
            </div>
            {result.selections.map((s, i) => (
              <div key={i} className="bg-dark-700 rounded-lg p-3 text-sm">
                <p className="font-medium">{s.home_team} vs {s.away_team}</p>
                <p className="text-gray-400 text-xs">
                  {MARKET_LABELS[s.market]}: {SELECTION_LABELS[s.selection] || s.selection} @ {formatOdds(s.odds)}
                </p>
              </div>
            ))}
            <p className="text-sm">Odds: {formatOdds(result.bet.total_odds)} · Win: GHS {result.bet.potential_win}</p>
            <button onClick={loadToSlip} className="btn-secondary w-full">Load to Bet Slip</button>
          </div>
        )}
      </div>
    </div>
  );
}
