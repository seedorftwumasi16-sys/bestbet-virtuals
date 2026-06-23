'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency, formatOdds } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

export default function BookingSection() {
  const [codes, setCodes] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<{ bet: Record<string, unknown>; selections: Array<Record<string, unknown>> } | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [savedSlips, setSavedSlips] = useState<Array<Record<string, unknown>>>([]);
  const [preCode, setPreCode] = useState('');
  const [preStake, setPreStake] = useState('10');

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api<Array<Record<string, unknown>>>(`/admin/booking-codes${q}`).then(setCodes).catch(console.error);
    api<Array<Record<string, unknown>>>(`/admin/saved-betslips${q}`).then(setSavedSlips).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const viewCode = async (code: string) => {
    const data = await api<typeof detail>(`/admin/bets/booking/${code}`);
    setDetail(data);
    setEditCode(String(data?.bet?.booking_code || ''));
    const exp = data?.bet?.booking_code_expires_at;
    setEditExpiry(exp ? new Date(String(exp)).toISOString().slice(0, 16) : '');
  };

  const saveBookingCode = async () => {
    if (!detail?.bet?.id) return;
    await api(`/admin/bets/${detail.bet.id}/booking-code`, {
      method: 'PUT',
      body: JSON.stringify({ bookingCode: editCode, expiresAt: editExpiry ? new Date(editExpiry).toISOString() : null }),
    });
    load();
    viewCode(editCode);
  };

  const voidBet = async (id: string) => {
    if (!confirm('Void this bet?')) return;
    await api(`/admin/bets/${id}/void`, { method: 'PUT' });
    load();
    setDetail(null);
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Pre-Create Booking Code">
        <p className="text-xs text-gray-500 mb-3">Generate a shareable SB###### code users can load on the betslip page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Custom code (optional)">
            <input value={preCode} onChange={(e) => setPreCode(e.target.value.toUpperCase())} placeholder="SB123456" className="input-field font-mono min-h-[44px]" maxLength={12} />
          </Field>
          <Field label="Default stake (GHS)">
            <input type="number" value={preStake} onChange={(e) => setPreStake(e.target.value)} className="input-field min-h-[44px]" />
          </Field>
          <div className="flex items-end">
            <button
              onClick={async () => {
                const slip = await api<{ code: string }>('/admin/saved-betslips', {
                  method: 'POST',
                  body: JSON.stringify({ code: preCode || undefined, selections: [], stake: parseFloat(preStake) || 10 }),
                });
                setPreCode('');
                load();
                alert(`Created: ${slip.code}`);
              }}
              className="btn-primary w-full min-h-[44px]"
            >
              Create Code
            </button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Search Booking Codes">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="Booking code"
            className="input-field font-mono flex-1"
          />
          <button onClick={load} className="btn-primary">Search</button>
        </div>
      </AdminCard>

      <AdminCard title="Booking Code History">
        <AdminTable headers={['Code', 'User', 'Stake', 'Odds', 'Status', 'Actions']}>
          {codes.map((b) => (
            <tr key={String(b.id)} className="border-b border-dark-700">
              <td className="py-3 pr-4 font-mono text-primary-500">{String(b.booking_code)}</td>
              <td className="pr-4">{String(b.email)}</td>
              <td className="pr-4">{formatCurrency(Number(b.stake || 0))}</td>
              <td className="pr-4">{formatOdds(Number(b.total_odds || 0))}</td>
              <td className="pr-4 capitalize">{String(b.status)}</td>
              <td>
                <ActionBtn onClick={() => viewCode(String(b.booking_code))}>View</ActionBtn>
                {b.status === 'pending' && (
                  <ActionBtn variant="danger" onClick={() => voidBet(String(b.id))}>Void</ActionBtn>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      {detail && (
        <AdminCard title={`Booking ${detail.bet.booking_code}`}>
          <p className="text-sm text-gray-400 mb-3">
            Stake {formatCurrency(Number(detail.bet.stake || 0))} · Win {formatCurrency(Number(detail.bet.potential_win || 0))} · {String(detail.bet.status)}
          </p>
          <div className="space-y-2">
            {detail.selections.map((s, i) => (
              <div key={i} className="bg-dark-700/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{String(s.home_team)} vs {String(s.away_team)}</p>
                <p className="text-gray-400 text-xs">{String(s.market)} · {String(s.selection)} @ {formatOdds(Number(s.odds || 0))}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Field label="Edit booking code">
              <input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="input-field font-mono"
                maxLength={20}
              />
            </Field>
            <Field label="Expiry date/time">
              <input
                type="datetime-local"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="input-field"
              />
            </Field>
            <button onClick={saveBookingCode} className="btn-primary">Save Code</button>
          </div>
        </AdminCard>
      )}

      <AdminCard title="Saved Bet Slips (Pre-place codes)">
        <AdminTable headers={['Code', 'Stake', 'Expires', 'Created']}>
          {savedSlips.map((s) => (
            <tr key={String(s.id)} className="border-b border-dark-700">
              <td className="py-3 pr-4 font-mono text-primary-500">{String(s.code)}</td>
              <td className="pr-4">{formatCurrency(Number(s.stake || 0))}</td>
              <td className="pr-4 text-xs text-gray-400">{s.expires_at ? new Date(String(s.expires_at)).toLocaleString() : '—'}</td>
              <td className="text-xs text-gray-500">{new Date(String(s.created_at)).toLocaleDateString()}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
