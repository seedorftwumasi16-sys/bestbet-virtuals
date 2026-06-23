'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useBetSlip } from '@/context/BetSlipContext';

export default function LoadBookingWidget({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { loadFromBooking, setStake, setBookingCode } = useBetSlip();

  const load = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await api<{
        type?: string;
        selections: Array<{
          matchId: string;
          market: string;
          selection: string;
          odds: number;
          homeTeam?: string;
          awayTeam?: string;
        }>;
        stake?: number;
        code?: string;
      }>(`/bets/booking/${code.trim().toUpperCase()}`);

      const sels = (data.selections || []).map((s) => ({
        matchId: s.matchId,
        market: s.market,
        selection: s.selection,
        odds: s.odds,
        homeTeam: s.homeTeam || 'Home',
        awayTeam: s.awayTeam || 'Away',
      }));
      loadFromBooking(sels);
      if (data.stake) setStake(data.stake);
      if (data.code) setBookingCode(data.code);
      setMessage(`Loaded ${sels.length} selection(s)`);
      setCode('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Code not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-panel border border-primary-500/20 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Load Booking Code</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SB782941"
          className="input-field font-mono text-sm flex-1"
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-primary shrink-0 px-4 text-sm"
        >
          {loading ? '...' : 'Load'}
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-2 ${message.includes('Loaded') ? 'text-primary-500' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
