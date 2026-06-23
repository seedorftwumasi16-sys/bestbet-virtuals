'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, formatCurrency, getAssetUrl, PAYMENT_NETWORK_LABELS } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface DepositRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  amount: number;
  payment_method: string;
  phone_number: string;
  screenshot_url?: string;
  status: string;
  created_at: string;
  admin_note?: string;
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

export default function DepositsSection() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (status !== 'all') q.set('status', status);
      if (search.trim()) q.set('search', search.trim());
      const data = await api<DepositRow[]>(`/admin/deposits?${q}`);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setError(null);
    try {
      await api(`/admin/deposits/${id}/approve`, { method: 'PUT' });
      setSuccess('Deposit approved — wallet credited.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const reject = async (id: string) => {
    const note = window.prompt('Rejection reason (optional):') || 'Rejected by admin';
    setError(null);
    try {
      await api(`/admin/deposits/${id}/reject`, { method: 'PUT', body: JSON.stringify({ note }) });
      setSuccess('Deposit rejected — user notified.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this deposit request?')) return;
    try {
      await api(`/admin/deposits/${id}`, { method: 'DELETE' });
      setSuccess('Deposit request deleted.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}

      <AdminCard title="Deposit Requests">
        <div className="flex flex-wrap gap-3 mb-4">
          <Field label="Search user">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, name, phone…"
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
          <p className="text-gray-500 text-sm">Loading deposits…</p>
        ) : (
          <AdminTable headers={['User', 'Full Name', 'Amount', 'Network', 'Sender #', 'Proof', 'Date', 'Status', 'Actions']}>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-dark-700">
                <td className="py-3 pr-4 text-white text-xs">{d.email}</td>
                <td className="pr-4 text-sm">{[d.first_name, d.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="pr-4 font-mono text-primary-500">{formatCurrency(Number(d.amount))}</td>
                <td className="pr-4 text-xs">{PAYMENT_NETWORK_LABELS[d.payment_method] || d.payment_method}</td>
                <td className="pr-4 font-mono text-xs">{d.phone_number || '—'}</td>
                <td className="pr-4">
                  {d.screenshot_url ? (
                    <button type="button" onClick={() => setScreenshot(getAssetUrl(d.screenshot_url))} className="text-primary-500 text-xs underline">
                      View
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
                <td className="pr-4 text-xs text-gray-400 whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                <td className="pr-4 capitalize text-xs">{d.status}</td>
                <td className="whitespace-nowrap">
                  {d.status === 'pending' && (
                    <>
                      <ActionBtn variant="success" onClick={() => approve(d.id)}>Approve</ActionBtn>
                      <ActionBtn variant="danger" onClick={() => reject(d.id)}>Reject</ActionBtn>
                    </>
                  )}
                  {d.status !== 'approved' && <ActionBtn variant="danger" onClick={() => remove(d.id)}>Delete</ActionBtn>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} className="py-6 text-center text-gray-500 text-sm">No deposit requests found.</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>

      {screenshot && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setScreenshot(null)}>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={screenshot} alt="Payment proof" className="w-full rounded-xl border border-dark-600" />
            <button onClick={() => setScreenshot(null)} className="btn-secondary w-full mt-3">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
