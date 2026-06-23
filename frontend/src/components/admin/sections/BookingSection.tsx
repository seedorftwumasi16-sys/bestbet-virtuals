'use client';

import { useEffect, useState } from 'react';
import { api, formatCurrency, formatOdds } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

export default function BookingSection() {
  const [codes, setCodes] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<{ bet: Record<string, unknown>; selections: Array<Record<string, unknown>> } | null>(null);
  const [editCode, setEditCode] = useState('');

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api<Array<Record<string, unknown>>>(`/admin/booking-codes${q}`).then(setCodes).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const viewCode = async (code: string) => {
    const data = await api<typeof detail>(`/admin/bets/booking/${code}`);
    setDetail(data);
    setEditCode(String(data?.bet?.booking_code || ''));
  };

  const saveBookingCode = async () => {
    if (!detail?.bet?.id) return;
    await api(`/admin/bets/${detail.bet.id}/booking-code`, {
      method: 'PUT',
      body: JSON.stringify({ bookingCode: editCode }),
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
          <div className="mt-4 flex gap-3 items-end">
            <Field label="Edit booking code">
              <input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="input-field font-mono"
                maxLength={20}
              />
            </Field>
            <button onClick={saveBookingCode} className="btn-primary">Save Code</button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
