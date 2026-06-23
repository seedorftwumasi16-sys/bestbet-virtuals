'use client';

import { useEffect, useState } from 'react';
import { api, getApiBaseUrl, getConfiguredApiUrl } from '@/lib/api';
import { AdminCard, AdminTable, ActionBtn, Field } from '../shared';

interface Team {
  id: string;
  name: string;
  short_name: string;
  strength: number;
  star_rating?: number;
  attack_rating?: number;
  midfield_rating?: number;
  defense_rating?: number;
  color_primary?: string;
  color_secondary?: string;
  league?: string;
  is_active: boolean;
  logo_url?: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  shirt_number: number;
  star_rating: number;
  is_striker: boolean;
}

function stars(n = 3) {
  return '★'.repeat(Math.min(5, Math.max(1, n))) + '☆'.repeat(5 - Math.min(5, Math.max(1, n)));
}

export default function TeamsSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: '',
    shortName: '',
    strength: 50,
    starRating: 3,
    attackRating: 50,
    midfieldRating: 50,
    defenseRating: 50,
    colorPrimary: '#00E676',
    colorSecondary: '#FFD700',
    league: 'Premier League',
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', position: 'MID', shirtNumber: 1, starRating: 3 });

  const load = () => api<Team[]>('/admin/teams').then(setTeams).catch(console.error);

  useEffect(() => { load(); }, []);

  const loadPlayers = async (teamId: string) => {
    const rows = await api<Player[]>(`/admin/teams/${teamId}/players`);
    setPlayers(rows);
  };

  const create = async () => {
    await api('/admin/teams', { method: 'POST', body: JSON.stringify(newTeam) });
    setNewTeam({ name: '', shortName: '' });
    load();
  };

  const saveDetails = async (id: string) => {
    await api(`/admin/teams/${id}/details`, { method: 'PUT', body: JSON.stringify(edit) });
    setEditId(null);
    load();
  };

  const uploadLogo = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    const token = localStorage.getItem('token');
    await fetch(`${getApiBaseUrl() || getConfiguredApiUrl()}/api/admin/teams/${id}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    load();
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete team?')) return;
    await api(`/admin/teams/${id}`, { method: 'DELETE' });
    load();
  };

  const addPlayer = async (teamId: string) => {
    await api(`/admin/teams/${teamId}/players`, { method: 'POST', body: JSON.stringify(newPlayer) });
    setNewPlayer({ name: '', position: 'MID', shirtNumber: players.length + 1, starRating: 3 });
    loadPlayers(teamId);
  };

  return (
    <div className="space-y-4">
      <AdminCard title="Create Team">
        <div className="flex gap-3 flex-wrap">
          <input placeholder="Team name" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} className="input-field flex-1" />
          <input placeholder="Short (3)" value={newTeam.shortName} onChange={(e) => setNewTeam({ ...newTeam, shortName: e.target.value })} className="input-field w-24" />
          <button onClick={create} className="btn-primary">Add Team</button>
        </div>
      </AdminCard>

      <AdminCard title="Team Management (30 European Clubs)">
        <AdminTable headers={['Team', 'Short', 'Stars', 'ATK/MID/DEF', 'League', 'Actions']}>
          {teams.map((t) => (
            <tr key={t.id} className="border-b border-dark-700">
              <td className="py-3 pr-4 font-medium text-white">{t.name}</td>
              <td className="pr-4">{t.short_name}</td>
              <td className="pr-4 text-accent-500 text-xs">{stars(t.star_rating || 3)}</td>
              <td className="pr-4 text-xs text-gray-400">
                {t.attack_rating ?? t.strength}/{t.midfield_rating ?? t.strength}/{t.defense_rating ?? t.strength}
              </td>
              <td className="pr-4 text-gray-400 text-xs">{t.league}</td>
              <td>
                <ActionBtn onClick={() => {
                  setEditId(t.id);
                  setEdit({
                    name: t.name,
                    shortName: t.short_name,
                    strength: t.strength,
                    starRating: t.star_rating || 3,
                    attackRating: t.attack_rating || t.strength,
                    midfieldRating: t.midfield_rating || t.strength,
                    defenseRating: t.defense_rating || t.strength,
                    colorPrimary: t.color_primary || '#00E676',
                    colorSecondary: t.color_secondary || '#FFD700',
                    league: t.league || 'Premier League',
                  });
                  loadPlayers(t.id);
                }}>Edit</ActionBtn>
                <label className="text-xs text-primary-500 cursor-pointer mr-2">
                  Logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(t.id, e.target.files[0])} />
                </label>
                <ActionBtn variant="danger" onClick={() => deleteTeam(t.id)}>Delete</ActionBtn>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>

      {editId && (
        <AdminCard title="Edit Team & Squad">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Name">
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input-field" />
            </Field>
            <Field label="Short">
              <input value={edit.shortName} onChange={(e) => setEdit({ ...edit, shortName: e.target.value })} className="input-field" />
            </Field>
            <Field label="Strength (1-100)">
              <input type="number" value={edit.strength} onChange={(e) => setEdit({ ...edit, strength: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="Star Rating (1-5)">
              <input type="number" min={1} max={5} value={edit.starRating} onChange={(e) => setEdit({ ...edit, starRating: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="Attack">
              <input type="number" value={edit.attackRating} onChange={(e) => setEdit({ ...edit, attackRating: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="Midfield">
              <input type="number" value={edit.midfieldRating} onChange={(e) => setEdit({ ...edit, midfieldRating: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="Defense">
              <input type="number" value={edit.defenseRating} onChange={(e) => setEdit({ ...edit, defenseRating: parseInt(e.target.value) })} className="input-field" />
            </Field>
            <Field label="League">
              <input value={edit.league} onChange={(e) => setEdit({ ...edit, league: e.target.value })} className="input-field" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => saveDetails(editId)} className="btn-primary">Save Team</button>
            <button onClick={() => setEditId(null)} className="btn-secondary">Cancel</button>
          </div>

          <div className="mt-6 border-t border-dark-600 pt-4">
            <h4 className="text-sm font-bold text-white mb-3">Squad ({players.length} players)</h4>
            <div className="flex gap-2 flex-wrap mb-3">
              <input placeholder="Player name" value={newPlayer.name} onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })} className="input-field flex-1 min-w-[120px]" />
              <input placeholder="Pos" value={newPlayer.position} onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })} className="input-field w-16" />
              <button onClick={() => addPlayer(editId)} className="btn-secondary">Add Player</button>
            </div>
            <div className="max-h-48 overflow-y-auto text-xs space-y-1">
              {players.map((p) => (
                <div key={p.id} className="flex justify-between text-gray-300 border-b border-dark-700 py-1">
                  <span>#{p.shirt_number} {p.name} ({p.position})</span>
                  <span className="text-accent-500">{stars(p.star_rating)}</span>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
