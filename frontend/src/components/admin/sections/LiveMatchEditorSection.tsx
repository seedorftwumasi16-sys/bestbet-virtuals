'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { getSharedSocket } from '@/lib/socket';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface MatchRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_id?: string;
  away_team_id?: string;
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
  team_name?: string;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
  team_name?: string;
  position?: string;
}

interface LiveState {
  match: MatchRow;
  events: GoalEvent[];
  goals: GoalEvent[];
  homePlayers?: Player[];
  awayPlayers?: Player[];
  presetEvents?: Array<{ team: string; minute: number; player: string }>;
}

const STAT_FIELDS = [
  { key: 'possessionHome', label: 'Possession Home %' },
  { key: 'possessionAway', label: 'Possession Away %' },
  { key: 'shotsHome', label: 'Shots Home' },
  { key: 'shotsAway', label: 'Shots Away' },
  { key: 'cornersHome', label: 'Corners Home' },
  { key: 'cornersAway', label: 'Corners Away' },
  { key: 'yellowHome', label: 'Yellow Home' },
  { key: 'yellowAway', label: 'Yellow Away' },
  { key: 'redHome', label: 'Red Home' },
  { key: 'redAway', label: 'Red Away' },
] as const;

function teamSide(teamId: string | undefined, homeId?: string, awayId?: string): 'home' | 'away' {
  if (teamId && homeId && String(teamId) === String(homeId)) return 'home';
  return 'away';
}

