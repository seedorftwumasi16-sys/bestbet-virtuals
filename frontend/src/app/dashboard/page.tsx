'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalBets: 0, wonBets: 0, lostBets: 0, totalStake: 0 });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) loadStats();
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      const bets = await api<Array<{ status: string; stake: number }>>('/bets/history');
      setStats({
        totalBets: bets.length,
        wonBets: bets.filter((b) => b.status === 'won').length,
        lostBets: bets.filter((b) => b.status === 'lost').length,
        totalStake: bets.reduce((a, b) => a + parseFloat(String(b.stake)), 0),
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">SkyBet Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Bet Smart, Win More</p>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-2">Welcome, {user.first_name || user.email}</h2>
        <p className="text-gray-400 text-sm">Balance: <span className="text-primary-500 font-bold">{formatCurrency(user.balance)}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-bold">{stats.totalBets}</p>
          <p className="text-gray-400 text-sm">Total Bets</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary-500">{stats.wonBets}</p>
          <p className="text-gray-400 text-sm">Won</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{stats.lostBets}</p>
          <p className="text-gray-400 text-sm">Lost</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold">{formatCurrency(stats.totalStake)}</p>
          <p className="text-gray-400 text-sm">Total Staked</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/wallet" className="card hover:border-primary-500 transition-colors">
          <p className="font-semibold">Wallet</p>
          <p className="text-gray-400 text-sm">Deposit & Withdraw</p>
        </Link>
        <Link href="/tickets" className="card hover:border-primary-500 transition-colors">
          <p className="font-semibold">My Tickets</p>
          <p className="text-gray-400 text-sm">Bet history</p>
        </Link>
        <Link href="/booking" className="card hover:border-primary-500 transition-colors">
          <p className="font-semibold">Booking Code</p>
          <p className="text-gray-400 text-sm">Load shared bets</p>
        </Link>
      </div>
    </div>
  );
}
