'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  scheduled_at: string;
  home_score: number;
  away_score: number;
  is_paused: boolean;
  is_archived: boolean;
  match_number?: number;
}

interface Team {
  id: string;
  name: string;
}

export default function MatchesSection() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ homeTeamId: '', awayTeamId: '', scheduledAt: '' });

  const load = () => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    api<Match[]>(`/admin/matches${q}`).then(setMatches).catch(console.error);
  };

  useEffect(() => {
    load();
    api<Team[]>('/admin/teams').then(setTeams).catch(console.error);
  }, [filter]);

  const create = async () => {
    await api('/admin/matches', { method: 'POST', body: JSON.stringify(form) });
    setForm({ homeTeamId: '', awayTeamId: '', scheduledAt: '' });
    load();
  };

  const action = async (id: string, endpoint: string, body?: object) => {
    await api(`/admin/matches/${id}/${endpoint}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    load();
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Schedule New Match">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="Home Team">
            <select value={form.homeTeamId} onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })} className="input-field">
              <option value="">Select</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Away Team">
            <select value={form.awayTeamId} onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })} className="input-field">
              <option value="">Select</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Scheduled At">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
          </Field>
          <div className="flex items-end">
            <button onClick={create} className="btn-primary w-full">Create Match</button>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Match Management">
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'scheduled', 'live', 'finished', 'voided'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${filter === s ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-gray-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <AdminTable headers={['Match', 'Status', 'Score', 'Scheduled', 'Actions']}>
          {matches.map((m) => (
            <tr key={m.id} className="border-b border-dark-700">
              <td className="py-3 pr-4">
                <span className="font-medium text-white">{m.home_team_name}</span>
                <span className="text-gray-500"> vs </span>
                <span className="font-medium text-white">{m.away_team_name}</span>
                {m.match_number && <span className="text-[10px] text-gray-500 ml-2">#{m.match_number}</span>}
              </td>
              <td className="capitalize pr-4">
                {m.is_paused ? 'paused' : m.status}
                {m.is_archived && <span className="text-gray-500 text-xs ml-1">archived</span>}
              </td>
              <td className="pr-4 font-mono">{m.home_score}-{m.away_score}</td>
              <td className="text-gray-400 text-xs pr-4">{new Date(m.scheduled_at).toLocaleString()}</td>
              <td className="whitespace-nowrap">
                {m.status === 'live' && (
                  <ActionBtn onClick={() => action(m.id, 'pause', { paused: !m.is_paused })}>
                    {m.is_paused ? 'Resume' : 'Pause'}
                  </ActionBtn>
                )}
                {m.status !== 'voided' && m.status !== 'finished' && (
                  <ActionBtn variant="danger" onClick={() => action(m.id, 'cancel')}>Cancel</ActionBtn>
                )}
                <ActionBtn onClick={() => action(m.id, 'restart')}>Restart</ActionBtn>
                <ActionBtn onClick={() => action(m.id, 'archive', { archived: !m.is_archived })}>
                  {m.is_archived ? 'Unarchive' : 'Archive'}
                </ActionBtn>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
