'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { BetRecord } from '@/lib/bets';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';
import BetTicketCard from '@/components/bets/BetTicketCard';

export default function BetsSection() {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [winners, setWinners] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = search.trim() ? `?bookingCode=${encodeURIComponent(search.trim())}` : '';
      const [all, w] = await Promise.all([
        api<BetRecord[]>(`/admin/bets${q}`),
        api<Array<Record<string, unknown>>>('/admin/bets/stats/winnings'),
      ]);
      setBets(all);
      setWinners(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const voidBet = async (id: string) => {
    if (!window.confirm('Void this bet and refund stake?')) return;
    await api(`/admin/bets/${id}/void`, { method: 'PUT' });
    load();
  };

  const settle = async (id: string, outcome: 'won' | 'lost') => {
    await api(`/admin/bets/${id}/settle`, { method: 'PUT', body: JSON.stringify({ outcome }) });
    load();
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <AdminCard title="Search Bets by Booking Code">
        <div className="flex flex-wrap gap-3">
          <Field label="Booking Code">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder="SBXXXXXXXX"
              className="input-field font-mono min-w-[200px]"
            />
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={load} className="btn-primary min-h-[44px] px-6">Search</button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title={`All Bet Slips (${bets.length})`}>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <div key={bet.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-gray-500">{bet.email} · {bet.first_name} {bet.last_name}</p>
                  <div className="shrink-0">
                    {bet.status === 'pending' && (
                      <>
                        <ActionBtn variant="success" onClick={() => settle(bet.id, 'won')}>Settle Won</ActionBtn>
                        <ActionBtn onClick={() => settle(bet.id, 'lost')}>Settle Lost</ActionBtn>
                      </>
                    )}
                    {bet.status !== 'voided' && <ActionBtn variant="danger" onClick={() => voidBet(bet.id)}>Void</ActionBtn>}
                  </div>
                </div>
                <BetTicketCard
                  bet={bet}
                  expanded={expanded === bet.id}
                  onToggle={() => setExpanded(expanded === bet.id ? null : bet.id)}
                />
              </div>
            ))}
            {!bets.length && <p className="text-gray-500 text-sm">No bets found.</p>}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Top User Winnings">
        <AdminTable headers={['User', 'Won Bets', 'Total Won']}>
          {winners.map((w, i) => (
            <tr key={i} className="border-b border-dark-700">
              <td className="py-3 pr-4 text-white text-sm">{String(w.email)}</td>
              <td className="pr-4">{String(w.won_bets)}</td>
              <td className="pr-4 text-primary-500 font-mono">{formatCurrency(Number(w.total_won || 0))}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
