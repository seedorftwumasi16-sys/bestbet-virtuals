'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, PAYMENT_INSTRUCTIONS } from '@/lib/api';

const PAYMENT_METHODS = [
  { id: 'mtn_momo', label: 'MTN MoMo', color: 'bg-yellow-500' },
  { id: 'telecel_cash', label: 'Telecel Cash', color: 'bg-red-500' },
  { id: 'airteltigo_money', label: 'AirtelTigo Money', color: 'bg-blue-500' },
];

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState('mtn_momo');
  const [phone, setPhone] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('amount', String(amount));
      formData.append('paymentMethod', method);
      formData.append('phoneNumber', phone);
      if (screenshot) formData.append('screenshot', screenshot);

      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/wallet/deposit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Deposit request submitted! Awaiting admin approval.');
      setTimeout(() => router.push('/wallet'), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Deposit (GHS)</h1>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Amount (GHS)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} className="input-field mt-1" min={5} required />
            <div className="flex gap-2 mt-2">
              {[10, 25, 50, 100, 200].map((v) => (
                <button key={v} onClick={() => setAmount(v)} className="flex-1 bg-dark-700 hover:bg-dark-600 text-xs py-1 rounded">{v}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                    method === m.id ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 bg-dark-700'
                  }`}
                >
                  <div className={`w-3 h-3 ${m.color} rounded-full mx-auto mb-1`} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {PAYMENT_INSTRUCTIONS[method as keyof typeof PAYMENT_INSTRUCTIONS] && (
            <div className="bg-accent-500/10 border border-accent-500/30 rounded-xl p-4 text-sm">
              <p className="font-bold text-accent-400 mb-2">Payment Instructions</p>
              <p>Send <strong>GHS {amount}</strong> to:</p>
              <p className="font-mono text-lg font-bold text-white mt-1">{PAYMENT_INSTRUCTIONS[method as keyof typeof PAYMENT_INSTRUCTIONS].number}</p>
              <p className="text-gray-400 text-xs mt-1">{PAYMENT_INSTRUCTIONS[method as keyof typeof PAYMENT_INSTRUCTIONS].name} · {PAYMENT_INSTRUCTIONS[method as keyof typeof PAYMENT_INSTRUCTIONS].network}</p>
              <p className="text-gray-500 text-xs mt-2">Use your phone number as reference, then upload screenshot below.</p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0244123456" className="input-field mt-1" required />
          </div>

          <div>
            <label className="text-sm text-gray-400">Payment Screenshot</label>
            <input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="mt-1 text-sm text-gray-400" />
          </div>

          <p className="text-xs text-gray-500">Send payment to our MoMo number, then upload screenshot for admin approval.</p>

          {message && <p className="text-primary-500 text-sm">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Submitting...' : 'Submit Deposit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
