'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminCard, AdminTable, Field, ActionBtn } from '../shared';

interface TableRow {
  team_id: string;
  name: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface Scorer {
  id: string;
  name: string;
  team_name: string;
  goals_season: number;
  star_rating: number;
}

export default function LeagueSection() {
  const [leagues, setLeagues] = useState<Array<Record<string, unknown>>>([]);
  const [table, setTable] = useState<TableRow[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TableRow>>({});

  const load = () => {
    api<Array<Record<string, unknown>>>('/admin/leagues').then(setLeagues).catch(console.error);
    api<TableRow[]>('/matches/league-table').then(setTable).catch(console.error);
    api<Scorer[]>('/admin/top-scorers').then(setScorers).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const saveStandings = async () => {
    await api('/admin/league-table', {
      method: 'PUT',
      body: JSON.stringify({
        entries: table.map((r) => ({
          teamId: r.team_id,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goals_for,
          goalsAgainst: r.goals_against,
          points: r.points,
          position: r.position,
        })),
      }),
    });
    setEditRow(null);
    load();
  };

  const updateScorer = async (id: string, goalsSeason: number) => {
    await api(`/admin/players/${id}`, { method: 'PUT', body: JSON.stringify({ goalsSeason }) });
    load();
  };

  return (
    <div className="space-y-4">
      <AdminCard title="League Standings (Admin Override)">
        <p className="text-xs text-gray-500 mb-3">Edit values and save — updates broadcast instantly via WebSocket.</p>
        <div className="overflow-x-auto -mx-2">
          <AdminTable headers={['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'Pts', '']}>
            {table.map((row) => (
              <tr key={row.team_id} className="border-b border-dark-700">
                {editRow === row.team_id ? (
                  <>
                    <td className="py-2 pr-2"><input type="number" value={editData.position ?? row.position} onChange={(e) => setEditData({ ...editData, position: parseInt(e.target.value) })} className="input-field w-12 min-h-[44px]" /></td>
                    <td className="pr-2 text-white text-sm">{row.name}</td>
                    {(['played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against', 'points'] as const).map((k) => (
                      <td key={k} className="pr-2"><input type="number" value={editData[k] ?? row[k]} onChange={(e) => setEditData({ ...editData, [k]: parseInt(e.target.value) || 0 })} className="input-field w-12 min-h-[44px]" /></td>
                    ))}
                    <td><ActionBtn variant="success" onClick={() => { setTable(table.map((r) => r.team_id === row.team_id ? { ...r, ...editData } as TableRow : r)); saveStandings(); }}>Save</ActionBtn></td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-3">{row.position}</td>
                    <td className="pr-3 font-medium text-white text-sm">{row.name}</td>
                    <td className="pr-3">{row.played}</td>
                    <td className="pr-3">{row.won}</td>
                    <td className="pr-3">{row.drawn}</td>
                    <td className="pr-3">{row.lost}</td>
                    <td className="pr-3">{row.goals_for}</td>
                    <td className="pr-3">{row.goals_against}</td>
                    <td className="text-primary-500 font-bold pr-3">{row.points}</td>
                    <td><ActionBtn onClick={() => { setEditRow(row.team_id); setEditData(row); }}>Edit</ActionBtn></td>
                  </>
                )}
              </tr>
            ))}
          </AdminTable>
        </div>
        <button onClick={saveStandings} className="btn-primary mt-4 min-h-[44px] w-full sm:w-auto">Save All Standings</button>
      </AdminCard>

      <AdminCard title="Top Scorers (Admin Override)">
        <div className="space-y-2">
          {scorers.slice(0, 20).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 justify-between bg-dark-700/40 rounded-lg px-3 py-2 text-sm">
              <span className="text-white">{s.name} <span className="text-gray-500">({s.team_name})</span></span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  defaultValue={s.goals_season}
                  className="input-field w-16 min-h-[44px]"
                  onBlur={(e) => updateScorer(s.id, parseInt(e.target.value) || 0)}
                />
                <span className="text-gray-500 text-xs">goals</span>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Leagues">
        <div className="space-y-2 text-sm">
          {leagues.map((l) => (
            <div key={String(l.id)} className="text-white border-b border-dark-700 py-2">{String(l.name)}</div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
