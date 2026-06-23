'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, formatCurrency, PAYMENT_NETWORK_LABELS } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface TxRow {
  id: string;
  kind: string;
  email: string;
  full_name: string;
  amount: number;
  payment_method?: string;
  phone_number?: string;
  status: string;
  created_at: string;
  admin_note?: string;
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'completed'] as const;
const TYPE_FILTERS = ['all', 'deposit', 'withdrawal', 'admin_credit', 'admin_debit'] as const;

export default function TransactionsSection() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
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
      if (type !== 'all') q.set('type', type);
      if (search.trim()) q.set('search', search.trim());
      const data = await api<TxRow[]>(`/admin/transactions?${q}`);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [status, type, search]);

  useEffect(() => { load(); }, [load]);

  const editStatus = async (row: TxRow) => {
    const next = window.prompt(`New status for ${row.kind} (${row.status}):`, row.status);
    if (!next || !['pending', 'approved', 'rejected', 'completed'].includes(next)) return;
    try {
      await api(`/admin/transactions/${row.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: next, kind: row.kind }),
      });
      setSuccess('Transaction status updated.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}

      <AdminCard title="Transaction History">
        <div className="flex flex-wrap gap-3 mb-4">
          <Field label="Search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="User email or name…" className="input-field min-w-[180px]" />
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
              {TYPE_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={load} className="btn-primary min-h-[44px] px-6">Filter</button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading transactions…</p>
        ) : (
          <AdminTable headers={['Type', 'User', 'Name', 'Amount', 'Network', 'Phone', 'Date', 'Status', '']}>
            {rows.map((t) => (
              <tr key={`${t.kind}-${t.id}`} className="border-b border-dark-700">
                <td className="py-3 pr-4 capitalize text-xs text-primary-500">{t.kind.replace(/_/g, ' ')}</td>
                <td className="pr-4 text-xs text-white">{t.email}</td>
                <td className="pr-4 text-sm">{t.full_name || '—'}</td>
                <td className="pr-4 font-mono text-primary-500">{formatCurrency(Number(t.amount))}</td>
                <td className="pr-4 text-xs">{t.payment_method ? (PAYMENT_NETWORK_LABELS[t.payment_method] || t.payment_method) : '—'}</td>
                <td className="pr-4 font-mono text-xs">{t.phone_number || '—'}</td>
                <td className="pr-4 text-xs text-gray-400 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                <td className="pr-4 capitalize text-xs">{t.status}</td>
                <td>
                  {['deposit', 'withdrawal', 'admin_credit', 'admin_debit'].includes(t.kind) && (
                    <ActionBtn onClick={() => editStatus(t)}>Edit Status</ActionBtn>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} className="py-6 text-center text-gray-500 text-sm">No transactions found.</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
