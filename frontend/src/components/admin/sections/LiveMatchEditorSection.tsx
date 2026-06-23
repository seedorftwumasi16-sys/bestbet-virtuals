'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface MatchRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  home_score: number;
  away_score: number;
  live_minute?: number;
  is_paused?: boolean;
  possession_home?: number;
  possession_away?: number;
  shots_home?: number;
  shots_away?: number;
  corners_home?: number;
  corners_away?: number;
  yellow_cards_home?: number;
  yellow_cards_away?: number;
  red_cards_home?: number;
  red_cards_away?: number;
  admin_commentary?: string;
  finished_at?: string;
}

interface GoalEvent {
  id: string;
  minute: number;
  player_name: string;
  team_id: string;
  event_type: string;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
  team_name: string;
}

interface LiveState {
  match: MatchRow & { home_team_id?: string; away_team_id?: string };
  events: GoalEvent[];
  goals: GoalEvent[];
  presetEvents?: Array<{ team: string; minute: number; player: string }>;
}

const STAT_FIELDS = [
  { key: 'possessionHome', label: 'Possession Home %', col: 'possession_home' },
  { key: 'possessionAway', label: 'Possession Away %', col: 'possession_away' },
  { key: 'shotsHome', label: 'Shots Home', col: 'shots_home' },
  { key: 'shotsAway', label: 'Shots Away', col: 'shots_away' },
  { key: 'cornersHome', label: 'Corners Home', col: 'corners_home' },
  { key: 'cornersAway', label: 'Corners Away', col: 'corners_away' },
  { key: 'yellowHome', label: 'Yellow Home', col: 'yellow_cards_home' },
  { key: 'yellowAway', label: 'Yellow Away', col: 'yellow_cards_away' },
  { key: 'redHome', label: 'Red Home', col: 'red_cards_home' },
  { key: 'redAway', label: 'Red Away', col: 'red_cards_away' },
] as const;