export default function LiveMatchEditorSection() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<LiveState | null>(null);
  const [tab, setTab] = useState<'editor' | 'history'>('editor');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [scores, setScores] = useState({ home: 0, away: 0, minute: 0 });
  const [commentary, setCommentary] = useState('');
  const [newGoal, setNewGoal] = useState({ team: 'home' as 'home' | 'away', minute: 45, player: '', playerId: '' });
  const [newEvent, setNewEvent] = useState({ type: 'yellow_card', team: 'home', minute: 30, player: '', playerId: '' });
  const [matchStatus, setMatchStatus] = useState('live');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalLoading, setGoalLoading] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState({ team: 'home' as 'home' | 'away', minute: 45, player: '', playerId: '' });

  const m = state?.match;

  const loadMatches = useCallback(() => {
    Promise.all([
      api<MatchRow[]>('/admin/matches'),
      api<MatchRow[]>('/admin/matches/history/list?limit=50'),
    ])
      .then(([all, hist]) => {
        console.log('[LiveEditor] loaded matches:', all.length);
        setMatches(all);
        setHistory(hist);
      })
      .catch((err) => {
        console.error('[LiveEditor] loadMatches failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matches');
      });
  }, []);

  const loadState = useCallback(async (id: string) => {
    if (!id) return;
    setError(null);
    try {
      console.log('[LiveEditor] loading match state:', id);
      let data: LiveState;
      try {
        data = await api<LiveState>(`/admin/matches/${id}/live`);
      } catch (liveErr) {
        console.warn('[LiveEditor] /live endpoint failed, using fallback:', liveErr);
        const allMatches = await api<MatchRow[]>('/admin/matches');
        const match = allMatches.find((x) => x.id === id);
        if (!match?.home_team_id) throw liveErr;
        const [homePlayers, awayPlayers] = await Promise.all([
          api<Player[]>(`/admin/teams/${match.home_team_id}/players`),
          api<Player[]>(`/admin/teams/${match.away_team_id}/players`),
        ]);
        data = { match, goals: [], events: [], homePlayers, awayPlayers };
      }

      console.log('[LiveEditor] match loaded:', {
        home: data.match?.home_team_name,
        away: data.match?.away_team_name,
        homePlayers: data.homePlayers?.length ?? 0,
        awayPlayers: data.awayPlayers?.length ?? 0,
        goals: data.goals?.length ?? 0,
      });

      const match = data.match;
      if ((!data.homePlayers?.length || !data.awayPlayers?.length) && match?.home_team_id) {
        console.log('[LiveEditor] fetching players via /admin/teams/:id/players fallback');
        const [hp, ap] = await Promise.all([
          data.homePlayers?.length ? Promise.resolve(data.homePlayers) : api<Player[]>(`/admin/teams/${match.home_team_id}/players`),
          data.awayPlayers?.length ? Promise.resolve(data.awayPlayers) : api<Player[]>(`/admin/teams/${match.away_team_id}/players`),
        ]);
        data = { ...data, homePlayers: hp, awayPlayers: ap };
        console.log('[LiveEditor] fallback players:', hp.length, ap.length);
      }

      setState(data);
      setScores({ home: match.home_score ?? 0, away: match.away_score ?? 0, minute: match.live_minute ?? 0 });
      setCommentary(match.admin_commentary || '');
      setMatchStatus(match.status || 'scheduled');
      setStats({
        possessionHome: match.possession_home ?? 50,
        possessionAway: match.possession_away ?? 50,
        shotsHome: match.shots_home ?? 0,
        shotsAway: match.shots_away ?? 0,
        cornersHome: match.corners_home ?? 0,
        cornersAway: match.corners_away ?? 0,
        yellowHome: match.yellow_cards_home ?? 0,
        yellowAway: match.yellow_cards_away ?? 0,
        redHome: match.red_cards_home ?? 0,
        redAway: match.red_cards_away ?? 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load match';
      console.error('[LiveEditor] loadState failed:', msg);
      setError(msg);
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

  const homePlayers = state?.homePlayers ?? [];
  const awayPlayers = state?.awayPlayers ?? [];

  const scorersForTeam = useCallback(
    (team: 'home' | 'away') => (team === 'home' ? homePlayers : awayPlayers),
    [homePlayers, awayPlayers]
  );

  const teamPlayers = useMemo(() => scorersForTeam(newGoal.team), [scorersForTeam, newGoal.team]);

  const onTeamChange = (team: 'home' | 'away') => {
    setNewGoal({ team, minute: newGoal.minute, player: '', playerId: '' });
  };

  const saveLive = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/matches/${selectedId}/live`, {
        method: 'PUT',
        body: JSON.stringify({ homeScore: scores.home, awayScore: scores.away, minute: scores.minute, commentary, ...stats }),
      });
      await loadState(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const matchAction = async (endpoint: string, method = 'POST') => {
    if (!selectedId) return;
    setError(null);
    try {
      await api(`/admin/matches/${selectedId}/${endpoint}`, { method });
      loadMatches();
      loadState(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const addGoal = async () => {
    if (!selectedId) return;
    if (!newGoal.playerId && !newGoal.player.trim()) {
      setError('Select a goal scorer from the dropdown before adding a goal.');
      return;
    }
    setGoalLoading(true);
    setError(null);
    try {
      console.log('[LiveEditor] adding goal:', newGoal);
      const result = await api<LiveState>(`/admin/matches/${selectedId}/goals`, {
        method: 'POST',
        body: JSON.stringify({
          team: newGoal.team,
          minute: newGoal.minute,
          player: newGoal.player,
          playerId: newGoal.playerId || undefined,
        }),
      });
      console.log('[LiveEditor] goal added, new score:', result.match?.home_score, '-', result.match?.away_score);
      setState(result);
      setScores({ home: result.match.home_score ?? 0, away: result.match.away_score ?? 0, minute: result.match.live_minute ?? scores.minute });
      setNewGoal({ team: newGoal.team, minute: 45, player: '', playerId: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add goal';
      console.error('[LiveEditor] addGoal failed:', msg);
      setError(msg);
    } finally {
      setGoalLoading(false);
    }
  };

  const deleteGoal = async (eventId: string) => {
    if (!selectedId) return;
    setError(null);
    try {
      const result = await api<LiveState>(`/admin/matches/${selectedId}/goals/${eventId}`, { method: 'DELETE' });
      setState(result);
      setScores({ home: result.match.home_score ?? 0, away: result.match.away_score ?? 0, minute: result.match.live_minute ?? scores.minute });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  const saveEditGoal = async () => {
    if (!selectedId || !editGoalId) return;
    setError(null);
    try {
      const result = await api<LiveState>(`/admin/matches/${selectedId}/goals/${editGoalId}`, {
        method: 'PUT',
        body: JSON.stringify({
          team: editGoal.team,
          minute: editGoal.minute,
          player: editGoal.player,
          playerId: editGoal.playerId || undefined,
        }),
      });
      setState(result);
      setScores({ home: result.match.home_score ?? 0, away: result.match.away_score ?? 0, minute: result.match.live_minute ?? scores.minute });
      setEditGoalId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    }
  };

  const startEditGoal = (g: GoalEvent) => {
    const side = teamSide(g.team_id, m?.home_team_id, m?.away_team_id);
    setEditGoalId(g.id);
    setEditGoal({ team: side, minute: g.minute, player: g.player_name, playerId: '' });
  };

  const addEvent = async () => {
    if (!selectedId) return;
    setError(null);
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!selectedId) return;
    try {
      await api(`/admin/matches/${selectedId}/events/${eventId}`, { method: 'DELETE' });
      loadState(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const forceFullTime = async () => {
    if (!selectedId) return;
    try {
      await api(`/admin/matches/${selectedId}/force-result`, {
        method: 'POST',
        body: JSON.stringify({ homeScore: scores.home, awayScore: scores.away }),
      });
      loadMatches();
      loadState(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Force full-time failed');
    }
  };

  const changeStatus = async () => {
    if (!selectedId) return;
    try {
      await api(`/admin/matches/${selectedId}/status`, { method: 'PUT', body: JSON.stringify({ status: matchStatus }) });
      loadMatches();
      loadState(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed');
    }
  };

  const liveMatches = matches.filter((x) => x.status === 'live' || x.status === 'scheduled');

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['editor', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 rounded-xl text-xs font-bold min-h-[44px] touch-manipulation ${tab === t ? 'bg-primary-500 text-dark-900' : 'bg-dark-700 text-gray-400'}`}
          >
            {t === 'editor' ? '🎮 Live Editor' : '📜 Match History'}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <AdminCard title="Completed Matches">
          <AdminTable headers={['Match', 'Score', 'Finished', '']}>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-dark-700">
                <td className="py-3 pr-4 text-white text-sm">{h.home_team_name} vs {h.away_team_name}</td>
                <td className="pr-4 font-mono text-primary-500">{h.home_score}-{h.away_score}</td>
                <td className="pr-4 text-xs text-gray-400">{h.finished_at ? new Date(h.finished_at).toLocaleString() : '—'}</td>
                <td><ActionBtn onClick={() => { setSelectedId(h.id); setTab('editor'); }}>View</ActionBtn></td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}

      {tab === 'editor' && (
        <>
          <AdminCard title="Select Live Match">
            <Field label={`Live / Scheduled Matches (${liveMatches.length})`}>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input-field min-h-[44px]">
                <option value="">Choose match…</option>
                {liveMatches.map((x) => (
                  <option key={x.id} value={x.id}>
                    [{x.status}{x.is_paused ? ' PAUSED' : ''}] {x.home_team_name} vs {x.away_team_name} ({x.home_score}-{x.away_score})
                  </option>
                ))}
              </select>
            </Field>
            {selectedId && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => matchAction('start')} className="btn-primary text-xs py-3 min-h-[44px] touch-manipulation">▶ Start</button>
                <button
                  onClick={() => api(`/admin/matches/${selectedId}/pause`, { method: 'PUT', body: JSON.stringify({ paused: !m?.is_paused }) }).then(() => { loadMatches(); loadState(selectedId); }).catch((e) => setError(String(e)))}
                  className="btn-secondary text-xs py-3 min-h-[44px] touch-manipulation"
                >
                  {m?.is_paused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={() => matchAction('end')} className="btn-secondary text-xs py-3 min-h-[44px] touch-manipulation">⏹ End</button>
                <button onClick={forceFullTime} className="btn-secondary text-xs py-3 min-h-[44px] touch-manipulation">🏁 Force FT</button>
                <button onClick={() => matchAction('restart', 'PUT')} className="btn-secondary text-xs py-3 min-h-[44px] touch-manipulation">🔄 Restart</button>
              </div>
            )}
            {m && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="badge-live-neon text-[10px]">LIVE CONTROL</span>
                <span className="text-gray-300">{m.home_team_name} vs {m.away_team_name}</span>
                <span className="text-primary-500 font-mono font-bold">{scores.home} - {scores.away}</span>
                <span className="text-gray-500">{scores.minute}&apos;</span>
                <span className="text-xs text-gray-500">({homePlayers.length} home / {awayPlayers.length} away players)</span>
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <select value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)} className="input-field text-xs min-h-[44px] flex-1">
                    {['scheduled', 'live', 'finished', 'voided'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={changeStatus} className="btn-secondary text-xs min-h-[44px] px-4 touch-manipulation">Set Status</button>
                </div>
              </div>
            )}
          </AdminCard>

          {selectedId && m && (
            <>
              <AdminCard title="Scoreboard">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label={`${m.home_team_name} Goals`}>
                    <input type="number" min={0} value={scores.home} onChange={(e) => setScores({ ...scores, home: parseInt(e.target.value) || 0 })} className="input-field text-center text-lg font-black min-h-[44px]" />
                  </Field>
                  <Field label={`${m.away_team_name} Goals`}>
                    <input type="number" min={0} value={scores.away} onChange={(e) => setScores({ ...scores, away: parseInt(e.target.value) || 0 })} className="input-field text-center text-lg font-black min-h-[44px]" />
                  </Field>
                  <Field label="Minute">
                    <input type="number" min={0} max={90} value={scores.minute} onChange={(e) => setScores({ ...scores, minute: parseInt(e.target.value) || 0 })} className="input-field text-center font-mono min-h-[44px]" />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={saveLive} disabled={saving} className="btn-primary w-full min-h-[44px] touch-manipulation">
                      {saving ? 'Saving…' : 'Apply & Broadcast'}
                    </button>
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="Add Goal">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <Field label="Scoring Team">
                    <select
                      value={newGoal.team}
                      onChange={(e) => onTeamChange(e.target.value as 'home' | 'away')}
                      className="input-field min-h-[44px]"
                    >
                      <option value="home">{m.home_team_name} (Home)</option>
                      <option value="away">{m.away_team_name} (Away)</option>
                    </select>
                  </Field>
                  <Field label="Minute">
                    <input type="number" min={1} max={90} value={newGoal.minute} onChange={(e) => setNewGoal({ ...newGoal, minute: parseInt(e.target.value) || 1 })} className="input-field min-h-[44px]" />
                  </Field>
                  <Field label={`Goal Scorer — ${newGoal.team === 'home' ? m.home_team_name : m.away_team_name}`}>
                    <select
                      value={newGoal.playerId}
                      onChange={(e) => {
                        const p = teamPlayers.find((x) => String(x.id) === e.target.value);
                        setNewGoal({ ...newGoal, playerId: e.target.value, player: p?.name || '' });
                      }}
                      className="input-field min-h-[44px]"
                    >
                      {teamPlayers.length === 0 ? (
                        <option value="">No players found for this team</option>
                      ) : (
                        <>
                          <option value="">Select scorer…</option>
                          {teamPlayers.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.position || 'MID'})</option>
                          ))}
                        </>
                      )}
                    </select>
                    {teamPlayers.length === 0 && (
                      <p className="text-xs text-amber-400 mt-1">No players found — squad will auto-generate on reload.</p>
                    )}
                  </Field>
                  <div className="flex items-end">
                    <button
                      onClick={addGoal}
                      disabled={goalLoading || teamPlayers.length === 0}
                      className="btn-primary w-full min-h-[44px] touch-manipulation disabled:opacity-50"
                    >
                      {goalLoading ? 'Adding…' : '+ Add Goal'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-dark-600 pt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Goal Events ({state?.goals?.length ?? 0})</h4>
                  <div className="space-y-2">
                    {(state?.goals || []).map((g) => (
                      <div key={g.id} className="bg-dark-700/50 rounded-lg px-3 py-2 text-sm">
                        {editGoalId === g.id ? (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <select value={editGoal.team} onChange={(e) => setEditGoal({ ...editGoal, team: e.target.value as 'home' | 'away' })} className="input-field min-h-[44px]">
                              <option value="home">{m.home_team_name}</option>
                              <option value="away">{m.away_team_name}</option>
                            </select>
                            <input type="number" min={1} max={90} value={editGoal.minute} onChange={(e) => setEditGoal({ ...editGoal, minute: parseInt(e.target.value) || 1 })} className="input-field min-h-[44px]" />
                            <select
                              value={editGoal.playerId || editGoal.player}
                              onChange={(e) => {
                                const list = scorersForTeam(editGoal.team);
                                const p = list.find((x) => String(x.id) === e.target.value);
                                setEditGoal({ ...editGoal, playerId: p?.id || '', player: p?.name || e.target.value });
                              }}
                              className="input-field min-h-[44px]"
                            >
                              <option value={editGoal.player}>{editGoal.player}</option>
                              {scorersForTeam(editGoal.team).map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button onClick={saveEditGoal} className="btn-primary flex-1 min-h-[44px] text-xs">Save</button>
                              <button onClick={() => setEditGoalId(null)} className="btn-secondary flex-1 min-h-[44px] text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white">
                              <span className="text-primary-500 font-mono">{g.minute}&apos;</span>{' '}
                              ⚽ {g.player_name}
                              <span className="text-gray-500 text-xs ml-2">({g.team_name || (teamSide(g.team_id, m.home_team_id, m.away_team_id) === 'home' ? m.home_team_name : m.away_team_name)})</span>
                            </span>
                            <div className="shrink-0">
                              <ActionBtn onClick={() => startEditGoal(g)}>Edit</ActionBtn>
                              <ActionBtn variant="danger" onClick={() => deleteGoal(g.id)}>Delete</ActionBtn>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {!state?.goals?.length && <p className="text-gray-500 text-xs">No goals yet — add one above.</p>}
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="Match Statistics">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {STAT_FIELDS.map(({ key, label }) => (
                    <Field key={key} label={label}>
                      <input type="number" min={0} value={stats[key] ?? 0} onChange={(e) => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })} className="input-field text-sm min-h-[44px]" />
                    </Field>
                  ))}
                </div>
              </AdminCard>

              <AdminCard title="Commentary">
                <textarea value={commentary} onChange={(e) => setCommentary(e.target.value)} rows={3} className="input-field w-full resize-y text-sm min-h-[44px]" placeholder="Live commentary…" />
                <button onClick={saveLive} className="btn-secondary mt-2 text-xs min-h-[44px] touch-manipulation">Update Commentary</button>
              </AdminCard>

              <AdminCard title="Cards, Corners & Penalties">
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {(state?.events || []).filter((e) => e.event_type !== 'goal').map((e) => (
                    <div key={e.id} className="flex justify-between items-center bg-dark-700/50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-300"><span className="text-primary-500 font-mono">{e.minute}&apos;</span> {e.event_type.replace(/_/g, ' ')} {e.player_name || ''}</span>
                      <ActionBtn variant="danger" onClick={() => deleteEvent(e.id)}>Delete</ActionBtn>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-dark-600 pt-4">
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
                  {newEvent.type === 'penalty' && (
                    <Field label="Scorer">
                      <select
                        value={newEvent.playerId}
                        onChange={(e) => {
                          const p = scorersForTeam(newEvent.team as 'home' | 'away').find((x) => String(x.id) === e.target.value);
                          setNewEvent({ ...newEvent, playerId: e.target.value, player: p?.name || '' });
                        }}
                        className="input-field min-h-[44px]"
                      >
                        <option value="">Select…</option>
                        {scorersForTeam(newEvent.team as 'home' | 'away').map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <div className="flex items-end">
                    <button onClick={addEvent} className="btn-primary w-full min-h-[44px] touch-manipulation">+ Add Event</button>
                  </div>
                </div>
              </AdminCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
