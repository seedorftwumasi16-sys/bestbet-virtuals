'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface OddsRow {
  id: string;
  market: string;
  selection: string;
  odds: number;
}

export default function OddsSection() {
  const [matchId, setMatchId] = useState('');
  const [odds, setOdds] = useState<OddsRow[]>([]);
  const [resultForm, setResultForm] = useState({ homeScore: 0, awayScore: 0 });

  const loadOdds = async () => {
    if (!matchId) return;
    const data = await api<OddsRow[]>(`/admin/matches/${matchId}/odds`);
    setOdds(data);
  };

  const regenerate = async () => {
    await api(`/admin/matches/${matchId}/regenerate-odds`, { method: 'POST' });
    loadOdds();
  };

  const saveOdds = async () => {
    await api(`/admin/matches/${matchId}/odds`, {
      method: 'PUT',
      body: JSON.stringify({ odds: odds.map((o) => ({ market: o.market, selection: o.selection, odds: o.odds })) }),
    });
    alert('Odds saved');
  };

  const setResult = async () => {
    await api(`/admin/matches/${matchId}/result`, {
      method: 'PUT',
      body: JSON.stringify({ homeScore: resultForm.homeScore, awayScore: resultForm.awayScore }),
    });
    alert('Result set');
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Odds Management">
        <div className="flex gap-3 flex-wrap mb-4">
          <Field label="Match ID">
            <input value={matchId} onChange={(e) => setMatchId(e.target.value)} className="input-field font-mono text-sm" placeholder="Paste match UUID" />
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={loadOdds} className="btn-secondary">Load Odds</button>
            <button onClick={regenerate} className="btn-accent">Auto Generate</button>
            <button onClick={saveOdds} className="btn-primary">Save Odds</button>
          </div>
        </div>

        {odds.length > 0 && (
          <AdminTable headers={['Market', 'Selection', 'Odds']}>
            {odds.map((o) => (
              <tr key={o.id} className="border-b border-dark-700">
                <td className="py-2 pr-4 text-gray-400">{o.market}</td>
                <td className="pr-4">{o.selection}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={o.odds}
                    onChange={(e) => setOdds(odds.map((row) => row.id === o.id ? { ...row, odds: parseFloat(e.target.value) } : row))}
                    className="input-field w-24 py-1"
                  />
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard title="Manual Result Entry">
        <div className="flex gap-3 items-end flex-wrap">
          <Field label="Home Score">
            <input type="number" value={resultForm.homeScore} onChange={(e) => setResultForm({ ...resultForm, homeScore: parseInt(e.target.value) })} className="input-field w-24" />
          </Field>
          <Field label="Away Score">
            <input type="number" value={resultForm.awayScore} onChange={(e) => setResultForm({ ...resultForm, awayScore: parseInt(e.target.value) })} className="input-field w-24" />
          </Field>
          <button onClick={setResult} className="btn-primary">Set Result</button>
        </div>
      </AdminCard>
    </div>
  );
}
