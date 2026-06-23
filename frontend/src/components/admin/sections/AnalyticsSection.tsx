'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { AdminCard } from '../shared';

export default function AnalyticsSection() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [daily, setDaily] = useState<{ transactions: Array<Record<string, unknown>>; bets: Array<Record<string, unknown>> } | null>(null);
  const [monthly, setMonthly] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    api<Record<string, unknown>>('/admin/analytics').then(setData).catch(console.error);
    api<typeof daily>('/admin/analytics/daily').then(setDaily).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/analytics/monthly').then(setMonthly).catch(console.error);
  }, []);

  if (!data) return <div className="text-gray-500">Loading analytics...</div>;

  const matchStats = data.matchStats as Record<string, number> | undefined;

  const cards: { label: string; value: string | number; highlight?: boolean }[] = [
    { label: 'Total Users', value: Number(data.totalUsers || 0) },
    { label: 'Active (24h)', value: Number(data.activeUsers24h || 0) },
    { label: 'Total Deposits', value: formatCurrency(Number(data.totalDeposits || 0)) },
    { label: 'Total Withdrawals', value: formatCurrency(Number(data.totalWithdrawals || 0)) },
    { label: 'Total Bets', value: Number(data.totalBets || 0) },
    { label: 'Total Stake', value: formatCurrency(Number(data.totalStake || 0)) },
    { label: 'Total Winnings', value: formatCurrency(Number(data.totalWinnings || 0)) },
    { label: 'House P/L', value: formatCurrency(Number(data.houseProfit || 0)), highlight: true },
    { label: 'Live Matches', value: matchStats?.live_matches ?? 0 },
    { label: 'Finished Matches', value: matchStats?.finished_matches ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <AdminCard key={c.label} className="text-center py-4">
            <p className={c.highlight ? 'text-2xl font-black text-primary-500' : 'text-2xl font-black text-white'}>{c.value}</p>
            <p className="text-gray-500 text-xs mt-1 font-medium">{c.label}</p>
          </AdminCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard title="Daily Activity (30 days)">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {daily?.bets?.slice(0, 14).map((row) => (
              <div key={String(row.date)} className="flex justify-between text-sm border-b border-dark-700 py-2">
                <span className="text-gray-400">{String(row.date)}</span>
                <span className="text-white font-semibold">{String(row.bets)} bets · {formatCurrency(Number(row.stake || 0))}</span>
              </div>
            ))}
            {!daily?.bets?.length && <p className="text-gray-500 text-sm">No recent bet data</p>}
          </div>
        </AdminCard>

        <AdminCard title="Monthly Reports">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {monthly.map((row) => (
              <div key={String(row.month)} className="flex justify-between text-sm border-b border-dark-700 py-2">
                <span className="text-gray-400">{String(row.month)}</span>
                <span className="text-white font-semibold">
                  {String(row.bets)} bets · Stake {formatCurrency(Number(row.stake || 0))}
                </span>
              </div>
            ))}
            {!monthly.length && <p className="text-gray-500 text-sm">No monthly data</p>}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
