'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BetRecord } from '@/lib/bets';
import BetTicketCard from './BetTicketCard';
import { getSharedSocket } from '@/lib/socket';

const TABS = [
  { id: 'open', label: 'Open Bets' },
  { id: 'live', label: 'Live Bets' },
  { id: 'won', label: 'Won Bets' },
  { id: 'lost', label: 'Lost Bets' },
  { id: 'all', label: 'All Bets' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function MyBetsPanel() {
  const [tab, setTab] = useState<TabId>('all');
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = tab === 'open' ? 'open' : tab;
      const data = await api<BetRecord[]>(`/bets/history?status=${status}&limit=100`);
      setBets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSharedSocket();
    const refresh = () => load();
    socket.on('match:update', refresh);
    socket.on('match:finished', refresh);
    socket.on('match:goal', refresh);
    return () => {
      socket.off('match:update', refresh);
      socket.off('match:finished', refresh);
      socket.off('match:goal', refresh);
    };
  }, [load]);

  const searchByCode = async () => {
    if (!searchCode.trim()) return load();
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ type: string; bet: BetRecord; selections: BetRecord['selections'] }>(
        `/bets/booking/${searchCode.trim()}`
      );
      if (result.type === 'bet' && result.bet) {
        setBets([{ ...result.bet, selections: result.selections || result.bet.selections }]);
      } else {
        setError('Code is a saved slip — load it from the Booking Code page to place a bet.');
        setBets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking code not found');
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] touch-manipulation ${
              tab === t.id ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
          placeholder="Search booking code…"
          className="input-field flex-1 min-w-[200px] font-mono"
        />
        <button type="button" onClick={searchByCode} className="btn-secondary min-h-[44px] px-6">Search</button>
        {searchCode && (
          <button type="button" onClick={() => { setSearchCode(''); load(); }} className="btn-secondary min-h-[44px]">Clear</button>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="card text-center py-12 text-gray-500">Loading your bets…</div>
      ) : bets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No bets in this category yet.</p>
          <Link href="/" className="btn-primary inline-block px-6 py-3">Place a Bet</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <BetTicketCard
              key={bet.id}
              bet={bet}
              expanded={expanded === bet.id}
              onToggle={() => setExpanded(expanded === bet.id ? null : bet.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
