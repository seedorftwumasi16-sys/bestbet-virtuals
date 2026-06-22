'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, formatCurrency } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  status: string;
  created_at: string;
}

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) loadTransactions();
  }, [user, authLoading, router]);

  const loadTransactions = async () => {
    try {
      const data = await api<Transaction[]>('/wallet/transactions');
      setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-gray-400 text-sm">Available Balance</p>
          <p className="text-3xl font-bold text-primary-500 mt-2">{formatCurrency(user.balance)}</p>
        </div>
        <Link href="/wallet/deposit" className="card text-center hover:border-primary-500 transition-colors">
          <p className="text-primary-500 font-semibold text-lg">+ Deposit</p>
          <p className="text-gray-400 text-sm mt-1">MTN MoMo, Telecel, AirtelTigo</p>
        </Link>
        <Link href="/wallet/withdraw" className="card text-center hover:border-primary-500 transition-colors">
          <p className="text-primary-500 font-semibold text-lg">- Withdraw</p>
          <p className="text-gray-400 text-sm mt-1">Request withdrawal</p>
        </Link>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-dark-600">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Balance</th>
                  <th className="py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-dark-700">
                    <td className="py-3">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-3 capitalize">{t.type.replace('_', ' ')}</td>
                    <td className={`py-3 text-right font-medium ${t.amount >= 0 ? 'text-primary-500' : 'text-red-400'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 text-right">{formatCurrency(t.balance_after)}</td>
                    <td className="py-3 capitalize">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
