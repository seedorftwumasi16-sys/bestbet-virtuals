'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { AdminCard, Field } from '../shared';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  balance: number;
}

export default function PaymentsSection() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [walletForm, setWalletForm] = useState({ userId: '', amount: 0, description: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api<Record<string, string>>('/admin/payment-config').then(setConfig).catch(console.error);
    api<UserRow[]>('/admin/users').then(setUsers).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    try {
      await api('/admin/payment-config', { method: 'PUT', body: JSON.stringify(config) });
      setMessage('Payment configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const credit = async () => {
    if (!walletForm.userId || walletForm.amount <= 0) {
      setError('Select a user and enter a valid amount.');
      return;
    }
    try {
      await api(`/admin/users/${walletForm.userId}/credit`, {
        method: 'POST',
        body: JSON.stringify({ amount: walletForm.amount, description: walletForm.description || 'Admin credit' }),
      });
      setMessage(`Credited ${formatCurrency(walletForm.amount)} successfully.`);
      setWalletForm({ userId: '', amount: 0, description: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credit failed');
    }
  };

  const debit = async () => {
    if (!walletForm.userId || walletForm.amount <= 0) {
      setError('Select a user and enter a valid amount.');
      return;
    }
    try {
      await api(`/admin/users/${walletForm.userId}/debit`, {
        method: 'POST',
        body: JSON.stringify({ amount: walletForm.amount, description: walletForm.description || 'Admin debit' }),
      });
      setMessage(`Debited ${formatCurrency(walletForm.amount)} successfully.`);
      setWalletForm({ userId: '', amount: 0, description: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Debit failed');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {message && <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</div>}

      <AdminCard title="Payment Configuration (MoMo Numbers)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">MTN MoMo</p>
            <input placeholder="Number" value={config.mtn_momo || ''} onChange={(e) => setConfig({ ...config, mtn_momo: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.mtn_momo_name || ''} onChange={(e) => setConfig({ ...config, mtn_momo_name: e.target.value })} className="input-field" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">Telecel Cash</p>
            <input placeholder="Number" value={config.telecel_number || ''} onChange={(e) => setConfig({ ...config, telecel_number: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.telecel_name || ''} onChange={(e) => setConfig({ ...config, telecel_name: e.target.value })} className="input-field" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-primary-500 font-bold">AirtelTigo Money</p>
            <input placeholder="Number" value={config.airteltigo_number || ''} onChange={(e) => setConfig({ ...config, airteltigo_number: e.target.value })} className="input-field" />
            <input placeholder="Account name" value={config.airteltigo_name || ''} onChange={(e) => setConfig({ ...config, airteltigo_name: e.target.value })} className="input-field" />
          </div>
        </div>
        <button onClick={saveConfig} className="btn-primary mt-4 min-h-[44px]">Save Payment Config</button>
      </AdminCard>

      <AdminCard title="Manual Wallet Control">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="User">
            <select
              value={walletForm.userId}
              onChange={(e) => setWalletForm({ ...walletForm, userId: e.target.value })}
              className="input-field min-h-[44px]"
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} — {formatCurrency(Number(u.balance))}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (GHS)">
            <input
              type="number"
              min={0}
              value={walletForm.amount || ''}
              onChange={(e) => setWalletForm({ ...walletForm, amount: parseFloat(e.target.value) || 0 })}
              className="input-field min-h-[44px]"
            />
          </Field>
          <Field label="Note">
            <input
              value={walletForm.description}
              onChange={(e) => setWalletForm({ ...walletForm, description: e.target.value })}
              placeholder="Reason…"
              className="input-field min-h-[44px]"
            />
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={credit} className="btn-primary flex-1 min-h-[44px]">Credit Wallet</button>
            <button onClick={debit} className="btn-secondary flex-1 min-h-[44px]">Debit Wallet</button>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
