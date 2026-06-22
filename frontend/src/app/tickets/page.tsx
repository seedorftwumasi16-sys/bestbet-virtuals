'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency, formatOdds } from '@/lib/api';

interface Bet {
  id: string;
  booking_code: string;
  stake: number;
  potential_win: number;
  total_odds: number;
  status: string;
  selection_count: number;
  created_at: string;
}

export default function TicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) loadBets();
  }, [user, authLoading, router]);

  const loadBets = async () => {
    try {
      const data = await api<Bet[]>('/bets/history');
      setBets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'won': return 'text-primary-500 bg-primary-500/20';
      case 'lost': return 'text-red-400 bg-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'voided': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400';
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Tickets</h1>
      {bets.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No bets placed yet</div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div key={bet.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-primary-500 font-bold">{bet.booking_code}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(bet.created_at).toLocaleString()} · {bet.selection_count} selections
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColor(bet.status)}`}>
                    {bet.status}
                  </span>
                  <p className="text-sm mt-2">
                    Stake: {formatCurrency(bet.stake)} · Odds: {formatOdds(bet.total_odds)}
                  </p>
                  <p className="text-primary-500 font-bold">
                    Win: {formatCurrency(bet.potential_win)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
