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
  preset_home_score?: number;
  preset_away_score?: number;
}

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
}

interface PresetGoal {
  team: 'home' | 'away';
  minute: number;
  player: string;
  playerId?: string;
}

export default function MatchesSection() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    scheduledAt: '',
    usePreset: false,
    presetHomeScore: 0,
    presetAwayScore: 0,
  });
  const [presetGoals, setPresetGoals] = useState<PresetGoal[]>([]);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [newGoal, setNewGoal] = useState<PresetGoal>({ team: 'home', minute: 12, player: '' });

  const load = () => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    api<Match[]>(`/admin/matches${q}`).then(setMatches).catch(console.error);
  };

  useEffect(() => {
    load();
    api<Team[]>('/admin/teams').then(setTeams).catch(console.error);
  }, [filter]);

  useEffect(() => {
    if (form.homeTeamId) {
      api<Player[]>(`/admin/players?teamId=${form.homeTeamId}`)
        .then((rows) => { console.log('[Matches] home players:', rows.length); setHomePlayers(rows); })
        .catch((err) => { console.error('[Matches] home players failed:', err); setHomePlayers([]); });
    } else setHomePlayers([]);
  }, [form.homeTeamId]);

  useEffect(() => {
    if (form.awayTeamId) {
      api<Player[]>(`/admin/players?teamId=${form.awayTeamId}`)
        .then((rows) => { console.log('[Matches] away players:', rows.length); setAwayPlayers(rows); })
        .catch((err) => { console.error('[Matches] away players failed:', err); setAwayPlayers([]); });
    } else setAwayPlayers([]);
  }, [form.awayTeamId]);

  const addPresetGoal = () => {
    if (!newGoal.player) return;
    const updated = [...presetGoals, { ...newGoal }];
    setPresetGoals(updated);
    setForm({
      ...form,
      presetHomeScore: updated.filter((g) => g.team === 'home').length,
      presetAwayScore: updated.filter((g) => g.team === 'away').length,
    });
    setNewGoal({ team: 'home', minute: 45, player: '' });
  };

  const removePresetGoal = (idx: number) => {
    const updated = presetGoals.filter((_, i) => i !== idx);
    setPresetGoals(updated);
    setForm({
      ...form,
      presetHomeScore: updated.filter((g) => g.team === 'home').length,
      presetAwayScore: updated.filter((g) => g.team === 'away').length,
    });
  };

  const create = async () => {
    const payload: Record<string, unknown> = {
      homeTeamId: form.homeTeamId,
      awayTeamId: form.awayTeamId,
      scheduledAt: form.scheduledAt,
    };
    if (form.usePreset && presetGoals.length) {
      payload.presetHomeScore = form.presetHomeScore;
      payload.presetAwayScore = form.presetAwayScore;
      payload.goals = presetGoals.map((g) => ({
        team: g.team,
        minute: g.minute,
        player: g.player,
        playerId: g.playerId,
      }));
    }
    await api('/admin/matches', { method: 'POST', body: JSON.stringify(payload) });
    setForm({ homeTeamId: '', awayTeamId: '', scheduledAt: '', usePreset: false, presetHomeScore: 0, presetAwayScore: 0 });
    setPresetGoals([]);
    load();
  };

  const action = async (id: string, endpoint: string, body?: object) => {
    await api(`/admin/matches/${id}/${endpoint}`, { method: 'PUT', body: JSON.stringify(body ?? {}) });
    load();
  };

  const homeTeam = teams.find((t) => t.id === form.homeTeamId);
  const awayTeam = teams.find((t) => t.id === form.awayTeamId);

  return (
    <div className="space-y-4">
      <AdminCard title="Schedule New Match (with Preset Results)">
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
          <Field label="Kickoff Time">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
          </Field>
          <div className="flex items-end">
            <button onClick={create} className="btn-primary w-full">Create Match</button>
          </div>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.usePreset} onChange={(e) => setForm({ ...form, usePreset: e.target.checked })} className="accent-primary-500" />
          Use predetermined result (engine plays exact score & goals)
        </label>

        {form.usePreset && (
          <div className="mt-4 border-t border-dark-600 pt-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-white font-bold">
                Final: {homeTeam?.name || 'Home'} {form.presetHomeScore} – {form.presetAwayScore} {awayTeam?.name || 'Away'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <Field label="Team">
                <select value={newGoal.team} onChange={(e) => setNewGoal({ ...newGoal, team: e.target.value as 'home' | 'away' })} className="input-field">
                  <option value="home">{homeTeam?.name || 'Home'}</option>
                  <option value="away">{awayTeam?.name || 'Away'}</option>
                </select>
              </Field>
              <Field label="Minute">
                <input type="number" min={1} max={90} value={newGoal.minute} onChange={(e) => setNewGoal({ ...newGoal, minute: parseInt(e.target.value) || 1 })} className="input-field" />
              </Field>
              <Field label="Goal Scorer">
                <select
                  value={newGoal.playerId || ''}
                  onChange={(e) => {
                    const squad = newGoal.team === 'home' ? homePlayers : awayPlayers;
                    const p = squad.find((x) => x.id === e.target.value);
                    setNewGoal({ ...newGoal, playerId: e.target.value, player: p?.name || '' });
                  }}
                  className="input-field"
                >
                  {(newGoal.team === 'home' ? homePlayers : awayPlayers).length === 0 ? (
                    <option value="">No players found for this team</option>
                  ) : (
                    <>
                      <option value="">Select…</option>
                      {(newGoal.team === 'home' ? homePlayers : awayPlayers).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </Field>
              <div className="flex items-end sm:col-span-2">
                <button onClick={addPresetGoal} className="btn-secondary w-full">+ Add Goal</button>
              </div>
            </div>
            {presetGoals.length > 0 && (
              <div className="space-y-1">
                {presetGoals.map((g, i) => (
                  <div key={i} className="flex justify-between items-center bg-dark-700/40 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">
                      <span className="text-primary-500 font-mono">{g.minute}&apos;</span> {g.player} ({g.team === 'home' ? homeTeam?.name : awayTeam?.name})
                    </span>
                    <ActionBtn variant="danger" onClick={() => removePresetGoal(i)}>Remove</ActionBtn>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
        <AdminTable headers={['Match', 'Status', 'Score', 'Preset', 'Scheduled', 'Actions']}>
          {matches.map((m) => (
            <tr key={m.id} className="border-b border-dark-700">
              <td className="py-3 pr-4">
                <span className="font-medium text-white">{m.home_team_name}</span>
                <span className="text-gray-500"> vs </span>
                <span className="font-medium text-white">{m.away_team_name}</span>
              </td>
              <td className="capitalize pr-4 text-xs">
                {m.is_paused ? 'paused' : m.status}
              </td>
              <td className="pr-4 font-mono">{m.home_score}-{m.away_score}</td>
              <td className="pr-4 text-xs text-accent-500">
                {m.preset_home_score != null ? `${m.preset_home_score}-${m.preset_away_score}` : '—'}
              </td>
              <td className="text-gray-400 text-xs pr-4">{new Date(m.scheduled_at).toLocaleString()}</td>
              <td className="whitespace-nowrap">
                {m.status === 'live' && (
                  <ActionBtn onClick={() => action(m.id, 'pause', { paused: !m.is_paused })}>
                    {m.is_paused ? 'Resume' : 'Pause'}
                  </ActionBtn>
                )}
                {m.status === 'scheduled' && (
                  <ActionBtn variant="success" onClick={() => api(`/admin/matches/${m.id}/start`, { method: 'POST' }).then(load)}>Start</ActionBtn>
                )}
                {m.status !== 'voided' && m.status !== 'finished' && (
                  <ActionBtn variant="danger" onClick={() => action(m.id, 'cancel')}>Cancel</ActionBtn>
                )}
                <ActionBtn onClick={() => action(m.id, 'restart')}>Restart</ActionBtn>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
