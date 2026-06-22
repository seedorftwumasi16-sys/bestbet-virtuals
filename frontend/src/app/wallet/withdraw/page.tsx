'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const PAYMENT_METHODS = [
  { id: 'mtn_momo', label: 'MTN MoMo' },
  { id: 'telecel_cash', label: 'Telecel Cash' },
  { id: 'airteltigo_money', label: 'AirtelTigo Money' },
];

export default function WithdrawPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState('mtn_momo');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, paymentMethod: method, phoneNumber: phone }),
      });
      setMessage('Withdrawal request submitted! Awaiting admin approval.');
      setTimeout(() => router.push('/wallet'), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Withdraw (GHS)</h1>
      <p className="text-gray-400 text-sm mb-6">Available: GHS {user?.balance?.toFixed(2)}</p>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Amount (GHS)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} className="input-field mt-1" min={10} max={user?.balance} required />
          </div>
          <div>
            <label className="text-sm text-gray-400">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field mt-1">
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0244123456" className="input-field mt-1" required />
          </div>
          {message && <p className="text-primary-500 text-sm">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>
    </div>
  );
}
