'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, formatCurrency, PAYMENT_NETWORK_LABELS } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface WithdrawalRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  amount: number;
  payment_method: string;
  phone_number: string;
  status: string;
  created_at: string;
  admin_note?: string;
}

const STATUS_FILTERS = ['all', 'pending', 'completed', 'rejected'] as const;

export default function WithdrawalsSection() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (status !== 'all') q.set('status', status);
      if (search.trim()) q.set('search', search.trim());
      const data = await api<WithdrawalRow[]>(`/admin/withdrawals?${q}`);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setError(null);
    try {
      await api(`/admin/withdrawals/${id}/approve`, { method: 'PUT' });
      setSuccess('Withdrawal approved — wallet debited.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const reject = async (id: string) => {
    const note = window.prompt('Rejection reason (optional):') || 'Rejected by admin';
    setError(null);
    try {
      await api(`/admin/withdrawals/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) });
      setSuccess('Withdrawal rejected — user notified.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this withdrawal request?')) return;
    try {
      await api(`/admin/withdrawals/${id}`, { method: 'DELETE' });
      setSuccess('Withdrawal request deleted.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}

      <AdminCard title="Withdrawal Requests">
        <div className="flex flex-wrap gap-3 mb-4">
          <Field label="Search user">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, name…"
              className="input-field min-w-[200px]"
            />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={load} className="btn-primary min-h-[44px] px-6">Search</button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading withdrawals…</p>
        ) : (
          <AdminTable headers={['Username', 'Full Name', 'Amount', 'MoMo Number', 'Network', 'Date', 'Status', 'Actions']}>
            {rows.map((w) => (
              <tr key={w.id} className="border-b border-dark-700">
                <td className="py-3 pr-4 text-white text-xs">{w.email}</td>
                <td className="pr-4 text-sm">{[w.first_name, w.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="pr-4 font-mono text-primary-500">{formatCurrency(Number(w.amount))}</td>
                <td className="pr-4 font-mono text-xs">{w.phone_number}</td>
                <td className="pr-4 text-xs">{PAYMENT_NETWORK_LABELS[w.payment_method] || w.payment_method}</td>
                <td className="pr-4 text-xs text-gray-400 whitespace-nowrap">{new Date(w.created_at).toLocaleString()}</td>
                <td className="pr-4 capitalize text-xs">{w.status}</td>
                <td className="whitespace-nowrap">
                  {w.status === 'pending' && (
                    <>
                      <ActionBtn variant="success" onClick={() => approve(w.id)}>Approve</ActionBtn>
                      <ActionBtn variant="danger" onClick={() => reject(w.id)}>Reject</ActionBtn>
                    </>
                  )}
                  {w.status !== 'completed' && <ActionBtn variant="danger" onClick={() => remove(w.id)}>Delete</ActionBtn>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="py-6 text-center text-gray-500 text-sm">No withdrawal requests found.</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
