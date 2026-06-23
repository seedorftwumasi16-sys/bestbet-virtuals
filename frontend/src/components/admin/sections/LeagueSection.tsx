'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable, Field } from '../shared';

export default function LeagueSection() {
  const [leagues, setLeagues] = useState<Array<Record<string, unknown>>>([]);
  const [seasons, setSeasons] = useState<Array<Record<string, unknown>>>([]);
  const [tournaments, setTournaments] = useState<Array<Record<string, unknown>>>([]);
  const [table, setTable] = useState<Array<Record<string, unknown>>>([]);
  const [leagueForm, setLeagueForm] = useState({ name: '', code: '' });
  const [seasonForm, setSeasonForm] = useState({ name: '', leagueId: '' });
  const [tournamentForm, setTournamentForm] = useState({ name: '', leagueId: '', seasonId: '' });

  const load = () => {
    api<Array<Record<string, unknown>>>('/admin/leagues').then(setLeagues).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/seasons').then(setSeasons).catch(console.error);
    api<Array<Record<string, unknown>>>('/admin/tournaments').then(setTournaments).catch(console.error);
    api<Array<Record<string, unknown>>>('/matches/league-table').then(setTable).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const createLeague = async () => {
    await api('/admin/leagues', { method: 'POST', body: JSON.stringify(leagueForm) });
    setLeagueForm({ name: '', code: '' });
    load();
  };

  const createSeason = async () => {
    await api('/admin/seasons', { method: 'POST', body: JSON.stringify(seasonForm) });
    setSeasonForm({ name: '', leagueId: '' });
    load();
  };

  const createTournament = async () => {
    await api('/admin/tournaments', { method: 'POST', body: JSON.stringify(tournamentForm) });
    setTournamentForm({ name: '', leagueId: '', seasonId: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminCard title="Create League">
          <div className="space-y-2">
            <input placeholder="League name" value={leagueForm.name} onChange={(e) => setLeagueForm({ ...leagueForm, name: e.target.value })} className="input-field" />
            <input placeholder="Code" value={leagueForm.code} onChange={(e) => setLeagueForm({ ...leagueForm, code: e.target.value })} className="input-field" />
            <button onClick={createLeague} className="btn-primary w-full">Create League</button>
          </div>
        </AdminCard>
        <AdminCard title="Create Season">
          <div className="space-y-2">
            <input placeholder="Season name" value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} className="input-field" />
            <select value={seasonForm.leagueId} onChange={(e) => setSeasonForm({ ...seasonForm, leagueId: e.target.value })} className="input-field">
              <option value="">League</option>
              {leagues.map((l) => <option key={String(l.id)} value={String(l.id)}>{String(l.name)}</option>)}
            </select>
            <button onClick={createSeason} className="btn-primary w-full">Create Season</button>
          </div>
        </AdminCard>
        <AdminCard title="Create Tournament">
          <div className="space-y-2">
            <input placeholder="Tournament name" value={tournamentForm.name} onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })} className="input-field" />
            <select value={tournamentForm.leagueId} onChange={(e) => setTournamentForm({ ...tournamentForm, leagueId: e.target.value })} className="input-field">
              <option value="">League</option>
              {leagues.map((l) => <option key={String(l.id)} value={String(l.id)}>{String(l.name)}</option>)}
            </select>
            <button onClick={createTournament} className="btn-primary w-full">Create Tournament</button>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="League Standings">
        <AdminTable headers={['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'Pts']}>
          {table.map((row, i) => (
            <tr key={String(row.team_id || i)} className="border-b border-dark-700">
              <td className="py-2 pr-3">{String(row.position)}</td>
              <td className="pr-3 font-medium text-white">{String(row.name)}</td>
              <td className="pr-3">{String(row.played)}</td>
              <td className="pr-3">{String(row.won)}</td>
              <td className="pr-3">{String(row.drawn)}</td>
              <td className="pr-3">{String(row.lost)}</td>
              <td className="pr-3">{String(row.goals_for)}</td>
              <td className="pr-3">{String(row.goals_against)}</td>
              <td className="text-primary-500 font-bold">{String(row.points)}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard title="Seasons">
          <div className="space-y-2 text-sm">
            {seasons.map((s) => (
              <div key={String(s.id)} className="flex justify-between border-b border-dark-700 py-2">
                <span className="text-white">{String(s.name)}</span>
                <span className="text-gray-500">{String(s.league_name || '')}</span>
              </div>
            ))}
          </div>
        </AdminCard>
        <AdminCard title="Tournaments">
          <div className="space-y-2 text-sm">
            {tournaments.map((t) => (
              <div key={String(t.id)} className="flex justify-between border-b border-dark-700 py-2">
                <span className="text-white">{String(t.name)}</span>
                <span className="text-gray-500">{String(t.league_name || '')}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
