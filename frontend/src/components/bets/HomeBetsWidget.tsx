'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BetRecord } from '@/lib/bets';
import BetTicketCard from './BetTicketCard';

export default function HomeBetsWidget() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{
    recent: BetRecord[];
    active: BetRecord[];
    lastWon: BetRecord[];
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    api<typeof summary>('/bets/summary').then(setSummary).catch(console.error);
  }, [user]);

  if (!user || !summary) return null;

  const hasAny = summary.active.length || summary.lastWon.length || summary.recent.length;
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {summary.active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">My Active Bets</h3>
            <Link href="/tickets" className="text-xs text-primary-500 font-semibold">View all</Link>
          </div>
          {summary.active.slice(0, 2).map((b) => (
            <BetTicketCard key={b.id} bet={b} compact />
          ))}
        </div>
      )}
      {summary.lastWon.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Last Won Bets</h3>
            <Link href="/tickets" className="text-xs text-primary-500 font-semibold">View all</Link>
          </div>
          {summary.lastWon.slice(0, 2).map((b) => (
            <BetTicketCard key={b.id} bet={b} compact />
          ))}
        </div>
      )}
      {summary.recent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Recent Bets</h3>
            <Link href="/tickets" className="text-xs text-primary-500 font-semibold">View all</Link>
          </div>
          {summary.recent.slice(0, 2).map((b) => (
            <BetTicketCard key={b.id} bet={b} compact />
          ))}
        </div>
      )}
    </div>
  );
}