export default function LiveMatchEditorSection() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<LiveState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tab, setTab] = useState<'editor' | 'history'>('editor');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [scores, setScores] = useState({ home: 0, away: 0, minute: 0 });
  const [commentary, setCommentary] = useState('');
  const [newGoal, setNewGoal] = useState({ team: 'home', minute: 45, player: '', playerId: '' });
  const [newEvent, setNewEvent] = useState({ type: 'yellow_card', team: 'home', minute: 30, player: '', playerId: '' });
  const [matchStatus, setMatchStatus] = useState('live');
  const [saving, setSaving] = useState(false);

  const loadMatches = useCallback(() => {
    Promise.all([
      api<MatchRow[]>('/admin/matches'),
      api<MatchRow[]>('/admin/matches/history/list?limit=50'),
    ]).then(([live, hist]) => {
      setMatches(live);
      setHistory(hist);
    }).catch(console.error);
  }, []);

  const loadState = useCallback(async (id: string) => {
    if (!id) return;
    const data = await api<LiveState>(`/admin/matches/${id}/live`);
    setState(data);
    const m = data.match;
    setScores({ home: m.home_score ?? 0, away: m.away_score ?? 0, minute: m.live_minute ?? 0 });
    setCommentary(m.admin_commentary || '');
    setMatchStatus(m.status || 'scheduled');
    setStats({
      possessionHome: m.possession_home ?? 50,
      possessionAway: m.possession_away ?? 50,
      shotsHome: m.shots_home ?? 0,
      shotsAway: m.shots_away ?? 0,
      cornersHome: m.corners_home ?? 0,
      cornersAway: m.corners_away ?? 0,
      yellowHome: m.yellow_cards_home ?? 0,
      yellowAway: m.yellow_cards_away ?? 0,
      redHome: m.red_cards_home ?? 0,
      redAway: m.red_cards_away ?? 0,
    });
    if (m.home_team_id && m.away_team_id) {
      const [homeP, awayP] = await Promise.all([
        api<Player[]>(`/admin/players?teamId=${m.home_team_id}`),
        api<Player[]>(`/admin/players?teamId=${m.away_team_id}`),
      ]);
      setPlayers([...homeP, ...awayP]);
    }
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  useEffect(() => {
    if (selectedId) loadState(selectedId);
  }, [selectedId, loadState]);

  useEffect(() => {
    const socket = getSharedSocket();
    const onUpdate = (data: { matchId: string }) => {
      if (data.matchId === selectedId) loadState(selectedId);
    };
    socket.on('match:update', onUpdate);
    socket.on('match:goal', onUpdate);
    socket.on('match:finished', () => { loadMatches(); if (selectedId) loadState(selectedId); });
    return () => {
      socket.off('match:update', onUpdate);
      socket.off('match:goal', onUpdate);
      socket.off('match:finished', onUpdate);
    };
  }, [selectedId, loadState, loadMatches]);

  const saveLive = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api(`/admin/matches/${selectedId}/live`, {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: scores.home,
          awayScore: scores.away,
          minute: scores.minute,
          commentary,
          ...stats,
        }),
      });
      await loadState(selectedId);
    } finally {
      setSaving(false);
    }
  };

  const matchAction = async (endpoint: string, method = 'POST') => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/${endpoint}`, { method });
    loadMatches();
    loadState(selectedId);
  };

  const addGoal = async () => {
    if (!selectedId || !newGoal.player) return;
    await api(`/admin/matches/${selectedId}/goals`, {
      method: 'POST',
      body: JSON.stringify({
        team: newGoal.team,
        minute: newGoal.minute,
        player: newGoal.player,
        playerId: newGoal.playerId || undefined,
      }),
    });
    setNewGoal({ team: 'home', minute: 45, player: '', playerId: '' });
    loadState(selectedId);
  };

  const deleteGoal = async (eventId: string) => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/goals/${eventId}`, { method: 'DELETE' });
    loadState(selectedId);
  };

  const addEvent = async () => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        type: newEvent.type,
        team: newEvent.team,
        minute: newEvent.minute,
        player: newEvent.player || undefined,
        playerId: newEvent.playerId || undefined,
      }),
    });
    loadState(selectedId);
  };

  const deleteEvent = async (eventId: string) => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/events/${eventId}`, { method: 'DELETE' });
    loadState(selectedId);
  };

  const forceFullTime = async () => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/force-result`, {
      method: 'POST',
      body: JSON.stringify({ homeScore: scores.home, awayScore: scores.away }),
    });
    loadMatches();
    loadState(selectedId);
  };

  const changeStatus = async () => {
    if (!selectedId) return;
    await api(`/admin/matches/${selectedId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: matchStatus }),
    });
    loadMatches();
    loadState(selectedId);
  };

  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'scheduled');
  const m = state?.match;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['editor', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === t ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-gray-400'}`}
          >
            {t === 'editor' ? '🎮 Live Editor' : '📜 Match History'}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <AdminCard title="Completed Matches (Permanent Record)">
          <AdminTable headers={['Match', 'Score', 'Finished', 'League']}>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-dark-700">
                <td className="py-3 pr-4 text-white text-sm">{h.home_team_name} vs {h.away_team_name}</td>
                <td className="pr-4 font-mono text-primary-500">{h.home_score}-{h.away_score}</td>
                <td className="pr-4 text-xs text-gray-400">{h.finished_at ? new Date(h.finished_at).toLocaleString() : '—'}</td>
                <td>
                  <ActionBtn onClick={() => { setSelectedId(h.id); setTab('editor'); }}>View</ActionBtn>
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}

      {tab === 'editor' && (
        <>
          <AdminCard title="Select Match">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Live / Scheduled Match">
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input-field">
                  <option value="">Choose match…</option>
                  {liveMatches.map((x) => (
                    <option key={x.id} value={x.id}>
                      [{x.status}{x.is_paused ? ' PAUSED' : ''}] {x.home_team_name} vs {x.away_team_name} ({x.home_score}-{x.away_score})
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end gap-2 flex-wrap">
                <button onClick={() => matchAction('start')} disabled={!selectedId} className="btn-primary text-xs py-2">▶ Start</button>
                <button
                  onClick={() => api(`/admin/matches/${selectedId}/pause`, { method: 'PUT', body: JSON.stringify({ paused: !m?.is_paused }) }).then(() => { loadMatches(); loadState(selectedId); })}
                  disabled={!selectedId}
                  className="btn-secondary text-xs py-2"
                >
                  {m?.is_paused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={() => matchAction('end')} disabled={!selectedId} className="btn-secondary text-xs py-3 min-h-[44px]">⏹ End</button>
                <button onClick={forceFullTime} disabled={!selectedId} className="btn-secondary text-xs py-3 min-h-[44px]">🏁 Force FT</button>
                <button onClick={() => matchAction('restart', 'PUT')} disabled={!selectedId} className="btn-secondary text-xs py-3 min-h-[44px]">🔄 Restart</button>
              </div>
            </div>
            {m && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`badge-live-neon text-[10px] ${m.status === 'live' ? '' : 'opacity-50'}`}>LIVE CONTROL</span>
                <span className="text-sm text-gray-400">{m.home_team_name} vs {m.away_team_name}</span>
                {m.status === 'live' && <span className="text-primary-500 font-mono font-bold">{scores.minute}&apos;</span>}
                <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                  <select value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)} className="input-field text-xs py-2 min-h-[44px]">
                    {['scheduled', 'live', 'finished', 'voided'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={changeStatus} className="btn-secondary text-xs py-2 min-h-[44px]">Set Status</button>
                </div>
              </div>
            )}
          </AdminCard>

          {selectedId && m && (
            <>
              <AdminCard title="Scoreboard">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label={`${m.home_team_name} Score`}>
                    <input type="number" min={0} value={scores.home} onChange={(e) => setScores({ ...scores, home: parseInt(e.target.value) || 0 })} className="input-field text-center text-lg font-black" />
                  </Field>
                  <Field label={`${m.away_team_name} Score`}>
                    <input type="number" min={0} value={scores.away} onChange={(e) => setScores({ ...scores, away: parseInt(e.target.value) || 0 })} className="input-field text-center text-lg font-black" />
                  </Field>
                  <Field label="Match Minute">
                    <input type="number" min={0} max={90} value={scores.minute} onChange={(e) => setScores({ ...scores, minute: parseInt(e.target.value) || 0 })} className="input-field text-center font-mono" />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={saveLive} disabled={saving} className="btn-primary w-full">
                      {saving ? 'Saving…' : 'Apply & Broadcast'}
                    </button>
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="Match Statistics">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {STAT_FIELDS.map(({ key, label }) => (
                    <Field key={key} label={label}>
                      <input
                        type="number"
                        min={0}
                        value={stats[key] ?? 0}
                        onChange={(e) => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })}
                        className="input-field text-sm"
                      />
                    </Field>
                  ))}
                </div>
              </AdminCard>

              <AdminCard title="Commentary">
                <textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  rows={3}
                  placeholder="Live match commentary (shown on site instantly)…"
                  className="input-field w-full resize-y text-sm"
                />
                <button onClick={saveLive} className="btn-secondary mt-2 text-xs">Update Commentary</button>
              </AdminCard>

              <AdminCard title="Goals">
                <div className="space-y-2 mb-4">
                  {(state?.goals || []).map((g) => (
                    <div key={g.id} className="flex items-center justify-between bg-dark-700/50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-white">
                        <span className="text-primary-500 font-mono">{g.minute}&apos;</span>{' '}
                        ⚽ {g.player_name}
                      </span>
                      <ActionBtn variant="danger" onClick={() => deleteGoal(g.id)}>Delete</ActionBtn>
                    </div>
                  ))}
                  {!state?.goals?.length && <p className="text-gray-500 text-xs">No goals recorded yet</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-dark-600 pt-4">
                  <Field label="Team">
                    <select value={newGoal.team} onChange={(e) => setNewGoal({ ...newGoal, team: e.target.value })} className="input-field">
                      <option value="home">{m.home_team_name}</option>
                      <option value="away">{m.away_team_name}</option>
                    </select>
                  </Field>
                  <Field label="Minute">
                    <input type="number" min={1} max={90} value={newGoal.minute} onChange={(e) => setNewGoal({ ...newGoal, minute: parseInt(e.target.value) || 1 })} className="input-field" />
                  </Field>
                  <Field label="Scorer">
                    <select
                      value={newGoal.playerId}
                      onChange={(e) => {
                        const p = players.find((x) => x.id === e.target.value);
                        setNewGoal({ ...newGoal, playerId: e.target.value, player: p?.name || '' });
                      }}
                      className="input-field"
                    >
                      <option value="">Select player…</option>
                      {players.filter((p) => (newGoal.team === 'home' ? p.team_id === m.home_team_id : p.team_id === m.away_team_id)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <button onClick={addGoal} className="btn-primary w-full">+ Add Goal</button>
                  </div>
                </div>
                {(state?.presetEvents?.length ?? 0) > 0 && (
                  <p className="text-xs text-accent-500 mt-3">
                    Preset loaded: {state!.presetEvents!.length} scheduled goal(s) will play automatically on start
                  </p>
                )}
              </AdminCard>

              <AdminCard title="Match Events (Cards, Corners, Penalties)">
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {(state?.events || []).filter((e) => e.event_type !== 'goal').map((e) => (
                    <div key={e.id} className="flex justify-between items-center bg-dark-700/50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-300"><span className="text-primary-500 font-mono">{e.minute}&apos;</span> {e.event_type.replace('_', ' ')} {e.player_name || ''}</span>
                      <ActionBtn variant="danger" onClick={() => deleteEvent(e.id)}>Delete</ActionBtn>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 border-t border-dark-600 pt-4">
                  <Field label="Type">
                    <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} className="input-field min-h-[44px]">
                      <option value="yellow_card">Yellow Card</option>
                      <option value="red_card">Red Card</option>
                      <option value="corner">Corner</option>
                      <option value="penalty">Penalty Goal</option>
                    </select>
                  </Field>
                  <Field label="Team">
                    <select value={newEvent.team} onChange={(e) => setNewEvent({ ...newEvent, team: e.target.value })} className="input-field min-h-[44px]">
                      <option value="home">{m.home_team_name}</option>
                      <option value="away">{m.away_team_name}</option>
                    </select>
                  </Field>
                  <Field label="Minute">
                    <input type="number" min={1} max={90} value={newEvent.minute} onChange={(e) => setNewEvent({ ...newEvent, minute: parseInt(e.target.value) || 1 })} className="input-field min-h-[44px]" />
                  </Field>
                  {(newEvent.type === 'penalty') && (
                    <Field label="Scorer">
                      <select
                        value={newEvent.playerId}
                        onChange={(e) => {
                          const p = players.find((x) => x.id === e.target.value);
                          setNewEvent({ ...newEvent, playerId: e.target.value, player: p?.name || '' });
                        }}
                        className="input-field min-h-[44px]"
                      >
                        <option value="">Select…</option>
                        {players.filter((p) => (newEvent.team === 'home' ? p.team_id === m.home_team_id : p.team_id === m.away_team_id)).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <div className="flex items-end">
                    <button onClick={addEvent} className="btn-primary w-full min-h-[44px]">+ Add Event</button>
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="All Scorers">
                <div className="space-y-1 text-sm">
                  {(state?.goals || []).map((g) => (
                    <p key={g.id} className="text-gray-300"><span className="text-primary-500 font-mono">{g.minute}&apos;</span> ⚽ {g.player_name}</p>
                  ))}
                  {m.status === 'finished' && !state?.goals?.length && <p className="text-gray-500 text-xs">No scorers recorded</p>}
                </div>
              </AdminCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
